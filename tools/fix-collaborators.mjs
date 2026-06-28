// Oprava spolupracovníků u importovaných záznamů:
//  - VŠECHNY importované záznamy → Honza (primární pracovník)
//  - kde byl Adam ("A") → navíc DUPLIKÁT záznamu pro Adama (stejný den/hodiny)
//
//   node tools/fix-collaborators.mjs            → náhled
//   node tools/fix-collaborators.mjs --upload   → přihlásí se (login.txt) a opraví
import { readFileSync, existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const DIR = 'U:/Apka denik/StavebniDenik'
const API = 'http://192.168.100.150:9009/api'

const payload = JSON.parse(readFileSync(`${DIR}/tools/import-payload.json`, 'utf8'))
const importedEntries = payload.changes.workEntries
const adamId = payload.changes.collaborators[0].id // importovaný Adam
const now = new Date().toISOString()

const withAdam = importedEntries.filter((e) => e.collaboratorId === adamId)
console.log('=== NÁHLED OPRAVY ===')
console.log('Importovaných záznamů (→ Honza):', importedEntries.length)
console.log('Z toho s "A" (→ navíc duplikát pro Adama):', withAdam.length)
console.log('Záznamů po opravě:', importedEntries.length + withAdam.length, '(Honza ' + importedEntries.length + ' + Adam ' + withAdam.length + ')')

if (!process.argv.includes('--upload')) {
  console.log('\n(náhled — nic nezměněno; spusť s --upload)')
  process.exit(0)
}

const loginPath = `${DIR}/login.txt`
if (!existsSync(loginPath)) { console.error('\n❌ Chybí login.txt'); process.exit(1) }
const lt = readFileSync(loginPath, 'utf8')
const email = (lt.match(/email\s*[:=]\s*(.+)/i)?.[1] || lt.split(/\r?\n/)[0]).trim()
const password = (lt.match(/(?:heslo|password)\s*[:=]\s*(.+)/i)?.[1] || lt.split(/\r?\n/)[1]).trim()

console.log('\n→ Přihlašuji jako', email, '...')
const login = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
if (!login.ok) { console.error('❌ Přihlášení selhalo:', login.status, await login.text()); process.exit(1) }
const { accessToken } = await login.json()
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }

// Najdi (nebo vytvoř) Honzu
const pull = await (await fetch(`${API}/sync`, { method: 'POST', headers: H, body: JSON.stringify({ lastSyncAt: null, changes: {} }) })).json()
let honza = pull.changes.collaborators.find((c) => c.name.trim().toLowerCase() === 'honza' && !c.deletedAt)
const newCollabs = []
let honzaId
if (honza) { honzaId = honza.id; console.log('→ Použiji existujícího Honzu', honzaId.slice(0, 8)) }
else { honzaId = randomUUID(); newCollabs.push({ id: honzaId, name: 'Honza', createdAt: now, updatedAt: now }); console.log('→ Vytvářím spolupracovníka Honza') }

// Update všech importovaných na Honzu + duplikáty pro Adama
const updated = importedEntries.map((e) => ({ ...e, collaboratorId: honzaId, updatedAt: now }))
const adamDupes = withAdam.map((e) => ({ ...e, id: randomUUID(), collaboratorId: adamId, createdAt: now, updatedAt: now }))

console.log('→ Posílám', updated.length, 'úprav +', adamDupes.length, 'nových (Adam) ...')
const res = await fetch(`${API}/sync`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ lastSyncAt: null, changes: { projects: [], workTypes: [], collaborators: newCollabs, workEntries: [...updated, ...adamDupes], materialEntries: [] } }),
})
if (!res.ok) { console.error('❌ Sync selhal:', res.status, await res.text()); process.exit(1) }
const out = await res.json()
const honzaCount = out.changes.workEntries.filter((e) => e.collaboratorId === honzaId).length
const adamCount = out.changes.workEntries.filter((e) => e.collaboratorId === adamId).length
console.log('✅ Hotovo. Na účtu nyní: Honza', honzaCount, 'záznamů | Adam', adamCount, 'záznamů')
