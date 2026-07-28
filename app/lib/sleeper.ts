const SLEEPER_API = "https://api.sleeper.app/v1";
const CURRENT_LEAGUE_ID = "1380998304963235840";

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
  metadata?: {
    team_name?: string;
  };
};

type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  players: string[] | null;
  settings: Record<string, number>;
  metadata?: {
    keepers?: string[];
  };
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
  t1?: number | null;
  t2?: number | null;
  w?: number | null;
  l?: number | null;
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

export type Season = {
  leagueId: string;
  year: string;
  status: string;
  teams: Team[];
  champion: Team | null;
  runnerUp: Team | null;
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

export type LeagueData = {
  leagueName: string;
  fetchedAt: string;
  seasons: Season[];
  allTime: AllTimeManager[];
  completedSeasonCount: number;
  currentSeason: string;
};

async function sleeperFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${SLEEPER_API}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Sleeper returned ${response.status} for ${path}`);
  }

  return response.json() as Promise<T>;
}

function points(settings: Record<string, number>, key: string) {
  return (settings[key] ?? 0) + (settings[`${key}_decimal`] ?? 0) / 100;
}

async function loadSeason(league: SleeperLeague): Promise<Season> {
  const [users, rosters, drafts, bracket] = await Promise.all([
    sleeperFetch<SleeperUser[]>(`/league/${league.league_id}/users`),
    sleeperFetch<SleeperRoster[]>(`/league/${league.league_id}/rosters`),
    sleeperFetch<SleeperDraft[]>(`/league/${league.league_id}/drafts`),
    sleeperFetch<BracketMatch[]>(
      `/league/${league.league_id}/winners_bracket`,
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
    ? await sleeperFetch<SleeperPick[]>(
        `/draft/${primaryDraft.draft_id}/picks`,
      )
    : [];
  const teamByRosterId = new Map(teams.map((team) => [team.rosterId, team]));
  const championship = [...bracket]
    .filter((match) => match.p === 1)
    .sort((a, b) => b.r - a.r)[0];

  return {
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
    draft: primaryDraft
      ? {
          id: primaryDraft.draft_id,
          status: primaryDraft.status,
          type: primaryDraft.type,
          rounds: primaryDraft.settings.rounds ?? 0,
          startTime: primaryDraft.start_time,
          picks: picks.map((pick) => {
            const team = teamByRosterId.get(Number(pick.roster_id));
            const playerName = [
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
              playerName: playerName || `Player ${pick.player_id}`,
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

export async function getLeagueData(): Promise<LeagueData> {
  const leagues: SleeperLeague[] = [];
  let leagueId: string | null = CURRENT_LEAGUE_ID;

  while (leagueId && leagues.length < 10) {
    const league: SleeperLeague = await sleeperFetch<SleeperLeague>(
      `/league/${leagueId}`,
    );
    leagues.push(league);
    leagueId = league.previous_league_id;
  }

  const seasons = await Promise.all(leagues.map(loadSeason));

  return {
    leagueName: leagues[0]?.name ?? "Game of Inches",
    fetchedAt: new Date().toISOString(),
    seasons,
    allTime: buildAllTime(seasons),
    completedSeasonCount: seasons.filter(
      (season) => season.status === "complete",
    ).length,
    currentSeason: seasons[0]?.year ?? new Date().getFullYear().toString(),
  };
}
