import { getDatabase, type PostgresDatabase } from "../../db";
import {
  buildLeagueChaos,
  CHAOS_SCHEMA_VERSION,
  type WeeklyPlayerFact,
  type WeeklyTeamFact,
} from "./chaos";
import {
  getCommissionerTransactionEdits,
  mergeCommissionerTransactionEdits,
  mergeCommissionerTransactionRecord,
} from "./transaction-edits";
import type { LeagueData, TransactionFeed } from "./league-types";
import type { SleeperLeague, SleeperNFLState } from "./sleeper/types";
import { sleeperFetch } from "./sleeper/client";
import { syncSlot, nextSyncIso } from "./sleeper/schedule";
import {
  buildAllTime,
  buildRivalries,
  buildFinances,
} from "./sleeper/analytics";
import { loadPlayers } from "./sleeper/players";
import { loadSeason } from "./sleeper/season";
import { loadTransactionFeed } from "./sleeper/transactions";
import {
  readSnapshot,
  waitForInitialSnapshot,
  claimSync,
  finishSync,
  saveSnapshot,
  type LeagueSnapshot,
} from "./sleeper/snapshot-store";

import { resolveLeagueWeek, buildWeeklyRecap } from "./weekly-update";
import { createRefreshCache } from "./sleeper/refresh-cache";

const CURRENT_LEAGUE_ID =
  process.env.SLEEPER_LEAGUE_ID || "1380998304963235840";

async function buildSnapshot(
  previous: LeagueSnapshot | null,
  db: PostgresDatabase | null,
): Promise<LeagueSnapshot> {
  const [players, currentLeague, nfl] = await Promise.all([
    loadPlayers(db),
    sleeperFetch<SleeperLeague>(`/league/${CURRENT_LEAGUE_ID}`),
    sleeperFetch<SleeperNFLState>("/state/nfl"),
  ]);
  const context = resolveLeagueWeek(currentLeague, nfl);
  const previousCurrent = previous?.data.seasons.find(
    (season) => season.year === currentLeague.season,
  );
  const isSameLeague =
    previousCurrent?.leagueId === currentLeague.league_id &&
    previous?.schemaVersion === CHAOS_SCHEMA_VERSION &&
    Boolean(previous?.facts?.rosters);

  const leagueChain: SleeperLeague[] = [currentLeague];
  if (!isSameLeague) {
    let previousId = currentLeague.previous_league_id;
    while (previousId && leagueChain.length < 10) {
      const league = await sleeperFetch<SleeperLeague>(`/league/${previousId}`);
      leagueChain.push(league);
      previousId = league.previous_league_id;
    }
  }

  const loads = await Promise.all(
    (isSameLeague ? [currentLeague] : leagueChain).map((league) =>
      loadSeason(league, players, resolveLeagueWeek(league, nfl)),
    ),
  );
  const refreshedCurrent = loads[0];
  const seasons = isSameLeague
    ? [
        refreshedCurrent.season,
        ...(previous?.data.seasons.filter(
          (season) => season.year !== currentLeague.season,
        ) ?? []),
      ]
    : loads.map((load) => load.season);

  const previousGames =
    previous?.data.rivalries
      .flatMap((rivalry) => rivalry.games)
      .filter((game) => game.season !== currentLeague.season) ?? [];
  const games = isSameLeague
    ? [...previousGames, ...refreshedCurrent.matchupGames]
    : loads.flatMap((load) => load.matchupGames);
  const previousPerformances =
    previous?.data.topPerformances.filter(
      (performance) => performance.season !== currentLeague.season,
    ) ?? [];
  const performances = (
    isSameLeague
      ? [...previousPerformances, ...refreshedCurrent.performances]
      : loads.flatMap((load) => load.performances)
  )
    .sort(
      (a, b) =>
        b.points - a.points ||
        Number(b.season) - Number(a.season) ||
        b.week - a.week,
    )
    .slice(0, 10);

  const transactions: Record<string, TransactionFeed> = {
    ...(previous?.transactions ?? {}),
  };
  const leaguesToRefresh = isSameLeague ? [currentLeague] : leagueChain;
  for (const league of leaguesToRefresh) {
    const season = seasons.find((item) => item.year === league.season);
    if (season) {
      transactions[league.season] = await loadTransactionFeed(
        league,
        season.teams,
        players,
      );
    }
  }

  const previousTeamFacts =
    previous?.facts?.teams.filter(
      (fact) => fact.season !== currentLeague.season,
    ) ?? [];
  const previousPlayerFacts =
    previous?.facts?.players.filter(
      (fact) => fact.season !== currentLeague.season,
    ) ?? [];
  const previousRosterFacts =
    previous?.facts?.rosters?.filter(
      (fact) => fact.season !== currentLeague.season,
    ) ?? [];
  const teamFacts = isSameLeague
    ? [...previousTeamFacts, ...refreshedCurrent.teamFacts]
    : loads.flatMap((load) => load.teamFacts);
  const playerFacts = isSameLeague
    ? [...previousPlayerFacts, ...refreshedCurrent.playerFacts]
    : loads.flatMap((load) => load.playerFacts);
  const rosterFacts = isSameLeague
    ? [...previousRosterFacts, ...refreshedCurrent.rosterFacts]
    : loads.flatMap((load) => load.rosterFacts);
  const chaos = buildLeagueChaos({
    seasons,
    games,
    teamFacts,
    playerFacts,
    rosterFacts,
    transactions,
    archiveReady: true,
  });
  const fetchedAt = new Date().toISOString();
  const completed = seasons.filter((season) => season.status === "complete");
  return {
    schemaVersion: CHAOS_SCHEMA_VERSION,
    data: {
      leagueName: currentLeague.name || "Game of Inches",
      fetchedAt,
      nextSyncAt: nextSyncIso(),
      seasons,
      allTime: buildAllTime(seasons),
      completedSeasonCount: completed.length,
      distinctChampionCount: new Set(
        completed.map((season) => season.champion?.userId).filter(Boolean),
      ).size,
      currentSeason: currentLeague.season,
      rivalries: buildRivalries(games),
      topPerformances: performances,
      finances: buildFinances(seasons),
      chaos,
      weekly: {
        context,
        matchups: refreshedCurrent.currentMatchups,
        recap: buildWeeklyRecap(
          context,
          refreshedCurrent.teamFacts,
          refreshedCurrent.playerFacts,
        ),
      },
    },
    transactions,
    facts: {
      teams: teamFacts,
      players: playerFacts,
      rosters: rosterFacts,
    },
  };
}

