import { Router } from 'express'
import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const backupRouter = Router()

// POST /api/backup — ulož JSON snapshot, drž jen posledních N na uživatele
backupRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!
    const data = req.body?.data

    if (data === undefined) {
      res.status(400).json({ error: 'Chybí data zálohy' })
      return
    }

    // Uložíme jako JSON string (kompatibilní se SQLite i Postgres)
    const serialized = typeof data === 'string' ? data : JSON.stringify(data)

    const backup = await prisma.syncBackup.create({
      data: { userId, data: serialized },
      select: { id: true, createdAt: true },
    })

    // Smaž staré zálohy nad limit
    const old = await prisma.syncBackup.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: config.maxBackupsPerUser,
      select: { id: true },
    })
    if (old.length) {
      await prisma.syncBackup.deleteMany({
        where: { id: { in: old.map((o) => o.id) } },
      })
    }

    res.status(201).json({ id: backup.id, createdAt: backup.createdAt })
  }),
)

// GET /api/backup — seznam záloh (bez dat, jen metadata)
backupRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!
    const backups = await prisma.syncBackup.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true },
    })
    res.json({ backups })
  }),
)

// GET /api/backup/:id — konkrétní záloha včetně dat
backupRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!
    const backup = await prisma.syncBackup.findUnique({
      where: { id: req.params.id },
    })

    if (!backup || backup.userId !== userId) {
      res.status(404).json({ error: 'Záloha nenalezena' })
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(backup.data)
    } catch {
      parsed = backup.data
    }

    res.json({ id: backup.id, createdAt: backup.createdAt, data: parsed })
  }),
)
