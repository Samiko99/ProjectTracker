import type { Request, Response, NextFunction, RequestHandler } from 'express'

/**
 * Jednoduchý in-memory rate limiter (per IP, klouzavé okno).
 * Chrání auth endpointy proti hádání hesel. Pro jednu instanci stačí;
 * při škálování na více procesů nahradit sdíleným úložištěm.
 */
export function rateLimit(opts: { windowMs: number; max: number }): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>()

  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, rec] of hits) {
      if (rec.resetAt <= now) hits.delete(key)
    }
  }, opts.windowMs)
  cleanup.unref()

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown'
    const now = Date.now()
    let rec = hits.get(key)
    if (!rec || rec.resetAt <= now) {
      rec = { count: 0, resetAt: now + opts.windowMs }
      hits.set(key, rec)
    }
    rec.count += 1
    if (rec.count > opts.max) {
      res.status(429).json({ error: 'Příliš mnoho pokusů, zkuste to za chvíli' })
      return
    }
    next()
  }
}