const getMemorySnapshot = createRefreshCache<LeagueSnapshot>((previous) =>
  buildSnapshot(previous, null),
);
let pendingSnapshot: Promise<LeagueSnapshot> | null = null;

async function getSnapshot(): Promise<LeagueSnapshot> {
  if (pendingSnapshot) return pendingSnapshot;
  pendingSnapshot = refreshSnapshot().finally(() => {
    pendingSnapshot = null;
  });
  return pendingSnapshot;
}

async function refreshSnapshot(): Promise<LeagueSnapshot> {
  const db = getDatabase();
  if (!db) return getMemorySnapshot(syncSlot());
  const cached = await readSnapshot(db);
  const slot = `${syncSlot()}:v${CHAOS_SCHEMA_VERSION}`;
  const claimed = await claimSync(db, slot);
  if (!claimed) {
    if (cached) return cached;
    const initial = await waitForInitialSnapshot(db);
    if (initial) return initial;
    throw new Error("League data is syncing for the first time. Try again.");
  }

  try {
    const fresh = await buildSnapshot(cached, db);
    const fullFactBackfill =
      cached?.schemaVersion !== CHAOS_SCHEMA_VERSION ||
      cached?.data.currentSeason !== fresh.data.currentSeason;
    await saveSnapshot(
      db,
      fresh,
      fullFactBackfill
        ? fresh.data.seasons.map((season) => season.year)
        : [fresh.data.currentSeason],
    );
    await finishSync(db, slot, "success");
    return fresh;
  } catch (error) {
    await finishSync(
      db,
      slot,
      "failed",
      error instanceof Error ? error.message : "Unknown sync failure",
    );
    if (cached) return cached;
    throw error;
  }
}

