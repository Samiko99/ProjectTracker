import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db/dexie'
import { useAuthStore } from './auth'
import { useStavbyStore } from './stavby'
import { useNastaveniStore } from './nastaveni'
import { useZaznamyStore } from './zaznamy'

const LS_LAST_SYNC = 'sync.lastSyncAt'

// Tabulky, které synchronizujeme (pořadí: nadřazené před závislými)
const TABLES = [
  'projects',
  'workTypes',
  'collaborators',
  'workEntries',
  'materialEntries',
] as const

type TableName = (typeof TABLES)[number]

interface SyncResponse {
  serverTime: string
  changes: Record<TableName, Record<string, unknown>[]>
}

// Dexie tabulka podle názvu
function table(name: TableName) {
  return db[name as keyof typeof db] as unknown as {
    filter: (fn: (r: Record<string, unknown>) => boolean) => {
      toArray: () => Promise<Record<string, unknown>[]>
    }
    toArray: () => Promise<Record<string, unknown>[]>
    bulkPut: (records: Record<string, unknown>[]) => Promise<unknown>
    clear: () => Promise<void>
  }
}

// Očistí záznam ze serveru pro uložení do Dexie (odstraní userId, null → undefined)
function cleanRecord(rec: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...rec }
  delete out.userId
  for (const key of ['deletedAt', 'startTime', 'endTime', 'closedAt']) {
    if (out[key] === null) delete out[key]
  }
  return out
}

export const useSyncStore = defineStore('sync', () => {
  const lastSyncAt = ref<string | null>(localStorage.getItem(LS_LAST_SYNC))
  const syncing = ref(false)
  const lastError = ref<string | null>(null)

  function setLastSync(iso: string | null) {
    lastSyncAt.value = iso
    if (iso) localStorage.setItem(LS_LAST_SYNC, iso)
    else localStorage.removeItem(LS_LAST_SYNC)
  }

  // Posbírá lokální změny od posledního syncu
  async function collectLocalChanges() {
    const since = lastSyncAt.value
    const changes: Record<string, Record<string, unknown>[]> = {}
    for (const name of TABLES) {
      const rows = since
        ? await table(name)
            .filter((r) => (r.updatedAt as string) > since)
            .toArray()
        : await table(name).toArray()
      changes[name] = rows
    }
    return changes
  }

  // Aplikuje změny ze serveru do Dexie
  async function applyRemoteChanges(
    changes: SyncResponse['changes'],
  ): Promise<number> {
    let count = 0
    for (const name of TABLES) {
      const rows = changes[name] ?? []
      if (rows.length) {
        await table(name).bulkPut(rows.map(cleanRecord))
        count += rows.length
      }
    }
    return count
  }

  async function reloadStores() {
    await Promise.all([
      useStavbyStore().loadProjects(),
      useNastaveniStore().loadSettings(),
      useZaznamyStore().loadAllEntries(),
    ])
  }

  /**
   * Provede plnou synchronizaci: push lokálních změn + pull serverových.
   */
  async function syncNow(): Promise<{ pushed: number; pulled: number }> {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) {
      throw new Error('Pro synchronizaci se musíš přihlásit')
    }
    if (syncing.value) return { pushed: 0, pulled: 0 }

    syncing.value = true
    lastError.value = null
    try {
      const localChanges = await collectLocalChanges()
      const pushed = Object.values(localChanges).reduce(
        (s, arr) => s + arr.length,
        0,
      )

      const res = await auth.authedFetch<SyncResponse>('/sync', {
        method: 'POST',
        body: { lastSyncAt: lastSyncAt.value, changes: localChanges },
      })

      const pulled = await applyRemoteChanges(res.changes)
      setLastSync(res.serverTime)

      if (pulled > 0) await reloadStores()

      return { pushed, pulled }
    } catch (e) {
      lastError.value = (e as Error).message
      throw e
    } finally {
      syncing.value = false
    }
  }

  // --- Zálohy ---

  async function createBackup() {
    const auth = useAuthStore()
    const snapshot: Record<string, Record<string, unknown>[]> = {}
    for (const name of TABLES) {
      snapshot[name] = await table(name).toArray()
    }
    return auth.authedFetch<{ id: string; createdAt: string }>('/backup', {
      method: 'POST',
      body: { data: snapshot },
    })
  }

  async function listBackups() {
    const auth = useAuthStore()
    const res = await auth.authedFetch<{
      backups: { id: string; createdAt: string }[]
    }>('/backup')
    return res.backups
  }

  async function restoreBackup(id: string) {
    const auth = useAuthStore()
    const res = await auth.authedFetch<{
      id: string
      createdAt: string
      data: Record<TableName, Record<string, unknown>[]>
    }>(`/backup/${id}`)

    // Nahraď lokální data snapshotem
    for (const name of TABLES) {
      await table(name).clear()
      const rows = res.data[name] ?? []
      if (rows.length) await table(name).bulkPut(rows.map(cleanRecord))
    }
    await reloadStores()
    return res
  }

  function resetSyncState() {
    setLastSync(null)
    lastError.value = null
  }

  return {
    lastSyncAt,
    syncing,
    lastError,
    syncNow,
    createBackup,
    listBackups,
    restoreBackup,
    resetSyncState,
  }
})
