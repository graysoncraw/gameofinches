import { NextResponse } from "next/server";
import { databaseIsHealthy } from "../../../db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await databaseIsHealthy();
    return NextResponse.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unhealthy" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
