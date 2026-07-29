import { getDatabase, type PostgresDatabase } from "../../db";
import {
  buildLeagueChaos,
  CHAOS_SCHEMA_VERSION,
  optimalLineupPoints,
  type LeagueChaos,
  type WeeklyPlayerFact,
  type WeeklyTeamFact,
} from "./chaos";

const SLEEPER_API = "https://api.sleeper.app/v1";
const CURRENT_LEAGUE_ID = "1380998304963235840";
const SNAPSHOT_KEY = "game-of-inches";
const SYNC_RETRY_MS = 15 * 60 * 1000;

type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  status: string;
  previous_league_id: string | null;
  total_rosters: number;
  avatar: string | null;
  settings: Record<string, number>;
  scoring_settings: Record<string, number>;
  roster_positions: string[];
};

type SleeperUser = {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar: string | null;
  is_owner?: boolean;
  metadata?: { team_name?: string };
};

type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  players: string[] | null;
  settings: Record<string, number>;
};

type SleeperDraft = {
  draft_id: string;
  status: string;
  type: string;
  season: string;
  start_time: number | null;
  settings: Record<string, number>;
};

type SleeperPick = {
  pick_no: number;
  round: number;
  draft_slot: number;
  roster_id: number;
  player_id: string;
  is_keeper: boolean | number | null;
  metadata?: {
    first_name?: string;
    last_name?: string;
    position?: string;
    team?: string;
  };
};

type BracketMatch = {
  r: number;
  m: number;
  p?: number;
  t1?: number | Record<string, number> | null;
  t2?: number | Record<string, number> | null;
  w?: number | null;
  l?: number | null;
};

type SleeperMatchup = {
  roster_id: number;
  matchup_id: number | null;
  points: number | null;
  custom_points: number | null;
  starters: string[] | null;
  players: string[] | null;
  players_points?: Record<string, number>;
};

type SleeperTransaction = {
  type: "trade" | "waiver" | "free_agent";
  transaction_id: string;
  status: string;
  leg: number;
  created: number;
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  settings: { waiver_bid?: number } | null;
  draft_picks: Array<{
    season: string;
    round: number;
    roster_id: number;
    previous_owner_id: number;
    owner_id: number;
  }>;
  waiver_budget: Array<{
    sender: number;
    receiver: number;
    amount: number;
  }>;
};

type PlayerLabel = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
};

export type Team = {
  rosterId: number;
  userId: string;
  manager: string;
  username: string | null;
  teamName: string;
  avatar: string | null;
  commissioner: boolean;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  potentialPoints: number;
  waiverBudgetUsed: number;
  waiverPosition: number;
  playerCount: number;
};

export type DraftPick = {
  pickNo: number;
  round: number;
  draftSlot: number;
  rosterId: number;
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string;
  teamName: string;
  manager: string;
  isKeeper: boolean;
};

export type PlayoffMatchup = {
  season: string;
  week: number;
  round: number;
  matchId: number;
  bracket: "championship" | "consolation";
  placement: number | null;
  stage: string;
  winner: {
    rosterId: number;
    userId: string;
    manager: string;
    teamName: string;
    points: number;
  };
  loser: {
    rosterId: number;
    userId: string;
    manager: string;
    teamName: string;
    points: number;
  };
};

export type Season = {
  leagueId: string;
  year: string;
  status: string;
  teams: Team[];
  champion: Team | null;
  runnerUp: Team | null;
  thirdPlace: Team | null;
  playoffs?: PlayoffMatchup[];
  draft: {
    id: string;
    status: string;
    type: string;
    rounds: number;
    startTime: number | null;
    picks: DraftPick[];
  } | null;
  settings: {
    maxKeepers: number;
    playoffTeams: number;
    playoffWeekStart: number;
    waiverBudget: number;
    tradeDeadline: number;
    rosterPositions: string[];
    receptionPoints: number;
  };
};

export type AllTimeManager = {
  userId: string;
  manager: string;
  currentTeamName: string;
  avatar: string | null;
  seasons: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  titles: number;
  titleYears: string[];
};

export type RivalryGame = {
  season: string;
  week: number;
  postseason: boolean;
  managerAId: string;
  managerBId: string;
  managerA: string;
  managerB: string;
  teamA: string;
  teamB: string;
  pointsA: number;
  pointsB: number;
  winnerId: string | null;
};

export type Rivalry = {
  id: string;
  managerA: { userId: string; manager: string; teamName: string };
  managerB: { userId: string; manager: string; teamName: string };
  winsA: number;
  winsB: number;
  ties: number;
  pointsA: number;
  pointsB: number;
  games: RivalryGame[];
};

export type PlayerPerformance = {
  playerId: string;
  playerName: string;
  position: string;
  points: number;
  season: string;
  week: number;
  postseason: boolean;
  ownerId: string;
  owner: string;
  teamName: string;
  opponent: string;
  opponentTeam: string;
};

