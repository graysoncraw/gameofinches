import { NextResponse } from "next/server";
import { requireDatabase } from "../../../../db";
import { hasCommissionerRequest } from "../../../lib/admin-auth";
import { isSameOrigin } from "../../../lib/request-security";
import {
  deleteCommissionerTransactionEdit,
  saveCommissionerTransactionEdit,
} from "../../../lib/transaction-edits";
import {
  getLeagueData,
  getTransactionFeed,
  type LeagueTransaction,
} from "../../../lib/sleeper";

export const dynamic = "force-dynamic";

type TradeAsset = {
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string;
  fromRosterId: number;
  toRosterId: number;
};

function unauthorized() {
  return NextResponse.json(
    { error: "Commissioner access is required." },
    { status: 403 },
  );
}

function validSeason(value: unknown) {
  const season = String(value ?? "");
  if (!/^20\d{2}$/.test(season)) throw new Error("Season is invalid.");
  return season;
}

function validateAsset(value: unknown, rosterIds: Set<number>): TradeAsset {
  if (!value || typeof value !== "object") {
    throw new Error("Every trade asset needs player and team details.");
  }
  const input = value as Record<string, unknown>;
  const playerId = String(input.playerId ?? "").trim();
  const playerName = String(input.playerName ?? "").trim();
  const fromRosterId = Number(input.fromRosterId);
  const toRosterId = Number(input.toRosterId);
  if (!playerId || !playerName) throw new Error("Select a player to trade.");
  if (!rosterIds.has(fromRosterId) || !rosterIds.has(toRosterId)) {
    throw new Error("A trade team is not part of that season.");
  }
  if (fromRosterId === toRosterId) {
    throw new Error(`${playerName} must move to a different team.`);
  }
  return {
    playerId,
    playerName,
    fromRosterId,
    toRosterId,
    position: String(input.position ?? "").trim().toUpperCase().slice(0, 5),
    nflTeam: String(input.nflTeam ?? "").trim().toUpperCase().slice(0, 4),
  };
}

export async function GET(request: Request) {
  if (!(await hasCommissionerRequest(request))) return unauthorized();
  try {
    const season = validSeason(new URL(request.url).searchParams.get("season"));
    const feed = await getTransactionFeed(season);
    return NextResponse.json({
      season,
      transactions: feed.transactions.filter((item) => item.type === "trade"),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load trades.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await hasCommissionerRequest(request))) return unauthorized();
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const input = (await request.json()) as Record<string, unknown>;
    const season = validSeason(input.season);
    const league = await getLeagueData();
    const seasonData = league.seasons.find((item) => item.year === season);
    if (!seasonData) throw new Error(`No Game of Inches league exists for ${season}.`);

    const teamByRoster = new Map(
      seasonData.teams.map((team) => [team.rosterId, team]),
    );
    const assets = Array.isArray(input.assets)
      ? input.assets.map((asset) =>
          validateAsset(asset, new Set(teamByRoster.keys())),
        )
      : [];
    const duplicate = assets.find(
      (asset, index) =>
        assets.findIndex((item) => item.playerId === asset.playerId) !== index,
    );
    if (duplicate) throw new Error(`${duplicate.playerName} is listed more than once.`);

    const week = Number(input.week);
    if (!Number.isInteger(week) || week < 0 || week > 18) {
      throw new Error("Trade week must be Offseason or Week 1 through 18.");
    }
    const created = Number(input.created);
    if (!Number.isFinite(created) || created <= 0) {
      throw new Error("Trade date is invalid.");
    }

    const existingId = String(input.transactionId ?? "").trim();
    const feed = await getTransactionFeed(season);
    const existing = existingId
      ? feed.transactions.find(
          (item) => item.id === existingId && item.type === "trade",
        )
      : undefined;
    if (existingId && !existing) throw new Error("That trade no longer exists.");
    if (!existing && assets.length === 0) {
      throw new Error("A manual trade needs at least one player.");
    }

    const involved = new Set<number>();
    for (const asset of assets) {
      involved.add(asset.fromRosterId);
      involved.add(asset.toRosterId);
    }
    if (assets.length === 0) {
      for (const side of existing?.teams ?? []) involved.add(side.rosterId);
    }
    for (const pick of existing?.draftPicks ?? []) {
      involved.add(pick.previousOwnerRosterId);
      involved.add(pick.ownerRosterId);
    }
    for (const transfer of existing?.faabTransfers ?? []) {
      involved.add(transfer.senderRosterId);
      involved.add(transfer.receiverRosterId);
    }
    if (involved.size < 2) throw new Error("A trade needs at least two teams.");

    const transactionId = existingId || `manual-${crypto.randomUUID()}`;
    const teams = [...involved]
      .sort((a, b) => a - b)
      .map((rosterId) => {
        const team = teamByRoster.get(rosterId);
        if (!team) throw new Error("A trade team is not part of that season.");
        return {
          rosterId,
          teamName: team.teamName,
          manager: team.manager,
          adds: assets
            .filter((asset) => asset.toRosterId === rosterId)
            .map((asset) => ({
              id: asset.playerId,
              name: asset.playerName,
              position: asset.position,
              nflTeam: asset.nflTeam,
            })),
          drops: assets
            .filter((asset) => asset.fromRosterId === rosterId)
            .map((asset) => ({
              id: asset.playerId,
              name: asset.playerName,
              position: asset.position,
              nflTeam: asset.nflTeam,
            })),
        };
      });
    const transaction: LeagueTransaction = {
      id: transactionId,
      type: "trade",
      source: "commissioner",
      commissionerEdited: Boolean(existing),
      week,
      created,
      waiverBid: null,
      teams,
      draftPicks: existing?.draftPicks ?? [],
      faabTransfers: existing?.faabTransfers ?? [],
    };
    const kind =
      existing?.source === "commissioner" && !existing.commissionerEdited
        ? "manual"
        : existing
          ? "override"
          : "manual";
    await saveCommissionerTransactionEdit(requireDatabase(), {
      transactionId,
      season,
      kind,
      transaction,
    });
    return NextResponse.json({ transaction, kind });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save trade.",
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
  const transactionId = new URL(request.url).searchParams
    .get("transactionId")
    ?.trim();
  if (!transactionId) {
    return NextResponse.json({ error: "Trade ID is required." }, { status: 400 });
  }
  await deleteCommissionerTransactionEdit(requireDatabase(), transactionId);
  return NextResponse.json({ ok: true });
}
