import assert from "node:assert/strict";
import test from "node:test";
import {
  keeperDeadlineForSeason,
  resolveDraftStart,
} from "../app/lib/league-dates.ts";

test("draft schedule prefers Sleeper and falls back to the commissioner time", () => {
  assert.equal(resolveDraftStart("2026", 12345), 12345);
  assert.equal(resolveDraftStart("2026", null), 1788652800000);
  assert.equal(resolveDraftStart("2027", null), null);
});

test("2026 keeper deadline is August 17 in Central time", () => {
  const deadline = keeperDeadlineForSeason("2026");
  assert.ok(deadline);
  assert.equal(
    deadline.toLocaleDateString("en-CA", { timeZone: "America/Chicago" }),
    "2026-08-17",
  );
});