export type FinancialManager = {
  userId: string;
  manager: string;
  teamName: string;
  buyIns: number;
  winnings: number;
  net: number;
};

export type FinancialSeason = {
  year: string;
  status: "settled" | "pending";
  buyIn: number;
  prizePool: number;
  first: number;
  second: number;
  third: number;
  winner: string | null;
  runnerUp: string | null;
  thirdPlace: string | null;
};

export type LeagueData = {
  leagueName: string;
  fetchedAt: string;
  nextSyncAt: string;
  seasons: Season[];
  allTime: AllTimeManager[];
  completedSeasonCount: number;
  distinctChampionCount: number;
  currentSeason: string;
  rivalries: Rivalry[];
  topPerformances: PlayerPerformance[];
  finances: {
    managers: FinancialManager[];
    seasons: FinancialSeason[];
  };
  chaos: LeagueChaos;
};

export type LeagueTransaction = {
  id: string;
  type: "trade" | "waiver" | "free_agent";
  week: number;
  created: number;
  waiverBid: number | null;
  teams: Array<{
    rosterId: number;
    teamName: string;
    manager: string;
    adds: Array<{ id: string; name: string; position: string; nflTeam: string }>;
    drops: Array<{ id: string; name: string; position: string; nflTeam: string }>;
  }>;
  draftPicks: Array<{
    season: string;
    round: number;
    from: string;
    to: string;
    originalRosterId: number;
    previousOwnerRosterId: number;
    ownerRosterId: number;
  }>;
  faabTransfers: Array<{
    amount: number;
    from: string;
    to: string;
    senderRosterId: number;
    receiverRosterId: number;
  }>;
};

export type TransactionFeed = {
  season: string;
  transactions: LeagueTransaction[];
  counts: {
    all: number;
    trade: number;
    waiver: number;
    free_agent: number;
  };
};

type SeasonLoad = {
  season: Season;
  matchupGames: RivalryGame[];
  performances: PlayerPerformance[];
  teamFacts: WeeklyTeamFact[];
  playerFacts: WeeklyPlayerFact[];
  rosterFacts: WeeklyPlayerFact[];
};

type LeagueSnapshot = {
  schemaVersion: number;
  data: LeagueData;
  transactions: Record<string, TransactionFeed>;
  facts: {
    teams: WeeklyTeamFact[];
    players: WeeklyPlayerFact[];
    rosters?: WeeklyPlayerFact[];
  };
};

let activeSleeperRequests = 0;
const sleeperWaiters: Array<() => void> = [];

async function claimSleeperSlot() {
  if (activeSleeperRequests >= 4) {
    await new Promise<void>((resolve) => sleeperWaiters.push(resolve));
  }
  activeSleeperRequests += 1;
}

function releaseSleeperSlot() {
  activeSleeperRequests -= 1;
  sleeperWaiters.shift()?.();
}

async function sleeperFetch<T>(path: string): Promise<T> {
  await claimSleeperSlot();
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${SLEEPER_API}${path}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (response.ok) return response.json() as Promise<T>;
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) {
        throw new Error(`Sleeper returned ${response.status} for ${path}`);
      }
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      const delay = retryAfter
        ? Math.min(retryAfter * 1000, 10_000)
        : 500 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new Error(`Sleeper did not answer ${path}`);
  } finally {
    releaseSleeperSlot();
  }
}

function chicagoParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function syncSlot(date = new Date()) {
  let parts = chicagoParts(date);
  let hour = Number(parts.hour);
  if (hour < 6) {
    parts = chicagoParts(new Date(date.getTime() - 12 * 60 * 60 * 1000));
    hour = 18;
  }
  const window = hour >= 18 ? "18" : "06";
  return `${parts.year}-${parts.month}-${parts.day}T${window}:00:00-America/Chicago`;
}

function nextSyncIso(date = new Date()) {
  const parts = chicagoParts(date);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);
  const targetHour = hour < 6 ? 6 : hour < 18 ? 18 : 30;
  const millisecondsUntil =
    ((targetHour - hour) * 60 - minute) * 60 * 1000 - second * 1000;
  return new Date(date.getTime() + millisecondsUntil).toISOString();
}

function chicagoDate(date = new Date()) {
  const parts = chicagoParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function storedJson<T>(value: string | T): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

async function readSnapshot(
  db: PostgresDatabase,
): Promise<LeagueSnapshot | null> {
  const row = await db
    .prepare("SELECT data_json FROM sleeper_snapshots WHERE snapshot_key = ?")
    .bind(SNAPSHOT_KEY)
    .first<{ data_json: LeagueSnapshot | string }>();
  return row ? storedJson<LeagueSnapshot>(row.data_json) : null;
}

async function waitForInitialSnapshot(db: PostgresDatabase) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const snapshot = await readSnapshot(db);
    if (snapshot) return snapshot;
  }
  return null;
}

