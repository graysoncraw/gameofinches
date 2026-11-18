import assert from "node:assert/strict";
import test from "node:test";
import {
  keeperDeadlineForSeason,
} from "../app/lib/league-dates.ts";

test("2026 keeper deadline is August 17 in Central time", () => {
  const deadline = keeperDeadlineForSeason("2026");
  assert.ok(deadline);
  assert.equal(
    deadline.toLocaleDateString("en-CA", { timeZone: "America/Chicago" }),
    "2026-08-17",
  );
});
