// Parser Obsidian .md výpisu práce → struktura zakázek a dnů.
// Pravidla (dle uživatele):
//  - neodsazený "- [ ]/[x]" = ZAKÁZKA; [x] = uzavřená
//  - odsazený "- [ ]/[x]" = DEN v zakázce; [x] = zaplacený den
//  - (HH:MM - HH:MM) = čas od-do; "A" hned za ")" = spolupracovník Adam
//  - "N hod" bez času = ruční počet hodin
//  - zbytek = poznámka
import { readFileSync, writeFileSync } from 'node:fs'

const SRC = process.argv[2] || 'C:/Users/Honza/Downloads/Práce.md'
const raw = readFileSync(SRC, 'utf8')
const lines = raw.split(/\r?\n/)

const reJob = /^- \[([ xX])\]\s+(.*)$/
const reDay = /^[\t ]+- \[([ xX])\]\s+(.*)$/
const reTime = /\((\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\)/
const reManual = /(\d+(?:[.,]\d+)?)\s*hod/i
const reDate = /\b(\d{1,2})\.(\d{1,2})\.?/
const reWeekday = /^(Po|Út|Ut|St|Čt|Ct|Pá|Pa|So|Ne)\b/i

function calcHours(sh, sm, eh, em) {
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60 // přes půlnoc
  return Math.round((mins / 60) * 100) / 100
}

function parseDayText(text) {
  const d = { startTime: null, endTime: null, hours: 0, adam: false, date: null, note: '' }
  let rest = text

  const tm = text.match(reTime)
  if (tm) {
    d.startTime = `${tm[1].padStart(2, '0')}:${tm[2]}`
    d.endTime = `${tm[3].padStart(2, '0')}:${tm[4]}`
    d.hours = calcHours(+tm[1], +tm[2], +tm[3], +tm[4])
    // "A" hned za závorkou s časem
    const after = text.slice(tm.index + tm[0].length)
    if (/^\s*A/.test(after)) d.adam = true
    rest = (text.slice(0, tm.index) + ' ' + after.replace(/^\s*A/, '')).trim()
  } else {
    const mm = text.match(reManual)
    if (mm) d.hours = parseFloat(mm[1].replace(',', '.'))
    if (/\)A|\bA\b/.test(text)) d.adam = /\)A/.test(text)
  }

  const dm = rest.match(reDate)
  if (dm) d.date = { day: +dm[1], month: +dm[2] }

  // poznámka = text bez weekday, data, "A"
  let note = rest
    .replace(reWeekday, '')
    .replace(reDate, '')
    .replace(/^\s*A\b/, '')
    .replace(/\s+/g, ' ')
    .trim()
  d.note = note
  return d
}

function cleanJobName(text) {
  let name = text
    .replace(reTime, '')
    .replace(/\b\d{1,2}\.\d{1,2}\.?/g, '')
    .replace(/\)A\b/g, ')') // jen "A" hned za závorkou (Adam), ne písmena v názvu
    .trim()
  // odstraň koncový weekday token
  name = name.replace(/\s+(Po|Út|Ut|St|Čt|Ct|Pá|Pa|So|Ne)\s*$/i, '').trim()
  return name.replace(/\s+/g, ' ')
}

const jobs = []
let cur = null

for (const line of lines) {
  if (!line.trim()) continue
  const jm = line.match(reJob)
  if (jm) {
    cur = {
      name: cleanJobName(jm[2]),
      rawName: jm[2].trim(),
      closed: jm[1].toLowerCase() === 'x',
      inlineHasTime: reTime.test(jm[2]),
      inlineDay: jm[2],
      days: [],
    }
    jobs.push(cur)
    continue
  }
  const dm = line.match(reDay)
  if (dm && cur) {
    if (!dm[2].trim()) continue // přeskoč prázdné odškrtávací řádky
    const parsed = parseDayText(dm[2])
    parsed.paid = dm[1].toLowerCase() === 'x'
    parsed.raw = dm[2].trim()
    cur.days.push(parsed)
  }
}

// Zakázky bez dnů, ale s časem na řádku názvu → vytvoř jeden den
for (const j of jobs) {
  if (j.days.length === 0 && j.inlineHasTime) {
    const parsed = parseDayText(j.inlineDay)
    parsed.paid = j.closed
    parsed.raw = j.inlineDay
    j.days.push(parsed)
  }
}

// Souhrn
let totalDays = 0, totalHours = 0, paidHours = 0, adamDays = 0, datedDays = 0, noHourDays = 0
for (const j of jobs) {
  for (const d of j.days) {
    totalDays++
    totalHours += d.hours
    if (d.paid) paidHours += d.hours
    if (d.adam) adamDays++
    if (d.date) datedDays++
    if (d.hours === 0) noHourDays++
  }
}

writeFileSync('U:/Apka denik/StavebniDenik/tools/prace-parsed.json', JSON.stringify(jobs, null, 2), 'utf8')

console.log('=== SOUHRN ===')
console.log('Zakázek:', jobs.length, '| uzavřených:', jobs.filter(j => j.closed).length, '| otevřených:', jobs.filter(j => !j.closed).length)
console.log('Dnů celkem:', totalDays, '| s datem:', datedDays, '| bez hodin (jen pozn.):', noHourDays)
console.log('Hodin celkem:', Math.round(totalHours * 10) / 10, '| zaplacených:', Math.round(paidHours * 10) / 10)
console.log('Dnů s Adamem:', adamDays)
console.log('')
console.log('=== ZAKÁZKY ===')
for (const j of jobs) {
  const h = Math.round(j.days.reduce((s, d) => s + d.hours, 0) * 10) / 10
  console.log(`${j.closed ? '[uzavřená]' : '[otevřená]'} ${j.name}  — dnů: ${j.days.length}, hodin: ${h}`)
}
console.log('')
console.log('=== UKÁZKA naparsovaných dnů (Nová ves, prvních 6) ===')
const nv = jobs.find(j => j.name.includes('Nová ves'))
if (nv) for (const d of nv.days.slice(0, 6)) {
  console.log(JSON.stringify({ date: d.date, h: d.hours, time: d.startTime && `${d.startTime}-${d.endTime}`, adam: d.adam, paid: d.paid, note: d.note.slice(0, 50) }))
}
