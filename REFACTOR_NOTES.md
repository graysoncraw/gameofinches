# Refactor — November 17, 2026

Implementation is complete locally. Changes have not been committed or deployed.

## Completed

- Split the Sleeper service into modules for API transport, API types, player
  loading, season ingestion, transactions, analytics, scheduling, and snapshot
  persistence. The original service now orchestrates these modules.
- Moved public league types into `app/lib/league-types.ts` so UI and domain code
  no longer import models from the server ingestion service.
- Removed the homepage draft countdown, its CSS, and the obsolete fallback date.
- Removed a pre-existing duplicate roster-history implementation and conflicting
  type declaration. Kept the canonical Week 1 / final roster implementation and
  updated the stale test to verify its actual public fields.
- Enabled TypeScript to check the `.ts` imports used by the Node test runner.
- Preserved the keeper seed, database schema, and commissioner keeper storage.
- Split the dashboard into a server-rendered shell, overview, weekly roundup,
  navigation, draft room, keeper board, and season archive. Shared display helpers
  and avatars replace repeated implementations.
- Added the current week and matchups from Sleeper's NFL state. Completed weeks
  alone feed records and analytics. Schema version 11 rebuilds existing snapshots
  on the first successful sync after deployment.
- Added an automatic weekly recap based on the latest completed scores, with
  shared weekly highs, closest finishes, ties, and starter highlights handled.
  The current scoreboard and standings appear on the homepage.
- Added request timeouts, bounded retries, concurrency limits that cover response
  parsing, daily player caching, and coalesced in-memory preview snapshots.
- Saved weekly facts and snapshots atomically. Stalled syncs can retry, and refresh
  timestamps now respect Central daylight-saving transitions.
- Updated Next.js and its ESLint configuration to 16.4.6, React to 19.3.1,
  Drizzle Kit to 0.31.11, and patched image/CSS transitive dependencies. Removed
  unused Tailwind/PostCSS tooling in favor of a small shared CSS reset.
- Renamed misleading source-only HTML tests to `architecture.test.mjs` and added
  a reusable HTTP smoke check for the running site.

## Verified

- `npm run check` passed: lint, production build, and 43 tests.
- `npm audit --omit=dev` reports zero production dependency vulnerabilities.
- Live Sleeper data rendered Week 11, a Week 10 recap, five scheduled matchups,
  and ten current standings entries.
- `npm run test:smoke` passed against the standalone production server: all 18
  section/home/admin pages, a team profile, ten build assets, the current
  transaction feed, and unknown-route handling.

## Verification limits and remaining advisories

- Browser automation was unavailable and browser windows were minimized, so
  visual and interactive browser QA could not be completed. HTTP checks cover
  the server-rendered pages and build assets.
- No local PostgreSQL/Docker instance was available. Snapshot transaction and
  season-ingestion behavior are covered by isolated tests; runtime route checks
  use the in-memory preview path. Production commissioner records were not read
  or modified.
- Full `npm audit` still reports 18 development-only findings: 14 high findings
  through Picomatch and its dependents, and four moderate findings through
  Drizzle Kit's legacy esbuild loader. Picomatch 4.0.7 is the latest published
  version and is affected. Avoid forced framework downgrades or incompatible
  transitive upgrades merely to silence these advisories; recheck upstream fixes.

Sleeper's live response during inspection reported NFL `leg: 11`, `week: 11`,
and `display_week: 10`; this league reported `last_scored_leg: 10` and
`status: in_season`. Use the scoring leg rather than blindly trusting the display
week. This state is now read during each scheduled sync.

The user confirmed that this year's keepers were already updated on the website.
Do not replace them.
