import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import {
  signAccessToken,
  generateRefreshToken,
  refreshExpiryDate,
} from '../utils/jwt.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const authRouter = Router()

const registerSchema = z.object({
  email: z.string().email('Neplatný e-mail'),
  password: z.string().min(6, 'Heslo musí mít alespoň 6 znaků'),
  name: z.string().min(1, 'Zadejte jméno'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Vytvoří access + refresh token a refresh uloží do DB
async function issueTokens(user: { id: string; email: string }) {
  const accessToken = signAccessToken({ userId: user.id, email: user.email })
  const refreshToken = generateRefreshToken()
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshExpiryDate(),
    },
  })
  return { accessToken, refreshToken }
}

// POST /api/auth/register
authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message })
      return
    }
    const { email, password, name } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: 'E-mail je již zaregistrovaný' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    })

    const tokens = await issueTokens(user)
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    })
  }),
)

// POST /api/auth/login
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Neplatné přihlašovací údaje' })
      return
    }
    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Nesprávný e-mail nebo heslo' })
      return
    }

    const tokens = await issueTokens(user)
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    })
  }),
)

// POST /api/auth/refresh — vymění platný refresh token za nový pár (rotace)
authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = z.string().safeParse(req.body?.refreshToken)
    if (!token.success) {
      res.status(400).json({ error: 'Chybí refresh token' })
      return
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: token.data },
      include: { user: true },
    })

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } })
      }
      res.status(401).json({ error: 'Neplatný nebo vypršený refresh token' })
      return
    }

    // Rotace: starý token zrušíme, vydáme nový
    await prisma.refreshToken.delete({ where: { id: stored.id } })
    const tokens = await issueTokens(stored.user)
    res.json({
      user: {
        id: stored.user.id,
        email: stored.user.email,
        name: stored.user.name,
      },
      ...tokens,
    })
  }),
)

// POST /api/auth/logout — zneplatní refresh token
authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = z.string().safeParse(req.body?.refreshToken)
    if (token.success) {
      await prisma.refreshToken
        .deleteMany({ where: { token: token.data } })
        .catch(() => {})
    }
    res.json({ ok: true })
  }),
)

// GET /api/auth/me — info o přihlášeném uživateli
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    })
    if (!user) {
      res.status(404).json({ error: 'Uživatel nenalezen' })
      return
    }
    res.json({ user })
  }),
)
