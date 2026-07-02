import * as XLSX from 'xlsx'
import { format, parseISO } from 'date-fns'
import { t, dateFnsLocale } from '../i18n'
import type { Project, WorkEntry, MaterialEntry } from '../db/dexie'

function weekday(date: string): string {
  try {
    return format(parseISO(date), 'EEEE', { locale: dateFnsLocale() })
  } catch {
    return ''
  }
}

// Excel povolené názvy listů: max 31 znaků, bez [ ] : * ? / \
function sheetName(name: string): string {
  return (name || 'Export').replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Export'
}

function safeFile(name: string): string {
  return (name || 'zakazka').replace(/[<>:"/\\|?*]/g, '_').slice(0, 80)
}

/**
 * Export zakázky do Excelu — jeden list, dny + pracovníci, seřazeno podle data.
 */
export function exportJobToExcel(opts: {
  project: Project
  workEntries: WorkEntry[]
  materialEntries: MaterialEntry[]
  collabName: (id: string) => string
  workTypeName: (id: string) => string
}) {
  const { project, workEntries, materialEntries, collabName, workTypeName } = opts

  const entries = workEntries
    .filter((e) => !e.deletedAt)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''))

  const rows: (string | number)[][] = []
  rows.push([project.name])
  if (project.address) rows.push([project.address])
  rows.push([])
  rows.push([
    t('export.colDate'),
    t('export.colDay'),
    t('export.colFrom'),
    t('export.colTo'),
    t('export.colHours'),
    t('export.colWorker'),
    t('export.colWorkType'),
    t('export.colPaid'),
    t('export.colNote'),
  ])

  let totalHours = 0
  for (const e of entries) {
    totalHours += e.hours
    rows.push([
      e.date,
      weekday(e.date),
      e.startTime || '',
      e.endTime || '',
      e.hours,
      e.collaboratorId ? collabName(e.collaboratorId) : '',
      e.workTypeId ? workTypeName(e.workTypeId) : '',
      e.isPaid ? t('export.yes') : t('export.no'),
      e.notes || '',
    ])
  }
  rows.push([])
  rows.push(['', '', '', t('export.total'), Math.round(totalHours * 100) / 100])

  // Materiál (pokud existuje) — pod hodinami
  const mats = materialEntries
    .filter((m) => !m.deletedAt)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (mats.length) {
    rows.push([])
    rows.push([t('detail.tabMaterial')])
    rows.push([
      t('export.colDate'),
      t('material.description'),
      t('export.colAmount'),
      t('material.paidBy'),
      t('export.colPaid'),
      t('export.colNote'),
    ])
    let totalMaterial = 0
    for (const m of mats) {
      totalMaterial += m.amount
      rows.push([
        m.date,
        m.description,
        m.amount,
        m.paidById ? collabName(m.paidById) : '',
        m.isPaid ? t('export.yes') : t('export.no'),
        m.notes || '',
      ])
    }
    rows.push(['', t('export.total'), Math.round(totalMaterial * 100) / 100])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 7 }, { wch: 7 }, { wch: 8 },
    { wch: 18 }, { wch: 16 }, { wch: 11 }, { wch: 42 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName(project.name))
  XLSX.writeFile(wb, `${safeFile(project.name)}.xlsx`)
}
