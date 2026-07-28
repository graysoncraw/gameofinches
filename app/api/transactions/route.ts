import { NextResponse } from "next/server";
import { getTransactionFeed } from "../../lib/sleeper";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const season = new URL(request.url).searchParams.get("season") ?? "";
  if (!/^20(23|24|25|26)$/.test(season)) {
    return NextResponse.json({ error: "Season is invalid." }, { status: 400 });
  }

  try {
    const feed = await getTransactionFeed(season);
    return NextResponse.json(feed, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=900",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load transactions.",
      },
      { status: 502 },
    );
  }
}
