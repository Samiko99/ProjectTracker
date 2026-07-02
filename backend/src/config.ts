import 'dotenv/config'

const isProd = process.env.NODE_ENV === 'production'

// V produkci musí být hodnota v env; ve vývoji se použije fallback.
function required(name: string, devFallback: string): string {
  const v = process.env[name]
  if (v) return v
  if (!isProd) return devFallback
  throw new Error(`Chybí povinná env proměnná: ${name}`)
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:9000',
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? 7),
  },
  maxBackupsPerUser: 5,
}