function addChaosFallback(snapshot: LeagueSnapshot, force = false) {
  if (!force && snapshot.data.chaos?.schemaVersion === CHAOS_SCHEMA_VERSION) {
    return snapshot;
  }
  const games = snapshot.data.rivalries.flatMap((rivalry) => rivalry.games);
  const teamsBySeason = new Map(
    snapshot.data.seasons.flatMap((season) =>
      season.teams.map(
        (team) => [`${season.year}:${team.userId}`, team] as const,
      ),
    ),
  );
  const derivedTeamFacts: WeeklyTeamFact[] = games.flatMap((game, index) => {
    const teamA = teamsBySeason.get(`${game.season}:${game.managerAId}`);
    const teamB = teamsBySeason.get(`${game.season}:${game.managerBId}`);
    return [
      {
        season: game.season,
        week: game.week,
        rosterId: teamA?.rosterId ?? index * 2 + 1,
        userId: game.managerAId,
        manager: game.managerA,
        teamName: game.teamA,
        matchupId: index + 1,
        opponentRosterId: teamB?.rosterId ?? index * 2 + 2,
        opponentId: game.managerBId,
        points: game.pointsA,
        optimalPoints: game.pointsA,
        postseason: game.postseason,
        result:
          game.pointsA === game.pointsB
            ? "tie"
            : game.pointsA > game.pointsB
              ? "win"
              : "loss",
      },
      {
        season: game.season,
        week: game.week,
        rosterId: teamB?.rosterId ?? index * 2 + 2,
        userId: game.managerBId,
        manager: game.managerB,
        teamName: game.teamB,
        matchupId: index + 1,
        opponentRosterId: teamA?.rosterId ?? index * 2 + 1,
        opponentId: game.managerAId,
        points: game.pointsB,
        optimalPoints: game.pointsB,
        postseason: game.postseason,
        result:
          game.pointsA === game.pointsB
            ? "tie"
            : game.pointsB > game.pointsA
              ? "win"
              : "loss",
      },
    ];
  });
  const derivedPlayerFacts: WeeklyPlayerFact[] =
    snapshot.data.topPerformances.map((performance, index) => {
      const team = teamsBySeason.get(
        `${performance.season}:${performance.ownerId}`,
      );
      return {
        season: performance.season,
        week: performance.week,
        rosterId: team?.rosterId ?? index + 1,
        userId: performance.ownerId,
        playerId: performance.playerId,
        playerName: performance.playerName,
        position: performance.position,
        nflTeam: "",
        points: performance.points,
        starter: true,
      };
    });
  const archivedTeamFacts = snapshot.facts?.teams ?? [];
  const archivedPlayerFacts = snapshot.facts?.players ?? [];
  const archivedRosterFacts = snapshot.facts?.rosters ?? [];
  snapshot.data.chaos = buildLeagueChaos({
    seasons: snapshot.data.seasons,
    games,
    teamFacts: archivedTeamFacts.length ? archivedTeamFacts : derivedTeamFacts,
    playerFacts: archivedPlayerFacts.length
      ? archivedPlayerFacts
      : derivedPlayerFacts,
    rosterFacts: archivedRosterFacts,
    transactions: snapshot.transactions,
    archiveReady: Boolean(
      archivedTeamFacts.length &&
      archivedPlayerFacts.length &&
      archivedRosterFacts.length,
    ),
  });
  return snapshot;
}

export async function getLeagueData(): Promise<LeagueData> {
  return (await getCommissionerSnapshot()).data;
}

export async function getTransactionFeed(
  season: string,
): Promise<TransactionFeed> {
  const snapshot = await getSnapshot();
  const feed = snapshot.transactions[season];
  if (!feed) throw new Error(`No Game of Inches league exists for ${season}.`);
  const db = getDatabase();
  if (!db) return feed;
  const edits = await getCommissionerTransactionEdits(db, season);
  return edits.length ? mergeCommissionerTransactionEdits(feed, edits) : feed;
}

async function getCommissionerSnapshot(): Promise<LeagueSnapshot> {
  const snapshot = await getSnapshot();
  const db = getDatabase();
  if (!db) return addChaosFallback(snapshot);

  const edits = await getCommissionerTransactionEdits(db);
  if (!edits.length) return addChaosFallback(snapshot);

  const transactions = mergeCommissionerTransactionRecord(
    snapshot.transactions,
    edits,
  );
  const overlaid: LeagueSnapshot = {
    ...snapshot,
    transactions,
    data: { ...snapshot.data },
  };
  return addChaosFallback(overlaid, true);
}
