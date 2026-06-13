import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config.js'
import { authRouter } from './routes/auth.js'
import { syncRouter } from './routes/sync.js'
import { backupRouter } from './routes/backup.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  }),
)
app.use(express.json({ limit: '5mb' }))

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api/sync', syncRouter)
app.use('/api/backup', backupRouter)

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint nenalezen' })
})

// Globální error handler
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction,
  ) => {
    console.error('Neočekávaná chyba:', err)
    res.status(500).json({ error: 'Vnitřní chyba serveru' })
  },
)

app.listen(config.port, () => {
  console.log(`🏗️  Stavební deník backend běží na http://localhost:${config.port}`)
})
