import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

function createClient() {
  if (process.env.DATABASE_URL) {
    return postgres(process.env.DATABASE_URL, { max: 1 });
  }
  if (!process.env.PGHOST) {
    throw new Error(
      "PostgreSQL is not configured. Set DATABASE_URL or the standard PG environment variables.",
    );
  }
  return postgres({
    max: 1,
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE ?? "game_of_inches",
    username: process.env.PGUSER ?? "game_of_inches",
    password: process.env.PGPASSWORD ?? "",
  });
}

const sql = createClient();
const migrationsDirectory = path.resolve("drizzle");

try {
  await sql`
    CREATE TABLE IF NOT EXISTS game_of_inches_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`SELECT pg_advisory_lock(hashtext('game-of-inches-migrations'))`;

  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d+.*\.sql$/.test(file))
    .sort();

  for (const file of files) {
    const [applied] = await sql`
      SELECT name FROM game_of_inches_migrations WHERE name = ${file}
    `;
    if (applied) continue;

    const migration = await readFile(
      path.join(migrationsDirectory, file),
      "utf8",
    );
    const statements = migration
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    await sql.begin(async (transaction) => {
      for (const statement of statements) {
        await transaction.unsafe(statement);
      }
      await transaction`
        INSERT INTO game_of_inches_migrations (name) VALUES (${file})
      `;
    });
    console.log(`Applied database migration ${file}`);
  }
} finally {
  await sql`SELECT pg_advisory_unlock(hashtext('game-of-inches-migrations'))`
    .catch(() => undefined);
  await sql.end();
}
