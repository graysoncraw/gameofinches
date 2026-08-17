import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeCommissionerTransactionEdits,
  type CommissionerTransactionEdit,
} from "../app/lib/transaction-edits.ts";
import type {
  LeagueTransaction,
  TransactionFeed,
} from "../app/lib/sleeper.ts";

function trade(id: string, created: number): LeagueTransaction {
  return {
    id,
    type: "trade",
    source: "sleeper",
    commissionerEdited: false,
    week: 4,
    created,
    waiverBid: null,
    teams: [],
    draftPicks: [],
    faabTransfers: [],
  };
}

const feed: TransactionFeed = {
  season: "2026",
  transactions: [
    trade("sleeper-trade", 100),
    {
      ...trade("waiver", 50),
      type: "waiver",
    },
  ],
  counts: { all: 2, trade: 1, waiver: 1, free_agent: 0 },
};

test("manual commissioner trades merge without replacing Sleeper history", () => {
  const manual = trade("manual-one", 200);
  const edits: CommissionerTransactionEdit[] = [
    {
      transactionId: manual.id,
      season: "2026",
      kind: "manual",
      transaction: manual,
      updatedAt: new Date(0).toISOString(),
    },
  ];
  const merged = mergeCommissionerTransactionEdits(feed, edits);

  assert.deepEqual(
    merged.transactions.map((transaction) => transaction.id),
    ["manual-one", "sleeper-trade", "waiver"],
  );
  assert.equal(merged.transactions[0].source, "commissioner");
  assert.equal(merged.transactions[0].commissionerEdited, false);
  assert.deepEqual(merged.counts, {
    all: 3,
    trade: 2,
    waiver: 1,
    free_agent: 0,
  });
});

test("commissioner overrides replace the matching Sleeper trade", () => {
  const corrected = { ...trade("sleeper-trade", 300), week: 0 };
  const merged = mergeCommissionerTransactionEdits(feed, [
    {
      transactionId: corrected.id,
      season: "2026",
      kind: "override",
      transaction: corrected,
      updatedAt: new Date(0).toISOString(),
    },
  ]);

  assert.equal(merged.transactions.length, 2);
  assert.equal(merged.transactions[0].id, "sleeper-trade");
  assert.equal(merged.transactions[0].week, 0);
  assert.equal(merged.transactions[0].source, "commissioner");
  assert.equal(merged.transactions[0].commissionerEdited, true);
  assert.equal(merged.counts.trade, 1);
});

test("edits from another season do not change the feed", () => {
  const merged = mergeCommissionerTransactionEdits(feed, [
    {
      transactionId: "manual-old",
      season: "2025",
      kind: "manual",
      transaction: trade("manual-old", 500),
      updatedAt: new Date(0).toISOString(),
    },
  ]);
  assert.deepEqual(merged, feed);
});
