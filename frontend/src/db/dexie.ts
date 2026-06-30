import Dexie from 'dexie'

export interface Project {
  id: string
  name: string
  address: string
  notes: string
  color: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  closedAt?: string // uzavřená/hotová zakázka
}

export interface WorkType {
  id: string
  name: string
  hourlyRate: number
  currency?: string // měna sazby (výchozí Kč)
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface Collaborator {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface WorkEntry {
  id: string
  projectId: string
  collaboratorId: string
  workTypeId: string
  date: string        // YYYY-MM-DD
  startTime?: string  // HH:mm
  endTime?: string    // HH:mm
  hours: number       // vypočítáno nebo zadáno ručně
  notes: string
  isPaid: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface MaterialEntry {
  id: string
  projectId: string
  date: string
  description: string
  amount: number
  paidById: string    // collaborator id
  notes: string
  isPaid: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

class StavebniDenikDB extends Dexie {
  projects!: Dexie.Table<Project, string>
  workTypes!: Dexie.Table<WorkType, string>
  collaborators!: Dexie.Table<Collaborator, string>
  workEntries!: Dexie.Table<WorkEntry, string>
  materialEntries!: Dexie.Table<MaterialEntry, string>

  constructor() {
    super('StavebniDenik')
    this.version(1).stores({
      projects: 'id, name, updatedAt, deletedAt',
      workTypes: 'id, name',
      collaborators: 'id, name',
      workEntries: 'id, projectId, collaboratorId, workTypeId, date, isPaid, updatedAt, deletedAt',
      materialEntries: 'id, projectId, paidById, date, updatedAt, deletedAt',
    })
    // v2: soft-delete pro workTypes a collaborators (kvůli synchronizaci)
    this.version(2).stores({
      workTypes: 'id, name, updatedAt, deletedAt',
      collaborators: 'id, name, updatedAt, deletedAt',
    })
  }
}

export const db = new StavebniDenikDB()
