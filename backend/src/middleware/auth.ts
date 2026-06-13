import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt.js'

// Rozšíření Express Request o přihlášeného uživatele
export interface AuthedRequest extends Request {
  userId?: string
  userEmail?: string
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Chybí přihlašovací token' })
    return
  }

  const token = header.slice('Bearer '.length)
  try {
    const payload = verifyAccessToken(token)
    req.userId = payload.userId
    req.userEmail = payload.email
    next()
  } catch {
    res.status(401).json({ error: 'Neplatný nebo vypršený token' })
  }
}
