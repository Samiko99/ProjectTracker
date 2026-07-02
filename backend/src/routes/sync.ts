import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const syncRouter = Router()

// --- Validace příchozích dat (klientovi nevěříme) ---

// Řetězec převoditelný na platné Date
const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Neplatné datum')

const baseFields = {
  id: z.string().min(1).max(64),
  createdAt: isoDate,
  updatedAt: isoDate,
  deletedAt: isoDate.nullish(),
}

const projectSchema = z.object({
  ...baseFields,
  name: z.string().max(500),
  address: z.string().max(1000).default(''),
  notes: z.string().max(10000).default(''),
  color: z.string().max(32).default('#E65100'),
  closedAt: isoDate.nullish(),
})

const workTypeSchema = z.object({
  ...baseFields,
  name: z.string().max(500),
  hourlyRate: z.number().finite().default(0),
  currency: z.string().max(16).default('Kč'),
})

const collaboratorSchema = z.object({
  ...baseFields,
  name: z.string().max(500),
})

const workEntrySchema = z.object({
  ...baseFields,
  projectId: z.string().min(1).max(64),
  collaboratorId: z.string().max(64).default(''),
  workTypeId: z.string().max(64).default(''),
  date: z.string().max(10),
  startTime: z.string().max(5).nullish(),
  endTime: z.string().max(5).nullish(),
  hours: z.number().finite().default(0),
  notes: z.string().max(10000).default(''),
  isPaid: z.boolean().default(false),
})

const materialEntrySchema = z.object({
  ...baseFields,
  projectId: z.string().min(1).max(64),
  date: z.string().max(10),
  description: z.string().max(2000).default(''),
  amount: z.number().finite().default(0),
  paidById: z.string().max(64).default(''),
  notes: z.string().max(10000).default(''),
  isPaid: z.boolean().default(false),
})

const syncBodySchema = z.object({
  lastSyncAt: isoDate.nullish(),
  changes: z
    .object({
      projects: z.array(projectSchema).default([]),
      workTypes: z.array(workTypeSchema).default([]),
      collaborators: z.array(collaboratorSchema).default([]),
      workEntries: z.array(workEntrySchema).default([]),
      materialEntries: z.array(materialEntrySchema).default([]),
    })
    .default({}),
})

function toDate(v: string | null | undefined): Date | null {
  return v ? new Date(v) : null
}

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
 * Zápisy běží v jedné transakci (konzistence + rychlost).
 */
async function pushModel<T extends IncomingBase>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delegate: any,
  incoming: T[],
  userId: string,
  buildData: (rec: T) => Record<string, unknown>,
): Promise<void> {
  if (!incoming.length) return

  const ids = incoming.map((r) => r.id)
  const existingRows = await delegate.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true, updatedAt: true },
  })
  const existingMap = new Map<string, { userId: string; updatedAt: Date }>(
    existingRows.map((r: { id: string; userId: string; updatedAt: Date }) => [r.id, r]),
  )

  const ops: unknown[] = []
  for (const rec of incoming) {
    const data = buildData(rec)
    const existing = existingMap.get(rec.id)

    if (existing) {
      if (existing.userId !== userId) continue // cizí záznam
      if (new Date(rec.updatedAt) < existing.updatedAt) continue // starší → přeskoč
      ops.push(delegate.update({ where: { id: rec.id }, data }))
    } else {
      ops.push(delegate.create({ data: { ...data, id: rec.id, userId } }))
    }
  }
  if (ops.length) await prisma.$transaction(ops as never[])
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

// POST /api/sync
syncRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!
    const serverTime = new Date()

    const parsed = syncBodySchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      res.status(400).json({
        error: `Neplatná data synchronizace: ${issue.path.join('.')} — ${issue.message}`,
      })
      return
    }

    const since = parsed.data.lastSyncAt ? new Date(parsed.data.lastSyncAt) : null
    const changes = parsed.data.changes

    // --- PUSH ---
    await pushModel(prisma.project, changes.projects, userId, (r) => ({
      name: r.name,
      address: r.address,
      notes: r.notes,
      color: r.color,
      closedAt: toDate(r.closedAt),
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      deletedAt: toDate(r.deletedAt),
    }))

    await pushModel(prisma.workType, changes.workTypes, userId, (r) => ({
      name: r.name,
      hourlyRate: r.hourlyRate,
      currency: r.currency,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      deletedAt: toDate(r.deletedAt),
    }))

    await pushModel(prisma.collaborator, changes.collaborators, userId, (r) => ({
      name: r.name,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      deletedAt: toDate(r.deletedAt),
    }))

    // Záznamy smí odkazovat jen na projekty přihlášeného uživatele
    // (projekty se pushují výše, takže nově vytvořené už v DB jsou)
    const refProjectIds = Array.from(
      new Set(
        [...changes.workEntries, ...changes.materialEntries].map((e) => e.projectId),
      ),
    )
    const ownedProjects = refProjectIds.length
      ? await prisma.project.findMany({
          where: { id: { in: refProjectIds }, userId },
          select: { id: true },
        })
      : []
    const ownedIds = new Set(ownedProjects.map((p) => p.id))

    await pushModel(
      prisma.workEntry,
      changes.workEntries.filter((e) => ownedIds.has(e.projectId)),
      userId,
      (r) => ({
        projectId: r.projectId,
        collaboratorId: r.collaboratorId,
        workTypeId: r.workTypeId,
        date: r.date,
        startTime: r.startTime ?? null,
        endTime: r.endTime ?? null,
        hours: r.hours,
        notes: r.notes,
        isPaid: r.isPaid,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
        deletedAt: toDate(r.deletedAt),
      }),
    )

    await pushModel(
      prisma.materialEntry,
      changes.materialEntries.filter((e) => ownedIds.has(e.projectId)),
      userId,
      (r) => ({
        projectId: r.projectId,
        date: r.date,
        description: r.description,
        amount: r.amount,
        paidById: r.paidById,
        notes: r.notes,
        isPaid: r.isPaid,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
        deletedAt: toDate(r.deletedAt),
      }),
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
  }),
)
