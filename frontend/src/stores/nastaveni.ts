import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, type WorkType, type Collaborator } from '../db/dexie'

export const useNastaveniStore = defineStore('nastaveni', () => {
  const workTypes = ref<WorkType[]>([])
  const collaborators = ref<Collaborator[]>([])
  const loading = ref(false)

  const workTypeRates = computed(() =>
    Object.fromEntries(workTypes.value.map((wt) => [wt.id, wt.hourlyRate])),
  )

  async function loadSettings() {
    loading.value = true
    try {
      workTypes.value = await db.workTypes.filter((w) => !w.deletedAt).toArray()
      collaborators.value = await db.collaborators
        .filter((c) => !c.deletedAt)
        .toArray()
    } finally {
      loading.value = false
    }
  }

  async function addWorkType(
    data: Omit<WorkType, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    const wt: WorkType = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await db.workTypes.add(wt)
    workTypes.value.push(wt)
    return wt
  }

  async function updateWorkType(id: string, data: Partial<WorkType>) {
    const updates = { ...data, updatedAt: new Date().toISOString() }
    await db.workTypes.update(id, updates)
    const idx = workTypes.value.findIndex((w) => w.id === id)
    if (idx !== -1) {
      workTypes.value[idx] = { ...workTypes.value[idx], ...updates }
    }
  }

  async function deleteWorkType(id: string) {
    const now = new Date().toISOString()
    await db.workTypes.update(id, { deletedAt: now, updatedAt: now })
    workTypes.value = workTypes.value.filter((w) => w.id !== id)
  }

  async function addCollaborator(
    data: Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    const collab: Collaborator = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await db.collaborators.add(collab)
    collaborators.value.push(collab)
    return collab
  }

  async function updateCollaborator(id: string, data: Partial<Collaborator>) {
    const updates = { ...data, updatedAt: new Date().toISOString() }
    await db.collaborators.update(id, updates)
    const idx = collaborators.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      collaborators.value[idx] = { ...collaborators.value[idx], ...updates }
    }
  }

  async function deleteCollaborator(id: string) {
    const now = new Date().toISOString()
    await db.collaborators.update(id, { deletedAt: now, updatedAt: now })
    collaborators.value = collaborators.value.filter((c) => c.id !== id)
  }

  function getCollaboratorName(id: string) {
    return collaborators.value.find((c) => c.id === id)?.name ?? 'Neznámý'
  }

  function getWorkTypeName(id: string) {
    return workTypes.value.find((w) => w.id === id)?.name ?? 'Neznámý'
  }

  return {
    workTypes,
    collaborators,
    workTypeRates,
    loading,
    loadSettings,
    addWorkType,
    updateWorkType,
    deleteWorkType,
    addCollaborator,
    updateCollaborator,
    deleteCollaborator,
    getCollaboratorName,
    getWorkTypeName,
  }
})
