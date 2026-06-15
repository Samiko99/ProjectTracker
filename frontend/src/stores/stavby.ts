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

  async function deleteProject(id: string) {
    const now = new Date().toISOString()
    await db.projects.update(id, { deletedAt: now, updatedAt: now })
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
    // null = znovu otevřeno (propaguje se synchronizací)
    await db.projects.update(id, { closedAt: null as unknown as undefined, updatedAt: now })
    const idx = projects.value.findIndex((p) => p.id === id)
    if (idx !== -1) projects.value[idx] = { ...projects.value[idx], closedAt: undefined, updatedAt: now }
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
