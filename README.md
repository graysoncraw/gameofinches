# Game of Inches

Public league archive and commissioner tools for the Game of Inches fantasy
football keeper league.

The site uses Sleeper as its statistical source, stores twice-daily snapshots
and normalized historical facts in Cloudflare D1, and keeps official keeper
rulings behind a shared-password Commissioner Desk.

## Local development

Requirements:

- Node.js 22.13 or newer
- npm

```bash
npm install
npm run dev
```

Local secrets belong in `.env.local`:

```dotenv
COMMISSIONER_PASSWORD_HASH=
COMMISSIONER_SESSION_SECRET=
```

Generate the password hash with the same SHA-256 format used by
`app/lib/admin-auth.ts`. Never commit real secret values.

## Project structure

- `app/components/` — public league views and interactive tools
- `app/admin/` — authenticated Commissioner Desk
- `app/api/` — keeper, session, and cached transaction endpoints
- `app/lib/sleeper.ts` — Sleeper ingestion, D1 snapshots, and sync scheduling
- `app/lib/chaos.ts` — derived records, Elo, superlatives, and archive facts
- `app/lib/keeper-rules.ts` — shared keeper eligibility and projection rules
- `db/` and `drizzle/` — D1 schema and versioned migrations
- `tests/` — domain and source-contract tests

## Quality checks

```bash
npm run lint
npm run test:unit
npm run build
npm run check
```

`npm run check` runs the complete lint, production build, and test suite.

## Data and synchronization

- Public requests read cached D1 snapshots.
- The first request after 6:00 AM and 6:00 PM Central may refresh Sleeper data.
- Failed refreshes continue serving the previous successful snapshot.
- The Sleeper player directory refreshes no more than once daily.
- Official keeper writes are restricted to a valid Commissioner Desk session.

The connected Sites project is declared in `.openai/hosting.json`. Production
secrets are managed by Sites and are separate from local environment files.
