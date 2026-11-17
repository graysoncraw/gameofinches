import type { PostgresDatabase } from "../../db";
import type { LeagueTransaction, TransactionFeed } from "./sleeper";

export type CommissionerTransactionEdit = {
  transactionId: string;
  season: string;
  kind: "manual" | "override";
  transaction: LeagueTransaction;
  updatedAt: string;
};

type EditRow = {
  transaction_id: string;
  season: string;
  kind: string;
  data_json: LeagueTransaction | string;
  updated_at: string | Date;
};

function parseTransaction(value: LeagueTransaction | string) {
  return typeof value === "string"
    ? (JSON.parse(value) as LeagueTransaction)
    : value;
}

function rowToEdit(row: EditRow): CommissionerTransactionEdit {
  return {
    transactionId: row.transaction_id,
    season: row.season,
    kind: row.kind === "manual" ? "manual" : "override",
    transaction: parseTransaction(row.data_json),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getCommissionerTransactionEdits(
  db: PostgresDatabase,
  season?: string,
) {
  const query = season
    ? db
        .prepare(
          `SELECT transaction_id, season, kind, data_json, updated_at
           FROM commissioner_transaction_edits
           WHERE season = ?
           ORDER BY updated_at DESC`,
        )
        .bind(season)
    : db.prepare(
        `SELECT transaction_id, season, kind, data_json, updated_at
         FROM commissioner_transaction_edits
         ORDER BY season DESC, updated_at DESC`,
      );
  const { results } = await query.all<EditRow>();
  return results.map(rowToEdit);
}

export async function saveCommissionerTransactionEdit(
  db: PostgresDatabase,
  edit: Omit<CommissionerTransactionEdit, "updatedAt">,
) {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO commissioner_transaction_edits
         (transaction_id, season, kind, data_json, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?::jsonb, 'Commissioner', ?, ?)
       ON CONFLICT(transaction_id) DO UPDATE SET
         season = excluded.season,
         kind = excluded.kind,
         data_json = excluded.data_json,
         updated_by = 'Commissioner',
         updated_at = excluded.updated_at`,
    )
    .bind(
      edit.transactionId,
      edit.season,
      edit.kind,
      JSON.stringify(edit.transaction),
      now,
      now,
    )
    .run();
  return { ...edit, updatedAt: now } satisfies CommissionerTransactionEdit;
}

export async function deleteCommissionerTransactionEdit(
  db: PostgresDatabase,
  transactionId: string,
) {
  await db
    .prepare(
      "DELETE FROM commissioner_transaction_edits WHERE transaction_id = ?",
    )
    .bind(transactionId)
    .run();
}

function counts(transactions: LeagueTransaction[]) {
  return {
    all: transactions.length,
    trade: transactions.filter((item) => item.type === "trade").length,
    waiver: transactions.filter((item) => item.type === "waiver").length,
    free_agent: transactions.filter((item) => item.type === "free_agent")
      .length,
  };
}

export function mergeCommissionerTransactionEdits(
  feed: TransactionFeed,
  edits: CommissionerTransactionEdit[],
): TransactionFeed {
  const byId = new Map(feed.transactions.map((item) => [item.id, item]));
  for (const edit of edits) {
    if (edit.season !== feed.season) continue;
    const existedInSleeper = byId.has(edit.transactionId);
    byId.set(edit.transactionId, {
      ...edit.transaction,
      id: edit.transactionId,
      type: "trade",
      source: "commissioner",
      commissionerEdited: edit.kind === "override" || existedInSleeper,
    });
  }
  const transactions = [...byId.values()].sort(
    (a, b) => b.created - a.created || a.id.localeCompare(b.id),
  );
  return { season: feed.season, transactions, counts: counts(transactions) };
}

export function mergeCommissionerTransactionRecord(
  feeds: Record<string, TransactionFeed>,
  edits: CommissionerTransactionEdit[],
) {
  const merged = { ...feeds };
  for (const season of new Set(edits.map((edit) => edit.season))) {
    const feed = merged[season];
    if (feed) {
      merged[season] = mergeCommissionerTransactionEdits(feed, edits);
    }
  }
  return merged;
}
