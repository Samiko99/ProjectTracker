import type { Request, Response, NextFunction, RequestHandler } from 'express'

// Express 4 nepředává chyby z async handlerů do error middleware —
// odmítnutý promise by nechal request viset. Tento wrapper je chytá.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}
