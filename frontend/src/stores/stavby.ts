import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, type Project } from '../db/dexie'
import { uuid } from '../utils/uuid'

export const useStavbyStore = defineStore('stavby', () => {
  const projects = ref<Project[]>([])
  const loading = ref(false)

  async function loadProjects() {
    loading.value = true
    try {
      projects.value = await db.projects
        .filter((p) => !p.deletedAt)
        .sortBy('name')
    } finally {
      loading.value = false
    }
  }

  async function addProject(
    data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ) {
    const project: Project = {
      ...data,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await db.projects.add(project)
    projects.value.push(project)
    projects.value.sort((a, b) => a.name.localeCompare(b.name, 'cs'))
    return project
  }

  async function updateProject(id: string, data: Partial<Project>) {
    const updates = { ...data, updatedAt: new Date().toISOString() }
    await db.projects.update(id, updates)
    const idx = projects.value.findIndex((p) => p.id === id)
    if (idx !== -1) {
      projects.value[idx] = { ...projects.value[idx], ...updates }
    }
  }

  // Soft-delete zakázky včetně jejích záznamů (jinak by osiřelé záznamy
  // smazané zakázky dál strašily v kalendáři a souhrnech)
  async function deleteProject(id: string) {
    const now = new Date().toISOString()
    await db.projects.update(id, { deletedAt: now, updatedAt: now })
    await db.workEntries
      .where('projectId')
      .equals(id)
      .filter((e) => !e.deletedAt)
      .modify({ deletedAt: now, updatedAt: now })
    await db.materialEntries
      .where('projectId')
      .equals(id)
      .filter((e) => !e.deletedAt)
      .modify({ deletedAt: now, updatedAt: now })
    projects.value = projects.value.filter((p) => p.id !== id)
  }

  async function closeProject(id: string) {
    const now = new Date().toISOString()
    await db.projects.update(id, { closedAt: now, updatedAt: now })
    const idx = projects.value.findIndex((p) => p.id === id)
    if (idx !== -1) projects.value[idx] = { ...projects.value[idx], closedAt: now, updatedAt: now }
  }

  async function reopenProject(id: string) {
    const now = new Date().toISOString()
    // undefined = Dexie klíč odstraní; sync pak na server pošle null
    await db.projects.update(id, { closedAt: undefined, updatedAt: now })
    const idx = projects.value.findIndex((p) => p.id === id)
    if (idx !== -1) {
      const { closedAt: _closedAt, ...rest } = projects.value[idx]
      projects.value[idx] = { ...rest, updatedAt: now }
    }
  }

  function getProjectById(id: string) {
    return projects.value.find((p) => p.id === id)
  }

  return {
    projects,
    loading,
    loadProjects,
    addProject,
    updateProject,
    deleteProject,
    closeProject,
    reopenProject,
    getProjectById,
  }
})
