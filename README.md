# Game of Inches

Public league archive and commissioner tools for the Game of Inches fantasy
football keeper league.

This branch runs as a standard Next.js Node application backed by PostgreSQL.
Docker Compose starts both services, applies versioned database migrations, and
keeps the database on a persistent Docker volume. Sleeper remains the
statistical source and is contacted only during the existing twice-daily sync
windows.

## Run it on the Mac server

Requirements:

- An Intel Mac capable of running Docker Desktop or another Docker Compose
  implementation
- Docker Engine 24 or newer with Docker Compose v2

Create the server configuration:

```bash
cp .env.example .env
chmod 600 .env
```

Edit `.env` and replace every placeholder. Generate the commissioner values
without storing the plaintext password in the repository:

```bash
printf '%s' 'YOUR-COMMISSIONER-PASSWORD' | shasum -a 256
openssl rand -hex 32
```

Use the first output as `COMMISSIONER_PASSWORD_HASH` and the second as
`COMMISSIONER_SESSION_SECRET`. Then build and start the stack:

```bash
docker compose up --build -d
docker compose ps
```

Open `http://MAC-SERVER-IP:3000`. Change `APP_PORT` in `.env` if port 3000 is
already in use. The supplied images support Intel/AMD64 Macs.

Both containers use `restart: unless-stopped`, so they return after Docker
starts. Configure Docker Desktop to start at login if the Mac should recover
automatically after a reboot.

## What Docker runs

- `app` — a non-root Next.js standalone production server
- `database` — PostgreSQL 17, reachable only from the internal Compose network
- `postgres_data` — the persistent database volume

The application waits for PostgreSQL to become healthy, applies any unapplied
files in `drizzle/`, and then starts the web server. Both services have health
checks and bounded JSON log rotation.

Useful commands:

```bash
docker compose logs -f app
docker compose restart app
docker compose down
docker compose up --build -d
```

`docker compose down` preserves the PostgreSQL volume. Do not add `--volumes`
unless you intentionally want to erase the self-hosted database.

## Database backups

Create a compressed backup before upgrades or keeper changes:

```bash
mkdir -p backups
docker compose exec -T database sh -c \
  'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "backups/game-of-inches-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Restore into an empty database:

```bash
gunzip -c backups/YOUR-BACKUP.sql.gz \
  | docker compose exec -T database sh -c \
    'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Keep a copy of `backups/` somewhere outside the Mac. Sleeper-derived history
can be rebuilt, but commissioner keeper edits cannot be recreated from Sleeper.

## Data behavior

- Public requests read the latest successful PostgreSQL snapshot.
- The first request after 6:00 AM and 6:00 PM Central may refresh Sleeper data.
- A PostgreSQL synchronization lock prevents duplicate concurrent refreshes.
- Failed refreshes keep serving the previous snapshot and retry after 15
  minutes.
- The Sleeper player directory refreshes no more than once daily.
- Completed seasons are retained; routine syncs replace only the current
  season.
- Historical keeper records are seeded when missing. Commissioner edits are
  stored in PostgreSQL and are never overwritten by the seed.

The first visit to a new installation performs the initial Sleeper backfill and
can take longer than an ordinary page load.

## Local development

Start only PostgreSQL:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d database
```

Set a local connection string and run migrations:

```bash
export DATABASE_URL='postgresql://game_of_inches:YOUR_PASSWORD@localhost:5432/game_of_inches'
npm install
npm run db:migrate
npm run dev
```

The development override binds PostgreSQL to `127.0.0.1` only. The production
Compose file does not publish the database port.

## Security and internet access

Only the application port is published; PostgreSQL is private. If the website
will be reachable from the public internet, put it behind a maintained HTTPS
reverse proxy such as Caddy, nginx, or a secure tunnel. Do not expose port 5432.

The commissioner password hash and session signing secret live only in `.env`.
Commissioner sessions use signed HTTP-only cookies, same-origin write checks,
and PostgreSQL-backed login rate limiting.

## Project structure

- `app/components/` — public league views and interactive tools
- `app/admin/` — authenticated Commissioner Desk
- `app/api/` — keeper, session, health, and cached transaction endpoints
- `app/lib/sleeper.ts` — Sleeper ingestion and synchronization
- `app/lib/chaos.ts` — derived records, Elo, and superlatives
- `db/` and `drizzle/` — PostgreSQL client, schema, and migrations
- `scripts/migrate.mjs` — idempotent migration runner used at container startup
- `Dockerfile` and `compose.yaml` — self-hosted production stack
- `tests/` — domain and source-contract tests

## Quality checks

```bash
npm run lint
npm run test:unit
npm run build
npm run check
npm audit --omit=dev
```
