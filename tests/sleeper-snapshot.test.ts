import assert from "node:assert/strict";
import test from "node:test";
import { saveSnapshot } from "../app/lib/sleeper/snapshot-store.ts";
import type { LeagueSnapshot } from "../app/lib/sleeper/snapshot-store.ts";
import type { PostgresDatabase } from "../db/index.ts";

test("facts and their snapshot are saved in one transaction without deleting archived seasons", async () => {
  const batches: Array<Array<{ sql: string; values: unknown[] }>> = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return { sql, values };
        },
      };
    },
    async batch(statements: Array<{ sql: string; values: unknown[] }>) {
      batches.push(statements);
    },
  } as unknown as PostgresDatabase;
  const snapshot = {
    schemaVersion: 11,
    data: { fetchedAt: "2026-11-17T12:00:00Z" },
    facts: { teams: [], players: [], rosters: [] },
    transactions: {},
  } as unknown as LeagueSnapshot;
  await saveSnapshot(db, snapshot, ["2026"]);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 3);
  assert.deepEqual(
    batches[0].slice(0, 2).map((statement) => statement.values),
    [["2026"], ["2026"]],
  );
  assert.match(batches[0].at(-1)!.sql, /INSERT INTO sleeper_snapshots/);
});
