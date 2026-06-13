# Stavební deník — Backend

Node.js + Express + Prisma. Auth (JWT), timestamp-based sync a zálohy.

## Lokální vývoj (SQLite)

```bash
cd backend
npm install
cp .env.example .env          # uprav secrety
npx prisma migrate dev        # vytvoří dev.db + tabulky
npm run dev                   # http://localhost:3001
```

## API endpointy

| Metoda | Cesta                | Auth | Popis                                   |
|--------|----------------------|------|-----------------------------------------|
| GET    | `/api/health`        | ne   | Health check                            |
| POST   | `/api/auth/register` | ne   | `{ email, password, name }`             |
| POST   | `/api/auth/login`    | ne   | `{ email, password }`                   |
| POST   | `/api/auth/refresh`  | ne   | `{ refreshToken }` → nový pár (rotace)  |
| POST   | `/api/auth/logout`   | ne   | `{ refreshToken }` → zneplatní          |
| GET    | `/api/auth/me`       | ano  | Info o přihlášeném uživateli            |
| POST   | `/api/sync`          | ano  | `{ lastSyncAt, changes }` → diff sync   |
| GET    | `/api/backup`        | ano  | Seznam záloh (metadata)                 |
| POST   | `/api/backup`        | ano  | `{ data }` → uloží snapshot (drží 5)    |
| GET    | `/api/backup/:id`    | ano  | Konkrétní záloha vč. dat                |

Auth přes hlavičku `Authorization: Bearer <accessToken>`.

### Sync protokol

**Request** `POST /api/sync`:
```json
{
  "lastSyncAt": "2026-06-12T10:00:00.000Z",  // null = první/plná synchronizace
  "changes": {
    "projects": [ { "id": "...", "name": "...", "createdAt": "...", "updatedAt": "...", "deletedAt": null } ],
    "workTypes": [], "collaborators": [], "workEntries": [], "materialEntries": []
  }
}
```

**Response**:
```json
{
  "serverTime": "2026-06-12T10:05:00.000Z",   // ulož jako další lastSyncAt
  "changes": { "projects": [...], "workTypes": [...], ... }  // změny ze serveru od lastSyncAt
}
```

- **Push**: server upsertuje příchozí záznamy (userId přepíše na přihlášeného), **last-write-wins** podle `updatedAt`.
- **Pull**: vrací záznamy s `updatedAt > lastSyncAt` (včetně soft-deleted, aby klient poznal mazání).
- Mazání = `deletedAt` vyplněno (soft delete).

## Nasazení na VPS (PostgreSQL + PM2 + Nginx)

1. **Přepni Prisma na Postgres** — v `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. **`.env`** na serveru:
   ```
   DATABASE_URL="postgresql://uzivatel:heslo@localhost:5432/stavebni_denik?schema=public"
   PORT=3001
   CORS_ORIGIN="https://tvoje-domena.cz"
   JWT_ACCESS_SECRET="<dlouhý náhodný řetězec>"
   JWT_REFRESH_SECRET="<jiný dlouhý náhodný řetězec>"
   ```
3. **Build a migrace**:
   ```bash
   npm ci
   npx prisma migrate deploy
   npm run build
   ```
4. **PM2**:
   ```bash
   pm2 start dist/index.js --name stavebni-denik-api
   pm2 save
   ```
5. **Nginx** reverse proxy:
   ```nginx
   location /api/ {
       proxy_pass http://localhost:3001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```

> ⚠️ V produkci vždy vygeneruj nové náhodné JWT secrety a nasaď přes HTTPS.
