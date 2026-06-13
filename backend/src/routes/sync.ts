import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

export const syncRouter = Router()

// Společný tvar příchozího záznamu z klienta (Dexie)
interface IncomingBase {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/**
 * Zpracuje příchozí změny pro jeden model (push z klienta).
 * Pravidla:
 *  - userId vždy přepíšeme na přihlášeného uživatele (klientovi nevěříme)
 *  - cizí záznam (jiný userId) ignorujeme
 *  - last-write-wins podle updatedAt
 */
async function pushModel<T extends IncomingBase>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delegate: any,
  incoming: T[] | undefined,
  userId: string,
  buildData: (rec: T) => Record<string, unknown>,
): Promise<void> {
  if (!incoming?.length) return

  const ids = incoming.map((r) => r.id)
  const existingRows = await delegate.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true, updatedAt: true },
  })
  const existingMap = new Map<
    string,
    { userId: string; updatedAt: Date }
  >(existingRows.map((r: { id: string; userId: string; updatedAt: Date }) => [r.id, r]))

  for (const rec of incoming) {
    const data = buildData(rec)
    const existing = existingMap.get(rec.id)

    if (existing) {
      if (existing.userId !== userId) continue // cizí záznam
      if (new Date(rec.updatedAt) < existing.updatedAt) continue // starší → přeskoč
      await delegate.update({ where: { id: rec.id }, data })
    } else {
      await delegate.create({ data: { ...data, id: rec.id, userId } })
    }
  }
}

// Pull: vrať záznamy změněné po lastSyncAt (vč. soft-deleted, aby klient poznal mazání)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pullModel(delegate: any, userId: string, since: Date | null) {
  return delegate.findMany({
    where: {
      userId,
      ...(since ? { updatedAt: { gt: since } } : {}),
    },
  })
}

function toDate(v: string | null | undefined): Date | null {
  return v ? new Date(v) : null
}

// POST /api/sync
syncRouter.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const serverTime = new Date()

  const lastSyncRaw = req.body?.lastSyncAt as string | null | undefined
  const since = lastSyncRaw ? new Date(lastSyncRaw) : null

  const changes = (req.body?.changes ?? {}) as Record<string, unknown[]>

  // --- PUSH ---
  await pushModel(prisma.project, changes.projects as never[], userId, (r) => ({
    name: (r as never as { name: string }).name,
    address: (r as never as { address?: string }).address ?? '',
    notes: (r as never as { notes?: string }).notes ?? '',
    color: (r as never as { color?: string }).color ?? '#E65100',
    createdAt: new Date((r as IncomingBase).createdAt),
    updatedAt: new Date((r as IncomingBase).updatedAt),
    deletedAt: toDate((r as IncomingBase).deletedAt),
  }))

  await pushModel(prisma.workType, changes.workTypes as never[], userId, (r) => ({
    name: (r as never as { name: string }).name,
    hourlyRate: (r as never as { hourlyRate?: number }).hourlyRate ?? 0,
    createdAt: new Date((r as IncomingBase).createdAt),
    updatedAt: new Date((r as IncomingBase).updatedAt),
    deletedAt: toDate((r as IncomingBase).deletedAt),
  }))

  await pushModel(
    prisma.collaborator,
    changes.collaborators as never[],
    userId,
    (r) => ({
      name: (r as never as { name: string }).name,
      createdAt: new Date((r as IncomingBase).createdAt),
      updatedAt: new Date((r as IncomingBase).updatedAt),
      deletedAt: toDate((r as IncomingBase).deletedAt),
    }),
  )

  await pushModel(
    prisma.workEntry,
    changes.workEntries as never[],
    userId,
    (r) => {
      const e = r as never as {
        projectId: string
        collaboratorId?: string
        workTypeId?: string
        date: string
        startTime?: string | null
        endTime?: string | null
        hours?: number
        notes?: string
        isPaid?: boolean
      }
      return {
        projectId: e.projectId,
        collaboratorId: e.collaboratorId ?? '',
        workTypeId: e.workTypeId ?? '',
        date: e.date,
        startTime: e.startTime ?? null,
        endTime: e.endTime ?? null,
        hours: e.hours ?? 0,
        notes: e.notes ?? '',
        isPaid: e.isPaid ?? false,
        createdAt: new Date((r as IncomingBase).createdAt),
        updatedAt: new Date((r as IncomingBase).updatedAt),
        deletedAt: toDate((r as IncomingBase).deletedAt),
      }
    },
  )

  await pushModel(
    prisma.materialEntry,
    changes.materialEntries as never[],
    userId,
    (r) => {
      const e = r as never as {
        projectId: string
        date: string
        description?: string
        amount?: number
        paidById?: string
        notes?: string
        isPaid?: boolean
      }
      return {
        projectId: e.projectId,
        date: e.date,
        description: e.description ?? '',
        amount: e.amount ?? 0,
        paidById: e.paidById ?? '',
        notes: e.notes ?? '',
        isPaid: e.isPaid ?? false,
        createdAt: new Date((r as IncomingBase).createdAt),
        updatedAt: new Date((r as IncomingBase).updatedAt),
        deletedAt: toDate((r as IncomingBase).deletedAt),
      }
    },
  )

  // --- PULL ---
  const [projects, workTypes, collaborators, workEntries, materialEntries] =
    await Promise.all([
      pullModel(prisma.project, userId, since),
      pullModel(prisma.workType, userId, since),
      pullModel(prisma.collaborator, userId, since),
      pullModel(prisma.workEntry, userId, since),
      pullModel(prisma.materialEntry, userId, since),
    ])

  res.json({
    serverTime: serverTime.toISOString(),
    changes: {
      projects,
      workTypes,
      collaborators,
      workEntries,
      materialEntries,
    },
  })
})
