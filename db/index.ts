import postgres from "postgres";

type SqlClient = ReturnType<typeof postgres>;
type QueryResult<T> = T[] & { count: number };
type QueryExecutor = {
  unsafe: (
    query: string,
    parameters?: readonly unknown[],
  ) => Promise<QueryResult<Record<string, unknown>>>;
};

const globalDatabase = globalThis as typeof globalThis & {
  gameOfInchesPostgres?: SqlClient;
};

function postgresQuery(query: string) {
  let index = 0;
  return query.replace(/\?/g, () => `$${(index += 1)}`);
}

export class PreparedQuery {
  constructor(
    private readonly client: SqlClient,
    private readonly query: string,
    private readonly parameters: readonly unknown[] = [],
  ) {}

  bind(...parameters: unknown[]) {
    return new PreparedQuery(this.client, this.query, parameters);
  }

  async executeWith(executor: QueryExecutor = this.client as QueryExecutor) {
    return executor.unsafe(postgresQuery(this.query), this.parameters);
  }

  async first<T extends Record<string, unknown>>() {
    const rows = await this.executeWith();
    return (rows[0] as T | undefined) ?? null;
  }

  async all<T extends Record<string, unknown>>() {
    const rows = await this.executeWith();
    return { results: rows as T[] };
  }

  async run() {
    const rows = await this.executeWith();
    return { meta: { changes: rows.count } };
  }
}

export class PostgresDatabase {
  constructor(readonly sql: SqlClient) {}

  prepare(query: string) {
    return new PreparedQuery(this.sql, query);
  }

  async batch(statements: PreparedQuery[]) {
    return this.sql.begin(async (transaction) => {
      const results = [];
      for (const statement of statements) {
        const rows = await statement.executeWith(
          transaction as unknown as QueryExecutor,
        );
        results.push({ meta: { changes: rows.count } });
      }
      return results;
    });
  }
}

export function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  const databaseHost = process.env.PGHOST;
  if (!databaseUrl && !databaseHost) return null;

  if (!globalDatabase.gameOfInchesPostgres) {
    const options = {
      max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
      idle_timeout: 20,
      connect_timeout: 10,
    };
    globalDatabase.gameOfInchesPostgres = databaseUrl
      ? postgres(databaseUrl, options)
      : postgres({
          ...options,
          host: databaseHost,
          port: Number(process.env.PGPORT ?? 5432),
          database: process.env.PGDATABASE ?? "game_of_inches",
          username: process.env.PGUSER ?? "game_of_inches",
          password: process.env.PGPASSWORD ?? "",
        });
  }

  return new PostgresDatabase(globalDatabase.gameOfInchesPostgres);
}

export function requireDatabase() {
  const database = getDatabase();
  if (!database) {
    throw new Error(
      "PostgreSQL is not configured. Set DATABASE_URL or the standard PG environment variables.",
    );
  }
  return database;
}

export async function databaseIsHealthy() {
  await requireDatabase().prepare("SELECT 1 AS ok").first();
  return true;
}
