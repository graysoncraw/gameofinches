import { NextResponse } from "next/server";
import {
  hasCommissionerRequest,
} from "../../../lib/admin-auth";
import { isSameOrigin } from "../../../lib/request-security";
import {
  deleteKeeper,
  getKeeperRecords,
  saveKeeper,
  type KeeperWrite,
} from "../../../lib/keepers";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    { error: "Commissioner access is required." },
    { status: 403 },
  );
}

function validateKeeper(value: unknown): KeeperWrite {
  if (!value || typeof value !== "object") {
    throw new Error("Keeper details are required.");
  }

  const input = value as Record<string, unknown>;
  const season = String(input.season ?? "");
  const rosterId = Number(input.rosterId);
  const slot = Number(input.slot);
  const costRound = Number(input.costRound);
  const yearsRemaining = Number(input.yearsRemaining);
  const acquisitionType = String(input.acquisitionType ?? "draft");

  if (!/^20\d{2}$/.test(season)) throw new Error("Season is invalid.");
  if (!Number.isInteger(rosterId) || rosterId < 1 || rosterId > 20) {
    throw new Error("Roster is invalid.");
  }
  if (slot !== 1 && slot !== 2) throw new Error("Keeper slot is invalid.");
  if (
    !Number.isInteger(costRound) ||
    costRound < 1 ||
    costRound > 19
  ) {
    throw new Error("Keeper cost must be between rounds 1 and 19.");
  }
  if (
    !Number.isInteger(yearsRemaining) ||
    yearsRemaining < 0 ||
    yearsRemaining > 3
  ) {
    throw new Error("Years remaining must be between 0 and 3.");
  }
  if (!["draft", "waiver", "trade"].includes(acquisitionType)) {
    throw new Error("Acquisition type is invalid.");
  }

  const playerName = String(input.playerName ?? "").trim();
  if (!playerName) throw new Error("Player name is required.");

  return {
    season,
    rosterId,
    slot,
    managerName: String(input.managerName ?? "").trim() || "Unknown manager",
    teamName: String(input.teamName ?? "").trim() || "Unknown team",
    playerName,
    position: String(input.position ?? "").trim().toUpperCase().slice(0, 5),
    nflTeam: String(input.nflTeam ?? "").trim().toUpperCase().slice(0, 4),
    costRound,
    yearsRemaining,
    acquisitionType: acquisitionType as KeeperWrite["acquisitionType"],
    notes: String(input.notes ?? "").trim().slice(0, 500),
  };
}

export async function GET(request: Request) {
  if (!(await hasCommissionerRequest(request))) return unauthorized();
  return NextResponse.json({ keepers: await getKeeperRecords() });
}

export async function POST(request: Request) {
  if (!(await hasCommissionerRequest(request))) return unauthorized();
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const keeper = validateKeeper(await request.json());
    const saved = await saveKeeper(keeper, "Commissioner");
    return NextResponse.json({ keeper: saved });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save keeper.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await hasCommissionerRequest(request))) return unauthorized();
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const url = new URL(request.url);
  const season = url.searchParams.get("season") ?? "";
  const rosterId = Number(url.searchParams.get("rosterId"));
  const slot = Number(url.searchParams.get("slot"));
  if (!/^20\d{2}$/.test(season) || !rosterId || ![1, 2].includes(slot)) {
    return NextResponse.json({ error: "Invalid keeper slot." }, { status: 400 });
  }

  await deleteKeeper(season, rosterId, slot);
  return NextResponse.json({ ok: true });
}
