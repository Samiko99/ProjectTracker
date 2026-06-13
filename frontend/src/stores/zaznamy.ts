import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, type WorkEntry, type MaterialEntry } from '../db/dexie'

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
      id: crypto.randomUUID(),
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
    const now = new Date().toISOString()
    await db.workEntries.update(id, { deletedAt: now, updatedAt: now })
    workEntries.value = workEntries.value.filter((e) => e.id !== id)
  }

  async function togglePaid(id: string, isPaid: boolean) {
    await updateWorkEntry(id, { isPaid })
  }

  async function addMaterialEntry(
    data: Omit<MaterialEntry, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ) {
    const entry: MaterialEntry = {
      ...data,
      id: crypto.randomUUID(),
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
    togglePaid,
    addMaterialEntry,
    updateMaterialEntry,
    deleteMaterialEntry,
    getTotalHours,
    getUnpaidHours,
    getTotalEarnings,
    getUnpaidEarnings,
  }
})
