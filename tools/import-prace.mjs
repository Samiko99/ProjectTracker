// Import naparsovaných dat na server (přes /api/sync) pod účet uživatele.
// Režimy:
//   node tools/import-prace.mjs            → náhled (vytvoří payload, nic nenahraje)
//   node tools/import-prace.mjs --upload   → přihlásí se (login.txt) a nahraje
//
// Pravidla pro datumy (dle uživatele):
//   - "Nová ves": poslední den = letošní rok (2026), zpětně přes přelom roku
//   - ostatní zakázky: loňský rok (2025)
//   - dny bez data: náhodné datum (jsou zaplacené, uživatel opraví)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const DIR = 'U:/Apka denik/StavebniDenik'
const API = 'http://192.168.100.150:9009/api'
const THIS_YEAR = 2026
const LAST_YEAR = 2025

const jobs = JSON.parse(readFileSync(`${DIR}/tools/prace-parsed.json`, 'utf8'))

const COLORS = ['#E65100', '#1565C0', '#2E7D32', '#6A1B9A', '#00838F', '#C62828', '#37474F', '#F57F17', '#AD1457', '#0277BD']
const now = new Date().toISOString()
const adamId = randomUUID()

function daysInMonth(y, m) { return new Date(y, m, 0).getDate() }
function clampDay(y, m, d) { return Math.min(Math.max(d, 1), daysInMonth(y, m)) }
function iso(y, m, d) { return `${y}-${String(m).padStart(2, '0')}-${String(clampDay(y, m, d)).padStart(2, '0')}` }
const TODAY = new Date()
function randomDate(year) {
  let m = 1 + Math.floor(Math.random() * 12)
  let d = 1 + Math.floor(Math.random() * daysInMonth(year, m))
  // nikdy v budoucnu
  if (year === THIS_YEAR && new Date(year, m - 1, d) > TODAY) {
    m = 1 + Math.floor(Math.random() * (TODAY.getMonth() + 1))
    d = 1 + Math.floor(Math.random() * daysInMonth(year, m))
  }
  return iso(year, m, d)
}

// Přiřazení roku pro Nová ves: zezadu (nejnovější) od THIS_YEAR, při skoku měsíce nahoru -1
function assignNovaVes(days) {
  let year = THIS_YEAR
  let prevMonth = null
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i]
    if (d.date) {
      if (prevMonth !== null && d.date.month > prevMonth) year--
      d._year = year
      prevMonth = d.date.month
    }
  }
  // dateless dny zdědí rok nejbližšího datovaného souseda (jinak LAST_YEAR)
  let lastYear = LAST_YEAR
  for (let i = 0; i < days.length; i++) {
    if (days[i]._year) lastYear = days[i]._year
    else days[i]._year = lastYear
  }
}

const projects = []
const workEntries = []
let colorIdx = 0

for (const job of jobs) {
  const projectId = randomUUID()
  projects.push({
    id: projectId,
    name: job.name,
    address: '',
    notes: '',
    color: COLORS[colorIdx++ % COLORS.length],
    createdAt: now,
    updatedAt: now,
    ...(job.closed ? { closedAt: now } : {}),
  })

  const isNovaVes = /Nová ves/i.test(job.name)
  if (isNovaVes) assignNovaVes(job.days)

  for (const d of job.days) {
    let dateStr
    if (d.date) {
      const year = isNovaVes ? (d._year || LAST_YEAR) : LAST_YEAR
      dateStr = iso(year, d.date.month, d.date.day)
    } else {
      const year = isNovaVes ? (d._year || LAST_YEAR) : LAST_YEAR
      dateStr = randomDate(year)
    }
    workEntries.push({
      id: randomUUID(),
      projectId,
      collaboratorId: d.adam ? adamId : '',
      workTypeId: '',
      date: dateStr,
      startTime: d.startTime || undefined,
      endTime: d.endTime || undefined,
      hours: d.hours,
      notes: d.note || '',
      isPaid: !!d.paid,
      createdAt: now,
      updatedAt: now,
    })
  }
}

const collaborators = [{ id: adamId, name: 'Adam', createdAt: now, updatedAt: now }]
const payload = {
  lastSyncAt: null,
  changes: { projects, workTypes: [], collaborators, workEntries, materialEntries: [] },
}

writeFileSync(`${DIR}/tools/import-payload.json`, JSON.stringify(payload, null, 2), 'utf8')

console.log('=== NÁHLED IMPORTU ===')
console.log('Zakázek:', projects.length, '(uzavřených:', projects.filter(p => p.closedAt).length, ')')
console.log('Záznamů hodin:', workEntries.length)
console.log('Spolupracovník: Adam (' + workEntries.filter(e => e.collaboratorId === adamId).length + ' záznamů)')
console.log('Hodin celkem:', Math.round(workEntries.reduce((s, e) => s + e.hours, 0) * 10) / 10)
console.log('Datumy: nejstarší', workEntries.map(e => e.date).sort()[0], '| nejnovější', workEntries.map(e => e.date).sort().slice(-1)[0])
console.log('')
console.log('Nová ves — rozsah datumů (má sedět 2025→2026):')
const nv = workEntries.filter(e => projects.find(p => p.id === e.projectId)?.name.includes('Nová ves'))
console.log('  ', nv.map(e => e.date).sort()[0], '→', nv.map(e => e.date).sort().slice(-1)[0])

if (process.argv.includes('--upload')) {
  const loginPath = `${DIR}/login.txt`
  if (!existsSync(loginPath)) { console.error('\n❌ Chybí login.txt s přihlašovacími údaji.'); process.exit(1) }
  const lt = readFileSync(loginPath, 'utf8')
  const email = (lt.match(/email\s*[:=]\s*(.+)/i)?.[1] || lt.split(/\r?\n/)[0]).trim()
  const password = (lt.match(/(?:heslo|password)\s*[:=]\s*(.+)/i)?.[1] || lt.split(/\r?\n/)[1]).trim()
  console.log('\n→ Přihlašuji jako', email, '...')
  const login = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  if (!login.ok) { console.error('❌ Přihlášení selhalo:', login.status, await login.text()); process.exit(1) }
  const { accessToken } = await login.json()
  console.log('→ Nahrávám data na server ...')
  const res = await fetch(`${API}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload) })
  if (!res.ok) { console.error('❌ Sync selhal:', res.status, await res.text()); process.exit(1) }
  const out = await res.json()
  console.log('✅ Hotovo. Server vrátil zakázek:', out.changes.projects.length, ', hodin:', out.changes.workEntries.length)
}
