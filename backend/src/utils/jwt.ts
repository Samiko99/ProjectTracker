import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export interface AccessTokenPayload {
  userId: string
  email: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpires,
  } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload
}

// Refresh token je náhodný řetězec uložený v DB (ne JWT) — jde zneplatnit.
export function generateRefreshToken(): string {
  // 48 náhodných bajtů → hex (96 znaků)
  const bytes = new Uint8Array(48)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function refreshExpiryDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() + config.jwt.refreshExpiresDays)
  return d
}
