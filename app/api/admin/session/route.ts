import { NextResponse } from "next/server";
import {
  COMMISSIONER_COOKIE,
  COMMISSIONER_SESSION_SECONDS,
  createCommissionerSession,
  isSameOrigin,
  loginRateLimit,
  recordLoginAttempt,
  verifyCommissionerPassword,
} from "../../../lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const limit = await loginRateLimit(request);
  if (limit.blocked) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter) },
      },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    password?: unknown;
  } | null;
  const valid = await verifyCommissionerPassword(String(body?.password ?? ""));
  await recordLoginAttempt(request, valid);
  if (!valid) {
    return NextResponse.json(
      { error: "That commissioner password is not correct." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COMMISSIONER_COOKIE, await createCommissionerSession(), {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: COMMISSIONER_SESSION_SECONDS,
  });
  return response;
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COMMISSIONER_COOKIE, "", {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