async function claimSync(db: PostgresDatabase, slot: string) {
  const now = new Date().toISOString();
  const inserted = await db
    .prepare(
      `INSERT INTO sleeper_sync_runs
       (slot_key, status, updated_at, error) VALUES (?, 'running', ?, '')
       ON CONFLICT (slot_key) DO NOTHING`,
    )
    .bind(slot, now)
    .run();
  if ((inserted.meta.changes ?? 0) > 0) return true;

  const retryBefore = new Date(Date.now() - SYNC_RETRY_MS).toISOString();
  const retried = await db
    .prepare(
      `UPDATE sleeper_sync_runs
       SET status = 'running', updated_at = ?, error = ''
       WHERE slot_key = ? AND status = 'failed' AND updated_at <= ?`,
    )
    .bind(now, slot, retryBefore)
    .run();
  return (retried.meta.changes ?? 0) > 0;
}

async function finishSync(
  db: PostgresDatabase,
  slot: string,
  status: "success" | "failed",
  error = "",
) {
  await db
    .prepare(
      `UPDATE sleeper_sync_runs
       SET status = ?, updated_at = ?, error = ? WHERE slot_key = ?`,
    )
    .bind(status, new Date().toISOString(), error.slice(0, 500), slot)
    .run();
}

async function persistFacts(
  db: PostgresDatabase,
  facts: LeagueSnapshot["facts"],
  seasons: string[],
) {
  for (const season of seasons) {
    await db.batch([
      db
        .prepare("DELETE FROM sleeper_weekly_teams WHERE season = ?")
        .bind(season),
      db
        .prepare("DELETE FROM sleeper_weekly_players WHERE season = ?")
        .bind(season),
    ]);
  }

  const teamStatements = facts.teams
    .filter((fact) => seasons.includes(fact.season))
    .map((fact) =>
      db
        .prepare(
          `INSERT INTO sleeper_weekly_teams (
            season, week, roster_id, user_id, manager, team_name, matchup_id,
            opponent_roster_id, opponent_id, points, optimal_points,
            postseason, result
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          fact.season,
          fact.week,
          fact.rosterId,
          fact.userId,
          fact.manager,
          fact.teamName,
          fact.matchupId,
          fact.opponentRosterId,
          fact.opponentId,
          fact.points,
          fact.optimalPoints,
          fact.postseason,
          fact.result,
        ),
    );
  const playerStatements = facts.players
    .filter((fact) => seasons.includes(fact.season))
    .map((fact) =>
      db
        .prepare(
          `INSERT INTO sleeper_weekly_players (
            season, week, roster_id, user_id, player_id, player_name,
            position, nfl_team, points, starter
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          fact.season,
          fact.week,
          fact.rosterId,
          fact.userId,
          fact.playerId,
          fact.playerName,
          fact.position,
          fact.nflTeam,
          fact.points,
          fact.starter,
        ),
    );
  for (let index = 0; index < teamStatements.length; index += 75) {
    await db.batch(teamStatements.slice(index, index + 75));
  }
  for (let index = 0; index < playerStatements.length; index += 75) {
    await db.batch(playerStatements.slice(index, index + 75));
  }
}

async function loadPlayers(db: PostgresDatabase | null) {
  const today = chicagoDate();
  if (db) {
    const cached = await db
      .prepare(
        `SELECT data_json, fetched_date::text AS fetched_date
         FROM sleeper_player_cache
         WHERE cache_key = 'nfl'`,
      )
      .first<{
        data_json: Record<string, PlayerLabel> | string;
        fetched_date: string;
      }>();
    if (cached?.fetched_date === today) {
      return storedJson<Record<string, PlayerLabel>>(cached.data_json);
    }
  }

  const raw = await sleeperFetch<Record<string, PlayerLabel>>("/players/nfl");
  const players = Object.fromEntries(
    Object.entries(raw).map(([id, player]) => [
      id,
      {
        full_name: player.full_name,
        first_name: player.first_name,
        last_name: player.last_name,
        position: player.position,
        team: player.team,
      },
    ]),
  );

  if (db) {
    await db
      .prepare(
        `INSERT INTO sleeper_player_cache
         (cache_key, data_json, fetched_date, updated_at)
         VALUES ('nfl', ?::jsonb, ?, ?)
         ON CONFLICT(cache_key) DO UPDATE SET
           data_json = excluded.data_json,
           fetched_date = excluded.fetched_date,
           updated_at = excluded.updated_at`,
      )
      .bind(JSON.stringify(players), today, new Date().toISOString())
      .run();
  }
  return players;
}

function points(settings: Record<string, number>, key: string) {
  return (settings[key] ?? 0) + (settings[`${key}_decimal`] ?? 0) / 100;
}

function playerLabel(
  playerId: string,
  players: Record<string, PlayerLabel>,
) {
  const player = players[playerId];
  return {
    id: playerId,
    name:
      player?.full_name ||
      [player?.first_name, player?.last_name].filter(Boolean).join(" ") ||
      playerId,
    position: player?.position ?? (playerId.length <= 3 ? "DEF" : ""),
    nflTeam: player?.team ?? (playerId.length <= 3 ? playerId : ""),
  };
}

async function loadSeason(
  league: SleeperLeague,
  players: Record<string, PlayerLabel>,
): Promise<SeasonLoad> {
  const [
    users,
    rosters,
    drafts,
    winnersBracket,
    losersBracket,
    weeklyMatchups,
  ] = await Promise.all([
    sleeperFetch<SleeperUser[]>(`/league/${league.league_id}/users`),
    sleeperFetch<SleeperRoster[]>(`/league/${league.league_id}/rosters`),
    sleeperFetch<SleeperDraft[]>(`/league/${league.league_id}/drafts`),
    sleeperFetch<BracketMatch[]>(`/league/${league.league_id}/winners_bracket`),
    sleeperFetch<BracketMatch[]>(`/league/${league.league_id}/losers_bracket`),
    Promise.all(
      Array.from({ length: 18 }, (_, index) =>
        sleeperFetch<SleeperMatchup[]>(
          `/league/${league.league_id}/matchups/${index + 1}`,
        ),
      ),
    ),
  ]);

  const usersById = new Map(users.map((user) => [user.user_id, user]));
  const teams: Team[] = rosters.map((roster) => {
    const user = usersById.get(roster.owner_id);
    const manager = user?.display_name ?? "Vacant";
    return {
      rosterId: roster.roster_id,
      userId: roster.owner_id,
      manager,
      username: user?.username ?? null,
      teamName: user?.metadata?.team_name || `${manager}'s Team`,
      avatar: user?.avatar ?? null,
      commissioner: Boolean(user?.is_owner),
      wins: roster.settings.wins ?? 0,
      losses: roster.settings.losses ?? 0,
      ties: roster.settings.ties ?? 0,
      pointsFor: points(roster.settings, "fpts"),
      pointsAgainst: points(roster.settings, "fpts_against"),
      potentialPoints: points(roster.settings, "ppts"),
      waiverBudgetUsed: roster.settings.waiver_budget_used ?? 0,
      waiverPosition: roster.settings.waiver_position ?? 0,
      playerCount: roster.players?.length ?? 0,
    };
  });

  const primaryDraft = drafts[0] ?? null;
  const picks = primaryDraft
    ? await sleeperFetch<SleeperPick[]>(`/draft/${primaryDraft.draft_id}/picks`)
    : [];
  const teamByRosterId = new Map(teams.map((team) => [team.rosterId, team]));
  const championship = [...winnersBracket]
    .filter((match) => match.p === 1)
    .sort((a, b) => b.r - a.r)[0];
  const thirdPlace = [...winnersBracket]
    .filter((match) => match.p === 3)
    .sort((a, b) => b.r - a.r)[0];

  const matchupGames: RivalryGame[] = [];
  const performances: PlayerPerformance[] = [];
  const teamFacts: WeeklyTeamFact[] = [];
  const playerFacts: WeeklyPlayerFact[] = [];
  weeklyMatchups.forEach((matchups, weekIndex) => {
    const week = weekIndex + 1;
    const groups = new Map<number, SleeperMatchup[]>();
    for (const matchup of matchups) {
      if (matchup.matchup_id === null) continue;
      const group = groups.get(matchup.matchup_id) ?? [];
      group.push(matchup);
      groups.set(matchup.matchup_id, group);
    }

    for (const pair of groups.values()) {
      if (pair.length !== 2) continue;
      const [first, second] = pair;
      const teamA = teamByRosterId.get(first.roster_id);
      const teamB = teamByRosterId.get(second.roster_id);
      if (!teamA || !teamB) continue;
      const pointsA = Number(first.custom_points ?? first.points ?? 0);
      const pointsB = Number(second.custom_points ?? second.points ?? 0);
      const ordered =
        teamA.userId.localeCompare(teamB.userId) <= 0
          ? { first, second, teamA, teamB, pointsA, pointsB }
          : {
              first: second,
              second: first,
              teamA: teamB,
              teamB: teamA,
              pointsA: pointsB,
              pointsB: pointsA,
            };

      matchupGames.push({
        season: league.season,
        week,
        postseason: week >= (league.settings.playoff_week_start ?? 99),
        managerAId: ordered.teamA.userId,
        managerBId: ordered.teamB.userId,
        managerA: ordered.teamA.manager,
        managerB: ordered.teamB.manager,
        teamA: ordered.teamA.teamName,
        teamB: ordered.teamB.teamName,
        pointsA: ordered.pointsA,
        pointsB: ordered.pointsB,
        winnerId:
          ordered.pointsA === ordered.pointsB
            ? null
            : ordered.pointsA > ordered.pointsB
              ? ordered.teamA.userId
              : ordered.teamB.userId,
      });

      for (const [matchup, owner, opponent] of [
        [first, teamA, teamB],
        [second, teamB, teamA],
      ] as Array<[SleeperMatchup, Team, Team]>) {
        const rosteredPlayers =
          matchup.players ?? Object.keys(matchup.players_points ?? {});
        const weeklyPlayers = rosteredPlayers.map((playerId) => {
          const label = playerLabel(playerId, players);
          return {
            season: league.season,
            week,
            rosterId: owner.rosterId,
            userId: owner.userId,
            playerId,
            playerName: label.name,
            position: label.position,
            nflTeam: label.nflTeam,
            points: Number(matchup.players_points?.[playerId] ?? 0),
            starter: (matchup.starters ?? []).includes(playerId),
          };
        });
        playerFacts.push(...weeklyPlayers);
        const ownerPoints = Number(
          matchup.custom_points ?? matchup.points ?? 0,
        );
        const opponentMatchup = matchup === first ? second : first;
        const opponentPoints = Number(
          opponentMatchup.custom_points ?? opponentMatchup.points ?? 0,
        );
        teamFacts.push({
          season: league.season,
          week,
          rosterId: owner.rosterId,
          userId: owner.userId,
          manager: owner.manager,
          teamName: owner.teamName,
          matchupId: matchup.matchup_id ?? 0,
          opponentRosterId: opponent.rosterId,
          opponentId: opponent.userId,
          points: ownerPoints,
          optimalPoints: optimalLineupPoints(
            league.roster_positions,
            weeklyPlayers,
          ),
          postseason: week >= (league.settings.playoff_week_start ?? 99),
          result:
            ownerPoints === opponentPoints
              ? "tie"
              : ownerPoints > opponentPoints
                ? "win"
                : "loss",
        });
        for (const playerId of matchup.starters ?? []) {
          const label = playerLabel(playerId, players);
          performances.push({
            playerId,
            playerName: label.name,
            position: label.position,
            points: Number(matchup.players_points?.[playerId] ?? 0),
            season: league.season,
            week,
            postseason: week >= (league.settings.playoff_week_start ?? 99),
            ownerId: owner.userId,
            owner: owner.manager,
            teamName: owner.teamName,
            opponent: opponent.manager,
            opponentTeam: opponent.teamName,
          });
        }
      }
    }
  });
  const rosterFacts: WeeklyPlayerFact[] = rosters.flatMap((roster) => {
    const owner = teamByRosterId.get(roster.roster_id);
    if (!owner) return [];
    return (roster.players ?? []).map((playerId) => {
      const label = playerLabel(playerId, players);
      return {
        season: league.season,
        week: 0,
        rosterId: owner.rosterId,
        userId: owner.userId,
        playerId,
        playerName: label.name,
        position: label.position,
        nflTeam: label.nflTeam,
        points: 0,
        starter: false,
      };
    });
  });
  const placementLabel = (placement: number) => {
    if (placement === 1) return "Championship";
    if (placement === 3) return "Third-place game";
    const suffix =
      placement % 100 >= 11 && placement % 100 <= 13
        ? "th"
        : placement % 10 === 1
          ? "st"
          : placement % 10 === 2
            ? "nd"
            : placement % 10 === 3
              ? "rd"
              : "th";
    return `${placement}${suffix}-place game`;
  };
  const maxWinnerRound = Math.max(
    0,
    ...winnersBracket.map((match) => match.r),
  );
  const playoffs: PlayoffMatchup[] = [
    ...winnersBracket.map((match) => ({
      match,
      bracket: "championship" as const,
    })),
    ...losersBracket.map((match) => ({
      match,
      bracket: "consolation" as const,
    })),
  ]
    .map(({ match, bracket }) => {
      if (!match.w || !match.l) return null;
      const winner = teamByRosterId.get(match.w);
      const loser = teamByRosterId.get(match.l);
      if (!winner || !loser) return null;
      const week = (league.settings.playoff_week_start ?? 15) + match.r - 1;
      const weekRows = weeklyMatchups[week - 1] ?? [];
      const winnerRow = weekRows.find(
        (row) => row.roster_id === winner.rosterId,
      );
      const loserRow = weekRows.find(
        (row) => row.roster_id === loser.rosterId,
      );
      const stage = match.p
        ? placementLabel(match.p)
        : bracket === "consolation"
          ? `Consolation Round ${match.r}`
          : match.r === maxWinnerRound - 1
            ? "Semifinal"
            : match.r === maxWinnerRound - 2
              ? "Quarterfinal"
              : `Playoff Round ${match.r}`;
      return {
        season: league.season,
        week,
        round: match.r,
        matchId: match.m,
        bracket,
        placement: match.p ?? null,
        stage,
        winner: {
          rosterId: winner.rosterId,
          userId: winner.userId,
          manager: winner.manager,
          teamName: winner.teamName,
          points: Number(
            winnerRow?.custom_points ?? winnerRow?.points ?? 0,
          ),
        },
        loser: {
          rosterId: loser.rosterId,
          userId: loser.userId,
          manager: loser.manager,
          teamName: loser.teamName,
          points: Number(loserRow?.custom_points ?? loserRow?.points ?? 0),
        },
      } satisfies PlayoffMatchup;
    })
    .filter((matchup): matchup is PlayoffMatchup => Boolean(matchup))
    .sort(
      (a, b) =>
        a.round - b.round ||
        Number(a.bracket === "consolation") -
          Number(b.bracket === "consolation") ||
        a.matchId - b.matchId,
    );

  return {
    season: {
      leagueId: league.league_id,
      year: league.season,
      status: league.status,
      teams,
      champion: championship?.w
        ? (teamByRosterId.get(championship.w) ?? null)
        : null,
      runnerUp: championship?.l
        ? (teamByRosterId.get(championship.l) ?? null)
        : null,
      thirdPlace: thirdPlace?.w
        ? (teamByRosterId.get(thirdPlace.w) ?? null)
        : null,
      playoffs,
      draft: primaryDraft
        ? {
            id: primaryDraft.draft_id,
            status: primaryDraft.status,
            type: primaryDraft.type,
            rounds: primaryDraft.settings.rounds ?? 0,
            startTime: primaryDraft.start_time,
            picks: picks.map((pick) => {
              const team = teamByRosterId.get(Number(pick.roster_id));
              const name = [
                pick.metadata?.first_name,
                pick.metadata?.last_name,
              ]
                .filter(Boolean)
                .join(" ");
              return {
                pickNo: pick.pick_no,
                round: pick.round,
                draftSlot: pick.draft_slot,
                rosterId: Number(pick.roster_id),
                playerId: pick.player_id,
                playerName: name || `Player ${pick.player_id}`,
                position: pick.metadata?.position ?? "—",
                nflTeam: pick.metadata?.team ?? "FA",
                teamName: team?.teamName ?? "Unknown team",
                manager: team?.manager ?? "Unknown manager",
                isKeeper: Boolean(pick.is_keeper),
              };
            }),
          }
        : null,
      settings: {
        maxKeepers: league.settings.max_keepers ?? 2,
        playoffTeams: league.settings.playoff_teams ?? 0,
        playoffWeekStart: league.settings.playoff_week_start ?? 0,
        waiverBudget: league.settings.waiver_budget ?? 0,
        tradeDeadline: league.settings.trade_deadline ?? 0,
        rosterPositions: league.roster_positions,
        receptionPoints: league.scoring_settings.rec ?? 0,
      },
    },
    matchupGames,
    performances,
    teamFacts,
    playerFacts,
    rosterFacts,
  };
}

function buildAllTime(seasons: Season[]): AllTimeManager[] {
  const completed = seasons.filter((season) => season.status === "complete");
  const currentNames = new Map<string, Team>();
  for (const season of seasons) {
    for (const team of season.teams) {
      if (!currentNames.has(team.userId)) currentNames.set(team.userId, team);
    }
  }

  const managerMap = new Map<string, AllTimeManager>();
  for (const season of completed) {
    for (const team of season.teams) {
      const current = currentNames.get(team.userId) ?? team;
      const entry = managerMap.get(team.userId) ?? {
        userId: team.userId,
        manager: current.manager,
        currentTeamName: current.teamName,
        avatar: current.avatar,
        seasons: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        winPct: 0,
        pointsFor: 0,
        titles: 0,
        titleYears: [],
      };
      entry.seasons += 1;
      entry.wins += team.wins;
      entry.losses += team.losses;
      entry.ties += team.ties;
      entry.pointsFor += team.pointsFor;
      if (season.champion?.userId === team.userId) {
        entry.titles += 1;
        entry.titleYears.push(season.year);
      }
      managerMap.set(team.userId, entry);
    }
  }

  return [...managerMap.values()]
    .map((manager) => {
      const games = manager.wins + manager.losses + manager.ties;
      return {
        ...manager,
        winPct: games ? (manager.wins + manager.ties * 0.5) / games : 0,
        pointsFor: Number(manager.pointsFor.toFixed(2)),
      };
    })
    .sort(
      (a, b) =>
        b.titles - a.titles ||
        b.winPct - a.winPct ||
        b.pointsFor - a.pointsFor,
    );
}

function buildRivalries(games: RivalryGame[]): Rivalry[] {
  const grouped = new Map<string, RivalryGame[]>();
  for (const game of games) {
    const id = `${game.managerAId}:${game.managerBId}`;
    grouped.set(id, [...(grouped.get(id) ?? []), game]);
  }
  return [...grouped.entries()]
    .map(([id, rivalryGames]) => {
      const latest = [...rivalryGames].sort(
        (a, b) =>
          Number(b.season) - Number(a.season) || b.week - a.week,
      )[0];
      return {
        id,
        managerA: {
          userId: latest.managerAId,
          manager: latest.managerA,
          teamName: latest.teamA,
        },
        managerB: {
          userId: latest.managerBId,
          manager: latest.managerB,
          teamName: latest.teamB,
        },
        winsA: rivalryGames.filter(
          (game) => game.winnerId === latest.managerAId,
        ).length,
        winsB: rivalryGames.filter(
          (game) => game.winnerId === latest.managerBId,
        ).length,
        ties: rivalryGames.filter((game) => game.winnerId === null).length,
        pointsA: Number(
          rivalryGames
            .reduce((total, game) => total + game.pointsA, 0)
            .toFixed(2),
        ),
        pointsB: Number(
          rivalryGames
            .reduce((total, game) => total + game.pointsB, 0)
            .toFixed(2),
        ),
        games: [...rivalryGames].sort(
          (a, b) =>
            Number(b.season) - Number(a.season) || b.week - a.week,
        ),
      };
    })
    .sort((a, b) => b.games.length - a.games.length || a.id.localeCompare(b.id));
}

const PRIZES: Record<
  string,
  { buyIn: number; first: number; second: number; third: number }
> = {
  "2023": { buyIn: 10, first: 100, second: 0, third: 0 },
  "2024": { buyIn: 10, first: 100, second: 0, third: 0 },
  "2025": { buyIn: 15, first: 150, second: 0, third: 0 },
  "2026": { buyIn: 25, first: 175, second: 50, third: 25 },
};

function buildFinances(seasons: Season[]) {
  const currentTeams = new Map<string, Team>();
  for (const season of seasons) {
    for (const team of season.teams) {
      if (!currentTeams.has(team.userId)) currentTeams.set(team.userId, team);
    }
  }

  const totals = new Map<string, FinancialManager>();
  const financialSeasons: FinancialSeason[] = [];
  for (const season of [...seasons].sort(
    (a, b) => Number(a.year) - Number(b.year),
  )) {
    const prize = PRIZES[season.year];
    if (!prize) continue;
    const settled = season.status === "complete";
    financialSeasons.push({
      year: season.year,
      status: settled ? "settled" : "pending",
      buyIn: prize.buyIn,
      prizePool: prize.first + prize.second + prize.third,
      first: prize.first,
      second: prize.second,
      third: prize.third,
      winner: season.champion?.manager ?? null,
      runnerUp: season.runnerUp?.manager ?? null,
      thirdPlace: season.thirdPlace?.manager ?? null,
    });
    if (!settled) continue;

    for (const team of season.teams) {
      const current = currentTeams.get(team.userId) ?? team;
      const row = totals.get(team.userId) ?? {
        userId: team.userId,
        manager: current.manager,
        teamName: current.teamName,
        buyIns: 0,
        winnings: 0,
        net: 0,
      };
      row.buyIns += prize.buyIn;
      if (season.champion?.userId === team.userId) row.winnings += prize.first;
      if (season.runnerUp?.userId === team.userId) row.winnings += prize.second;
      if (season.thirdPlace?.userId === team.userId) row.winnings += prize.third;
      row.net = row.winnings - row.buyIns;
      totals.set(team.userId, row);
    }
  }
  return {
    managers: [...totals.values()].sort(
      (a, b) => b.net - a.net || b.winnings - a.winnings,
    ),
    seasons: financialSeasons,
  };
}

async function loadTransactionFeed(
  league: SleeperLeague,
  teams: Team[],
  players: Record<string, PlayerLabel>,
): Promise<TransactionFeed> {
  const weeklyTransactions = await Promise.all(
    Array.from({ length: 19 }, (_, week) =>
      sleeperFetch<SleeperTransaction[]>(
        `/league/${league.league_id}/transactions/${week}`,
      ),
    ),
  );
  const teamByRoster = new Map(
    teams.map((team) => [
      team.rosterId,
      { teamName: team.teamName, manager: team.manager },
    ]),
  );
  const teamName = (rosterId: number) =>
    teamByRoster.get(rosterId)?.teamName ?? `Roster ${rosterId}`;
  const seen = new Set<string>();
  const transactions = weeklyTransactions
    .flat()
    .filter((transaction) => {
      if (
        transaction.status !== "complete" ||
        !["trade", "waiver", "free_agent"].includes(transaction.type) ||
        seen.has(transaction.transaction_id)
      ) {
        return false;
      }
      seen.add(transaction.transaction_id);
      return true;
    })
    .map<LeagueTransaction>((transaction) => {
      const rosterIds = new Set<number>(transaction.roster_ids ?? []);
      for (const rosterId of Object.values(transaction.adds ?? {})) {
        rosterIds.add(Number(rosterId));
      }
      for (const rosterId of Object.values(transaction.drops ?? {})) {
        rosterIds.add(Number(rosterId));
      }
      return {
        id: transaction.transaction_id,
        type: transaction.type,
        week: transaction.leg ?? 0,
        created: transaction.created,
        waiverBid: transaction.settings?.waiver_bid ?? null,
        teams: [...rosterIds].map((rosterId) => {
          const team = teamByRoster.get(rosterId);
          return {
            rosterId,
            teamName: team?.teamName ?? `Roster ${rosterId}`,
            manager: team?.manager ?? `Roster ${rosterId}`,
            adds: Object.entries(transaction.adds ?? {})
              .filter(([, target]) => Number(target) === rosterId)
              .map(([playerId]) => playerLabel(playerId, players)),
            drops: Object.entries(transaction.drops ?? {})
              .filter(([, source]) => Number(source) === rosterId)
              .map(([playerId]) => playerLabel(playerId, players)),
          };
        }),
        draftPicks: (transaction.draft_picks ?? []).map((pick) => ({
          season: pick.season,
          round: pick.round,
          from: teamName(pick.previous_owner_id),
          to: teamName(pick.owner_id),
          originalRosterId: pick.roster_id,
          previousOwnerRosterId: pick.previous_owner_id,
          ownerRosterId: pick.owner_id,
        })),
        faabTransfers: (transaction.waiver_budget ?? []).map((transfer) => ({
          amount: transfer.amount,
          from: teamName(transfer.sender),
          to: teamName(transfer.receiver),
          senderRosterId: transfer.sender,
          receiverRosterId: transfer.receiver,
        })),
      };
    })
    .sort((a, b) => b.created - a.created);

  return {
    season: league.season,
    transactions,
    counts: {
      all: transactions.length,
      trade: transactions.filter((item) => item.type === "trade").length,
      waiver: transactions.filter((item) => item.type === "waiver").length,
      free_agent: transactions.filter((item) => item.type === "free_agent")
        .length,
    },
  };
}

async function buildSnapshot(
  previous: LeagueSnapshot | null,
  db: PostgresDatabase | null,
): Promise<LeagueSnapshot> {
  const players = await loadPlayers(db);
  const currentLeague =
    await sleeperFetch<SleeperLeague>(`/league/${CURRENT_LEAGUE_ID}`);
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
      const league =
        await sleeperFetch<SleeperLeague>(`/league/${previousId}`);
      leagueChain.push(league);
      previousId = league.previous_league_id;
    }
  }

  const loads = await Promise.all(
    (isSameLeague ? [currentLeague] : leagueChain).map((league) =>
      loadSeason(league, players),
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
    },
    transactions,
    facts: {
      teams: teamFacts,
      players: playerFacts,
      rosters: rosterFacts,
    },
  };
}

