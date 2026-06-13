import 'dotenv/config'

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (v === undefined) {
    throw new Error(`Chybí povinná env proměnná: ${name}`)
  }
  return v
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:9000',
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? 7),
  },
  maxBackupsPerUser: 5,
}
