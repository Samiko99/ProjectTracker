import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, type WorkEntry, type MaterialEntry } from '../db/dexie'
import { uuid } from '../utils/uuid'

export const useZaznamyStore = defineStore('zaznamy', () => {
  const workEntries = ref<WorkEntry[]>([])
  const materialEntries = ref<MaterialEntry[]>([])
  const loading = ref(false)
  const currentProjectId = ref<string | null>(null)

  async function loadEntriesForProject(projectId: string) {
    loading.value = true
    currentProjectId.value = projectId
    try {
      workEntries.value = (
        await db.workEntries
          .where('projectId')
          .equals(projectId)
          .filter((e) => !e.deletedAt)
          .toArray()
      ).sort((a, b) => b.date.localeCompare(a.date))

      materialEntries.value = (
        await db.materialEntries
          .where('projectId')
          .equals(projectId)
          .filter((e) => !e.deletedAt)
          .toArray()
      ).sort((a, b) => b.date.localeCompare(a.date))
    } finally {
      loading.value = false
    }
  }

  async function loadAllEntries() {
    currentProjectId.value = null
    workEntries.value = (
      await db.workEntries.filter((e) => !e.deletedAt).toArray()
    ).sort((a, b) => a.date.localeCompare(b.date))
    materialEntries.value = (
      await db.materialEntries.filter((e) => !e.deletedAt).toArray()
    ).sort((a, b) => a.date.localeCompare(b.date))
  }

  async function addWorkEntry(
    data: Omit<WorkEntry, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ) {
    const entry: WorkEntry = {
      ...data,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await db.workEntries.add(entry)
    workEntries.value.unshift(entry)
    workEntries.value.sort((a, b) => b.date.localeCompare(a.date))
    return entry
  }

  async function updateWorkEntry(id: string, data: Partial<WorkEntry>) {
    const updates = { ...data, updatedAt: new Date().toISOString() }
    await db.workEntries.update(id, updates)
    const idx = workEntries.value.findIndex((e) => e.id === id)
    if (idx !== -1) {
      workEntries.value[idx] = { ...workEntries.value[idx], ...updates }
    }
  }

  async function deleteWorkEntry(id: string) {
    await deleteWorkEntries([id])
  }

  // Hromadné (soft) smazání — jedna transakce místa N sekvenčních updatů
  async function deleteWorkEntries(ids: string[]) {
    if (!ids.length) return
    const now = new Date().toISOString()
    const idSet = new Set(ids)
    await db.workEntries
      .where('id')
      .anyOf(ids)
      .modify({ deletedAt: now, updatedAt: now })
    workEntries.value = workEntries.value.filter((e) => !idSet.has(e.id))
  }

  async function togglePaid(id: string, isPaid: boolean) {
    await updateWorkEntry(id, { isPaid })
  }

  // Hromadné označení zaplaceno/nezaplaceno pro skupinu záznamů
  async function setPaidForEntries(ids: string[], isPaid: boolean) {
    if (!ids.length) return
    const now = new Date().toISOString()
    const idSet = new Set(ids)
    await db.workEntries
      .where('id')
      .anyOf(ids)
      .modify({ isPaid, updatedAt: now })
    workEntries.value = workEntries.value.map((e) =>
      idSet.has(e.id) ? { ...e, isPaid, updatedAt: now } : e,
    )
  }

  // Hromadné označení materiálu jako (ne)proplaceného
  async function setPaidForMaterialEntries(ids: string[], isPaid: boolean) {
    if (!ids.length) return
    const now = new Date().toISOString()
    const idSet = new Set(ids)
    await db.materialEntries
      .where('id')
      .anyOf(ids)
      .modify({ isPaid, updatedAt: now })
    materialEntries.value = materialEntries.value.map((e) =>
      idSet.has(e.id) ? { ...e, isPaid, updatedAt: now } : e,
    )
  }

  // Označí všechny nezaplacené hodiny i materiál zakázky jako zaplacené
  async function markAllPaidForProject(projectId: string) {
    const hoursToUpdate = workEntries.value.filter(
      (e) => e.projectId === projectId && !e.isPaid,
    )
    const materialsToUpdate = materialEntries.value.filter(
      (m) => m.projectId === projectId && !m.isPaid,
    )
    await setPaidForEntries(
      hoursToUpdate.map((e) => e.id),
      true,
    )
    await setPaidForMaterialEntries(
      materialsToUpdate.map((m) => m.id),
      true,
    )
    return hoursToUpdate.length + materialsToUpdate.length
  }

  async function addMaterialEntry(
    data: Omit<MaterialEntry, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ) {
    const entry: MaterialEntry = {
      ...data,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await db.materialEntries.add(entry)
    materialEntries.value.unshift(entry)
    materialEntries.value.sort((a, b) => b.date.localeCompare(a.date))
    return entry
  }

  async function updateMaterialEntry(id: string, data: Partial<MaterialEntry>) {
    const updates = { ...data, updatedAt: new Date().toISOString() }
    await db.materialEntries.update(id, updates)
    const idx = materialEntries.value.findIndex((e) => e.id === id)
    if (idx !== -1) {
      materialEntries.value[idx] = { ...materialEntries.value[idx], ...updates }
    }
  }

  async function deleteMaterialEntry(id: string) {
    const now = new Date().toISOString()
    await db.materialEntries.update(id, { deletedAt: now, updatedAt: now })
    materialEntries.value = materialEntries.value.filter((e) => e.id !== id)
  }

  // Computed helpers
  function getTotalHours(projectId: string, collaboratorId?: string) {
    return workEntries.value
      .filter(
        (e) =>
          e.projectId === projectId &&
          (!collaboratorId || e.collaboratorId === collaboratorId),
      )
      .reduce((sum, e) => sum + e.hours, 0)
  }

  function getUnpaidHours(projectId: string, collaboratorId?: string) {
    return workEntries.value
      .filter(
        (e) =>
          e.projectId === projectId &&
          !e.isPaid &&
          (!collaboratorId || e.collaboratorId === collaboratorId),
      )
      .reduce((sum, e) => sum + e.hours, 0)
  }

  function getTotalEarnings(
    projectId: string,
    workTypeRates: Record<string, number>,
    collaboratorId?: string,
  ) {
    return workEntries.value
      .filter(
        (e) =>
          e.projectId === projectId &&
          (!collaboratorId || e.collaboratorId === collaboratorId),
      )
      .reduce((sum, e) => sum + e.hours * (workTypeRates[e.workTypeId] ?? 0), 0)
  }

  function getUnpaidEarnings(
    projectId: string,
    workTypeRates: Record<string, number>,
    collaboratorId?: string,
  ) {
    return workEntries.value
      .filter(
        (e) =>
          e.projectId === projectId &&
          !e.isPaid &&
          (!collaboratorId || e.collaboratorId === collaboratorId),
      )
      .reduce((sum, e) => sum + e.hours * (workTypeRates[e.workTypeId] ?? 0), 0)
  }

  return {
    workEntries,
    materialEntries,
    loading,
    currentProjectId,
    loadEntriesForProject,
    loadAllEntries,
    addWorkEntry,
    updateWorkEntry,
    deleteWorkEntry,
    deleteWorkEntries,
    togglePaid,
    setPaidForEntries,
    setPaidForMaterialEntries,
    markAllPaidForProject,
    addMaterialEntry,
    updateMaterialEntry,
    deleteMaterialEntry,
    getTotalHours,
    getUnpaidHours,
    getTotalEarnings,
    getUnpaidEarnings,
  }
})
