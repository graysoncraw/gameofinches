import assert from "node:assert/strict";
import test from "node:test";
import { syncSlot, nextSyncIso } from "../app/lib/sleeper/schedule.ts";

test("Central sync slots switch at 6 AM and 6 PM, including the previous evening", () => {
  assert.match(syncSlot(new Date("2026-11-17T11:59:59Z")), /^2026-11-16T18/);
  assert.match(syncSlot(new Date("2026-11-17T12:00:00Z")), /^2026-11-17T06/);
  assert.match(syncSlot(new Date("2026-11-18T00:00:00Z")), /^2026-11-17T18/);
});

test("next refresh remains at 6 AM Central across daylight saving transitions", () => {
  for (const time of ["2026-03-08T05:00:00Z", "2026-11-01T04:00:00Z"]) {
    const next = new Date(nextSyncIso(new Date(time)));
    const hour = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      hourCycle: "h23",
    }).format(next);
    assert.equal(hour, "06");
  }
});
