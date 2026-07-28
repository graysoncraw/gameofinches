import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

export const COMMISSIONER_COOKIE = "goi_commissioner";
export const COMMISSIONER_SESSION_SECONDS = 30 * 24 * 60 * 60;
const FALLBACK_PASSWORD_HASH =
  "c61e10f2fee1152bf133601f0cf9366f178e346c9606d0c2a9278453bef7ce3c";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;

function environmentValue(key: string) {
  try {
    return (
      (env as unknown as Record<string, string | undefined>)[key] ??
      process.env[key] ??
      ""
    );
  } catch {
    return process.env[key] ?? "";
  }
}

function sessionSecret() {
  const configured = environmentValue("COMMISSIONER_SESSION_SECRET");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Commissioner session security is not configured.");
  }
  return "game-of-inches-local-session-secret";
}

function getD1(): D1Database | null {
  try {
    return (env as unknown as { DB?: D1Database }).DB ?? null;
  } catch {
    return null;
  }
}

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(value: string) {
  return bytesToHex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
  );
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export async function verifyCommissionerPassword(password: string) {
  const configured = environmentValue("COMMISSIONER_PASSWORD_HASH");
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("Commissioner password security is not configured.");
  }
  const expected = configured || FALLBACK_PASSWORD_HASH;
  return safeEqual(await sha256(password), expected.toLowerCase());
}

export async function createCommissionerSession() {
  const expiresAt = Date.now() + COMMISSIONER_SESSION_SECONDS * 1000;
  const payload = String(expiresAt);
  return `${payload}.${await sign(payload)}`;
}

export async function verifyCommissionerSession(token: string | undefined) {
  if (!token) return false;
  const [expiresAt, signature, extra] = token.split(".");
  if (!expiresAt || !signature || extra || Number(expiresAt) <= Date.now()) {
    return false;
  }
  return safeEqual(signature, await sign(expiresAt));
}

export async function hasCommissionerSession() {
  const store = await cookies();
  return verifyCommissionerSession(store.get(COMMISSIONER_COOKIE)?.value);
}

function cookieFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const entry of cookie.split(";")) {
    const [name, ...value] = entry.trim().split("=");
    if (name === COMMISSIONER_COOKIE) {
      return decodeURIComponent(value.join("="));
    }
  }
  return undefined;
}

export async function hasCommissionerRequest(request: Request) {
  return verifyCommissionerSession(cookieFromRequest(request));
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

async function ensureAttemptSchema(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS admin_login_attempts (
        fingerprint TEXT PRIMARY KEY,
        window_started_at INTEGER NOT NULL,
        failures INTEGER NOT NULL DEFAULT 0,
        blocked_until INTEGER NOT NULL DEFAULT 0
      )`,
    )
    .run();
}

async function fingerprint(request: Request) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local";
  return sha256(`${ip}:${sessionSecret()}`);
}

export async function loginRateLimit(request: Request) {
  const db = getD1();
  if (!db) return { blocked: false, retryAfter: 0 };
  await ensureAttemptSchema(db);
  const row = await db
    .prepare(
      `SELECT blocked_until FROM admin_login_attempts WHERE fingerprint = ?`,
    )
    .bind(await fingerprint(request))
    .first<{ blocked_until: number }>();
  const retryAfter = Math.max(
    0,
    Math.ceil(((row?.blocked_until ?? 0) - Date.now()) / 1000),
  );
  return { blocked: retryAfter > 0, retryAfter };
}

export async function recordLoginAttempt(
  request: Request,
  succeeded: boolean,
) {
  const db = getD1();
  if (!db) return;
  await ensureAttemptSchema(db);
  const key = await fingerprint(request);
  if (succeeded) {
    await db
      .prepare("DELETE FROM admin_login_attempts WHERE fingerprint = ?")
      .bind(key)
      .run();
    return;
  }

  const now = Date.now();
  const row = await db
    .prepare(
      `SELECT window_started_at, failures
       FROM admin_login_attempts WHERE fingerprint = ?`,
    )
    .bind(key)
    .first<{ window_started_at: number; failures: number }>();
  const inWindow = row && now - row.window_started_at < LOGIN_WINDOW_MS;
  const failures = inWindow ? row.failures + 1 : 1;
  const windowStartedAt = inWindow ? row.window_started_at : now;
  const blockedUntil =
    failures >= MAX_LOGIN_FAILURES ? now + LOGIN_WINDOW_MS : 0;

  await db
    .prepare(
      `INSERT INTO admin_login_attempts
       (fingerprint, window_started_at, failures, blocked_until)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(fingerprint) DO UPDATE SET
         window_started_at = excluded.window_started_at,
         failures = excluded.failures,
         blocked_until = excluded.blocked_until`,
    )
    .bind(key, windowStartedAt, failures, blockedUntil)
    .run();
}
