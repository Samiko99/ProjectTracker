# Nasazení na server (CasaOS + Docker)

Celý stack běží jako tři kontejnery v jednom `docker-compose.yml`:

| Služba     | Co dělá                                        | Port |
|------------|------------------------------------------------|------|
| `frontend` | nginx — servíruje appku a proxuje `/api`       | 9009 (ven) |
| `backend`  | Node.js API (auth, sync, zálohy)               | 3001 (interní) |
| `db`       | PostgreSQL 16 + perzistentní volume `db-data`  | 5432 (interní) |

Aplikaci pak otevřeš na **http://192.168.100.150:9009/** (i z telefonu na stejné síti).
Frontend a API jsou na stejné adrese (same-origin), takže žádné CORS potíže.

---

## Co potřebuješ na serveru
- Docker + Docker Compose v2 (CasaOS je má)
- Volný port 9009 (nebo si v `.env` zvol jiný)
- Zkopírovat tam tuto složku (`StavebniDenik/` — frontend, backend, docker-compose.yml, .env)

---

## Varianta A — přes SSH (nejjednodušší)

```bash
# 1) Zkopíruj projekt na server (z PC, např. přes scp nebo git)
scp -r "StavebniDenik" uzivatel@192.168.100.150:~/

# 2) Na serveru
cd ~/StavebniDenik

# 3) Zkontroluj/uprav .env (port, IP, heslo k DB, JWT secrety)
nano .env

# 4) Sestav a spusť (poprvé to chvíli trvá – buildí se images)
docker compose up -d --build

# 5) Sleduj logy
docker compose logs -f
```

Hotovo → otevři http://192.168.100.150:9009/

Užitečné příkazy:
```bash
docker compose ps           # stav kontejnerů
docker compose down         # zastav (data v DB zůstanou ve volume)
docker compose up -d --build # po změně kódu znovu sestav
```

---

## Varianta B — přes CasaOS (webové rozhraní)

CasaOS umí importovat `docker-compose.yml`:

1. Zkopíruj složku `StavebniDenik/` na server (přes Files v CasaOS nebo scp).
2. CasaOS → **App Store** → ikona **+** vpravo nahoře → **Install a customized app**
   → záložka **Import** / **Docker Compose**.
3. Vlož obsah `docker-compose.yml`.
4. Hodnoty z `.env` zadej v CasaOS jako proměnné prostředí (nebo nech `.env` ležet
   vedle compose souboru, pokud importuješ ze složky).
5. Install → počkej na build.

> Pozn.: build ze zdrojáků (`build: ./backend`) potřebuje, aby CasaOS viděl složky
> `backend/` a `frontend/`. Pokud CasaOS umí jen čistý compose bez build kontextu,
> použij **Variantu A** (SSH) — je spolehlivější.

---

## Po nasazení
- Otevři appku, jdi do **Nastavení → Synchronizace → Přihlásit se / Registrace**.
- Adresa serveru se nastaví automaticky na `/api` (same-origin), nemusíš nic měnit.
- Pro testery: každý si vytvoří účet, data se synchronizují na server.

## Aktualizace po změně kódu
```bash
cd ~/StavebniDenik
git pull            # nebo zkopíruj nové soubory
docker compose up -d --build
```
Schéma DB se aktualizuje automaticky při startu backendu (`prisma db push`).

## Zálohy databáze
Data jsou v Docker volume `stavebni-denik_db-data`. Ruční dump:
```bash
docker compose exec db pg_dump -U stavdenik stavebni_denik > zaloha.sql
```

---

## ⚠️ HTTPS a plný PWA režim
Instalace jako PWA na iPhone (service worker, „Přidat na plochu" s offline během)
vyžaduje **HTTPS**. Přes čisté `http://IP:9009` appka funguje jako běžná webovka,
ale iOS ji nenainstaluje jako PWA.

Až budeš chtít plný PWA režim:
1. Dej serveru doménu + HTTPS (Let's Encrypt, nebo reverse proxy v CasaOS).
2. Ve `frontend/Dockerfile` změň `quasar build` → `quasar build -m pwa`
   a doplň PWA ikony do `frontend/public/icons/`.