async function getSnapshot(): Promise<LeagueSnapshot> {
  const db = getDatabase();
  if (!db) return buildSnapshot(null, null);
  const cached = await readSnapshot(db);
  const slot = syncSlot();
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
    await persistFacts(
      db,
      fresh.facts,
      fullFactBackfill
        ? fresh.data.seasons.map((season) => season.year)
        : [fresh.data.currentSeason],
    );
    await db
      .prepare(
        `INSERT INTO sleeper_snapshots (snapshot_key, data_json, synced_at)
         VALUES (?, ?::jsonb, ?)
         ON CONFLICT(snapshot_key) DO UPDATE SET
           data_json = excluded.data_json,
           synced_at = excluded.synced_at`,
      )
      .bind(SNAPSHOT_KEY, JSON.stringify(fresh), fresh.data.fetchedAt)
      .run();
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

function addChaosFallback(snapshot: LeagueSnapshot) {
  if (snapshot.data.chaos?.schemaVersion === CHAOS_SCHEMA_VERSION) {
    return snapshot;
  }
  const games = snapshot.data.rivalries.flatMap((rivalry) => rivalry.games);
  const teamsBySeason = new Map(
    snapshot.data.seasons.flatMap((season) =>
      season.teams.map((team) => [`${season.year}:${team.userId}`, team] as const),
    ),
  );
  const teamFacts: WeeklyTeamFact[] = games.flatMap((game, index) => {
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
  const playerFacts: WeeklyPlayerFact[] = snapshot.data.topPerformances.map(
    (performance, index) => {
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
    },
  );
  snapshot.data.chaos = buildLeagueChaos({
    seasons: snapshot.data.seasons,
    games,
    teamFacts,
    playerFacts,
    rosterFacts: snapshot.facts?.rosters ?? [],
    transactions: snapshot.transactions,
    archiveReady: false,
  });
  return snapshot;
}

export async function getLeagueData(): Promise<LeagueData> {
  return addChaosFallback(await getSnapshot()).data;
}

export async function getTransactionFeed(
  season: string,
): Promise<TransactionFeed> {
  const snapshot = await getSnapshot();
  const feed = snapshot.transactions[season];
  if (!feed) throw new Error(`No Game of Inches league exists for ${season}.`);
  return feed;
}
