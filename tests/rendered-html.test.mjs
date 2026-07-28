import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const file = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("ships a D1-backed, twice-daily Sleeper snapshot", async () => {
  const [sleeper, schema, transactions] = await Promise.all([
    file("app/lib/sleeper.ts"),
    file("db/schema.ts"),
    file("app/api/transactions/route.ts"),
  ]);

  assert.match(sleeper, /sleeper_snapshots/);
  assert.match(sleeper, /sleeper_sync_runs/);
  assert.match(sleeper, /hour >= 18 \? "18" : "06"/);
  assert.match(sleeper, /T\$\{window\}:00:00-America\/Chicago/);
  assert.match(sleeper, /fetched_date === today/);
  assert.match(sleeper, /if \(cached\) return cached/);
  assert.match(schema, /sleeperPlayerCache/);
  assert.match(transactions, /getTransactionFeed/);
  assert.doesNotMatch(transactions, /api\.sleeper\.app/);
});

test("protects commissioner writes with the shared password session", async () => {
  const [auth, session, keepers, adminPage] = await Promise.all([
    file("app/lib/admin-auth.ts"),
    file("app/api/admin/session/route.ts"),
    file("app/api/admin/keepers/route.ts"),
    file("app/admin/page.tsx"),
  ]);

  assert.match(auth, /COMMISSIONER_PASSWORD_HASH/);
  assert.match(auth, /COMMISSIONER_SESSION_SECRET/);
  assert.match(auth, /30 \* 24 \* 60 \* 60/);
  assert.match(auth, /MAX_LOGIN_FAILURES = 5/);
  assert.match(session, /httpOnly: true/);
  assert.match(session, /sameSite: "lax"/);
  assert.match(keepers, /hasCommissionerRequest/);
  assert.match(keepers, /isSameOrigin/);
  assert.match(adminPage, /hasCommissionerSession/);
  await assert.rejects(access(new URL("../app/chatgpt-auth.ts", import.meta.url)));
});

test("includes the requested league records and keeper labels", async () => {
  const [sleeper, records, dashboard, portal] = await Promise.all([
    file("app/lib/sleeper.ts"),
    file("app/components/LeagueRecords.tsx"),
    file("app/components/LeagueDashboard.tsx"),
    file("app/admin/AdminPortal.tsx"),
  ]);

  assert.match(sleeper, /"2023": \{ buyIn: 10, first: 100/);
  assert.match(sleeper, /"2025": \{ buyIn: 15, first: 150/);
  assert.match(
    sleeper,
    /"2026": \{ buyIn: 25, first: 175, second: 50, third: 25 \}/,
  );
  assert.match(records, /League money ledger/);
  assert.match(records, /Choose your enemies/);
  assert.match(records, /TOP 10 STARTER SCORES/);
  assert.match(dashboard, /Distinct champions/);
  assert.match(dashboard, /Year 1 · 3 left/);
  assert.match(portal, /Year 1 · offseason trade · 3 years left/);
  assert.match(portal, /Year 3 · final year/);
});

test("ships the automatic League Chaos archive", async () => {
  const [chaos, experience, schema, dashboard] = await Promise.all([
    file("app/lib/chaos.ts"),
    file("app/components/ChaosExperience.tsx"),
    file("db/schema.ts"),
    file("app/components/LeagueDashboard.tsx"),
  ]);

  assert.match(chaos, /24 \* \(scoreA - expectedA\)/);
  assert.match(chaos, /optimalLineupPoints/);
  assert.match(chaos, /buildWeeklyRecaps/);
  assert.match(chaos, /buildDraftReports/);
  assert.match(chaos, /buildTradeAnalyses/);
  assert.match(experience, /THE GAME OF INCHES/);
  assert.match(experience, /The draft report cards/);
  assert.match(experience, /Trade trees & impact verdicts/);
  assert.match(experience, /PUBLIC KEEPER LAB/);
  assert.match(schema, /sleeperWeeklyPlayers/);
  assert.match(schema, /sleeperWeeklyTeams/);
  assert.match(dashboard, /"chaos", "\/chaos", "Chaos"/);
});
