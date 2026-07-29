import type {
  DraftPick,
  RivalryGame,
  Season,
  Team,
  TransactionFeed,
} from "./sleeper";

export const CHAOS_SCHEMA_VERSION = 6;

export type WeeklyPlayerFact = {
  season: string;
  week: number;
  rosterId: number;
  userId: string;
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string;
  points: number;
  starter: boolean;
};

export type WeeklyTeamFact = {
  season: string;
  week: number;
  rosterId: number;
  userId: string;
  manager: string;
  teamName: string;
  matchupId: number;
  opponentRosterId: number;
  opponentId: string;
  points: number;
  optimalPoints: number;
  postseason: boolean;
  result: "win" | "loss" | "tie";
};

export type EloStanding = {
  userId: string;
  manager: string;
  teamName: string;
  rating: number;
  peak: number;
  rank: number;
  change: number;
  games: number;
};

export type EloPoint = {
  userId: string;
  manager: string;
  season: string;
  week: number;
  rating: number;
};

export type RecordEntry = {
  id: string;
  label: string;
  value: number;
  unit: "points" | "games";
  holder: string;
  teamName: string;
  season: string;
  week?: number;
  opponent?: string;
  postseason?: boolean;
  flavor: string;
};

export type DraftPickGrade = DraftPick & {
  production: number;
  expected: number;
  value: number;
  verdict: "Steal" | "Value" | "On par" | "Reach" | "Miss";
};

export type DraftTeamGrade = {
  userId: string;
  manager: string;
  teamName: string;
  score: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  value: number;
  bestPick: DraftPickGrade | null;
  worstPick: DraftPickGrade | null;
};

export type DraftReport = {
  season: string;
  provisional: boolean;
  teams: DraftTeamGrade[];
  picks: DraftPickGrade[];
  positionTrends: Array<{
    position: string;
    picks: number;
    averageValue: number;
  }>;
};

export type Superlative = {
  id: string;
  title: string;
  manager: string;
  teamName: string;
  value: string;
  explanation: string;
};

export type FranchiseProfile = {
  userId: string;
  manager: string;
  teamName: string;
  avatar: string | null;
  teamNames: Array<{ season: string; teamName: string }>;
  seasons: number;
  titles: number;
  titleYears: string[];
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  winnings: number;
  net: number;
  elo: number;
  peakElo: number;
  nemesis: { manager: string; record: string } | null;
  favoriteOpponent: { manager: string; record: string } | null;
  bestGame: RecordEntry | null;
  bestSeason: { season: string; wins: number; points: number } | null;
  topPerformances: Array<{
    playerName: string;
    points: number;
    season: string;
    week: number;
  }>;
  tradeCount: number;
  waiverCount: number;
  faabSpent: number;
};

export type KeeperCandidate = {
  userId: string;
  rosterId: number;
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string;
  acquisitionType: "draft" | "waiver" | "trade";
  tradeTiming: "offseason" | "in-season" | null;
  costRound: number;
  yearsRemaining: number;
  source: string;
};

export type LeagueChaos = {
  schemaVersion: number;
  archiveReady: boolean;
  records: RecordEntry[];
  elo: {
    standings: EloStanding[];
    timeline: EloPoint[];
  };
  superlatives: Superlative[];
  franchises: FranchiseProfile[];
  keeperCandidates: KeeperCandidate[];
};

type ChaosInput = {
  seasons: Season[];
  games: RivalryGame[];
  teamFacts: WeeklyTeamFact[];
  playerFacts: WeeklyPlayerFact[];
  rosterFacts: WeeklyPlayerFact[];
  transactions: Record<string, TransactionFeed>;
  archiveReady: boolean;
};

function rounded(value: number) {
  return Number(value.toFixed(2));
}

function currentTeamMap(seasons: Season[]) {
  const map = new Map<string, Team>();
  for (const season of seasons) {
    for (const team of season.teams) {
      if (!map.has(team.userId)) map.set(team.userId, team);
    }
  }
  return map;
}

function completedGames(games: RivalryGame[]) {
  return games
    .filter((game) => game.pointsA !== 0 || game.pointsB !== 0)
    .sort(
      (a, b) =>
        Number(a.season) - Number(b.season) || a.week - b.week,
    );
}

export function buildElo(
  games: RivalryGame[],
  teams: Map<string, Team>,
): LeagueChaos["elo"] {
  const ratings = new Map<string, number>();
  const peaks = new Map<string, number>();
  const gameCounts = new Map<string, number>();
  const timeline: EloPoint[] = [];
  const ordered = completedGames(games);
  const lastChange = new Map<string, number>();

  for (const game of ordered) {
    const ratingA = ratings.get(game.managerAId) ?? 1500;
    const ratingB = ratings.get(game.managerBId) ?? 1500;
    const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
    const scoreA =
      game.winnerId === null ? 0.5 : game.winnerId === game.managerAId ? 1 : 0;
    const delta = 24 * (scoreA - expectedA);
    const nextA = rounded(ratingA + delta);
    const nextB = rounded(ratingB - delta);
    ratings.set(game.managerAId, nextA);
    ratings.set(game.managerBId, nextB);
    peaks.set(game.managerAId, Math.max(peaks.get(game.managerAId) ?? 1500, nextA));
    peaks.set(game.managerBId, Math.max(peaks.get(game.managerBId) ?? 1500, nextB));
    gameCounts.set(game.managerAId, (gameCounts.get(game.managerAId) ?? 0) + 1);
    gameCounts.set(game.managerBId, (gameCounts.get(game.managerBId) ?? 0) + 1);
    lastChange.set(game.managerAId, rounded(delta));
    lastChange.set(game.managerBId, rounded(-delta));
    timeline.push(
      {
        userId: game.managerAId,
        manager: teams.get(game.managerAId)?.manager ?? game.managerA,
        season: game.season,
        week: game.week,
        rating: nextA,
      },
      {
        userId: game.managerBId,
        manager: teams.get(game.managerBId)?.manager ?? game.managerB,
        season: game.season,
        week: game.week,
        rating: nextB,
      },
    );
  }

  const standings = [...teams.values()]
    .map((team) => ({
      userId: team.userId,
      manager: team.manager,
      teamName: team.teamName,
      rating: rounded(ratings.get(team.userId) ?? 1500),
      peak: rounded(peaks.get(team.userId) ?? 1500),
      rank: 0,
      change: rounded(lastChange.get(team.userId) ?? 0),
      games: gameCounts.get(team.userId) ?? 0,
    }))
    .sort((a, b) => b.rating - a.rating || a.manager.localeCompare(b.manager))
    .map((standing, index) => ({ ...standing, rank: index + 1 }));

  return { standings, timeline };
}

function gameSides(game: RivalryGame) {
  return [
    {
      userId: game.managerAId,
      manager: game.managerA,
      teamName: game.teamA,
      points: game.pointsA,
      opponent: game.managerB,
      opponentPoints: game.pointsB,
    },
    {
      userId: game.managerBId,
      manager: game.managerB,
      teamName: game.teamB,
      points: game.pointsB,
      opponent: game.managerA,
      opponentPoints: game.pointsA,
    },
  ];
}

export function buildRecordBook(
  games: RivalryGame[],
  teamFacts: WeeklyTeamFact[],
  seasons: Season[] = [],
): RecordEntry[] {
  const played = completedGames(games);
  const sides = played.flatMap(gameSides);
  if (!played.length) return [];

  const highest = [...sides].sort((a, b) => b.points - a.points)[0];
  const lowest = [...sides].sort((a, b) => a.points - b.points)[0];
  const margins = played.map((game) => ({
    game,
    margin: Math.abs(game.pointsA - game.pointsB),
    combined: game.pointsA + game.pointsB,
  }));
  const biggest = [...margins].sort((a, b) => b.margin - a.margin)[0];
  const closest = [...margins].sort((a, b) => a.margin - b.margin)[0];
  const combined = [...margins].sort((a, b) => b.combined - a.combined)[0];
  const losses = sides.filter((side) => side.points < side.opponentPoints);
  const heartbreak = [...losses].sort((a, b) => b.points - a.points)[0];
  const optimal = [...teamFacts]
    .filter((fact) => fact.points !== 0 || fact.optimalPoints !== 0)
    .sort((a, b) => b.optimalPoints - a.optimalPoints)[0];
  const bench = [...teamFacts]
    .map((fact) => ({ ...fact, gap: fact.optimalPoints - fact.points }))
    .sort((a, b) => b.gap - a.gap)[0];
  const completedSeasonTeams = seasons
    .filter((season) => season.status === "complete")
    .flatMap((season) =>
      season.teams.map((team) => ({ season: season.year, team })),
    );
  const seasonPoints = [...completedSeasonTeams].sort(
    (a, b) => b.team.pointsFor - a.team.pointsFor,
  )[0];
  const seasonWins = [...completedSeasonTeams].sort(
    (a, b) =>
      b.team.wins - a.team.wins ||
      b.team.ties - a.team.ties ||
      b.team.pointsFor - a.team.pointsFor,
  )[0];
  const postseasonSide = [...sides]
    .filter((side) =>
      played.some(
        (game) =>
          game.postseason &&
          game.season &&
          ((game.managerAId === side.userId && game.pointsA === side.points) ||
            (game.managerBId === side.userId && game.pointsB === side.points)),
      ),
    )
    .sort((a, b) => b.points - a.points)[0];
  const postseasonGame = postseasonSide
    ? played.find(
        (game) =>
          game.postseason &&
          ((game.managerAId === postseasonSide.userId &&
            game.pointsA === postseasonSide.points) ||
            (game.managerBId === postseasonSide.userId &&
              game.pointsB === postseasonSide.points)),
      )
    : null;
  const streak = [...longestWinStreak(played).entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  const streakTeam = streak
    ? played
        .flatMap((game) => [
          {
            id: game.managerAId,
            manager: game.managerA,
            teamName: game.teamA,
            season: game.season,
          },
          {
            id: game.managerBId,
            manager: game.managerB,
            teamName: game.teamB,
            season: game.season,
          },
        ])
        .reverse()
        .find((team) => team.id === streak[0])
    : null;

  const locate = (manager: string, points: number) =>
    played.find(
      (game) =>
        (game.managerA === manager && game.pointsA === points) ||
        (game.managerB === manager && game.pointsB === points),
    );
  const highGame = locate(highest.manager, highest.points)!;
  const lowGame = locate(lowest.manager, lowest.points)!;
  const winnerFor = (game: RivalryGame) =>
    game.pointsA >= game.pointsB
      ? { manager: game.managerA, teamName: game.teamA, opponent: game.managerB }
      : { manager: game.managerB, teamName: game.teamB, opponent: game.managerA };

  const records: Array<RecordEntry | null> = [
    {
      id: "highest-team-score",
      label: "Highest team score",
      value: highest.points,
      unit: "points",
      holder: highest.manager,
      teamName: highest.teamName,
      season: highGame.season,
      week: highGame.week,
      opponent: highest.opponent,
      postseason: highGame.postseason,
      flavor: "The single loudest scoreboard detonation.",
    },
    {
      id: "lowest-team-score",
      label: "Lowest team score",
      value: lowest.points,
      unit: "points",
      holder: lowest.manager,
      teamName: lowest.teamName,
      season: lowGame.season,
      week: lowGame.week,
      opponent: lowest.opponent,
      postseason: lowGame.postseason,
      flavor: "A lineup that should have remained in drafts.",
    },
    {
      id: "biggest-blowout",
      label: "Largest winning margin",
      value: biggest.margin,
      unit: "points",
      holder: winnerFor(biggest.game).manager,
      teamName: winnerFor(biggest.game).teamName,
      season: biggest.game.season,
      week: biggest.game.week,
      opponent: winnerFor(biggest.game).opponent,
      postseason: biggest.game.postseason,
      flavor: "This was less a matchup than a public execution.",
    },
    {
      id: "closest-game",
      label: "Closest finish",
      value: closest.margin,
      unit: "points",
      holder: winnerFor(closest.game).manager,
      teamName: winnerFor(closest.game).teamName,
      season: closest.game.season,
      week: closest.game.week,
      opponent: winnerFor(closest.game).opponent,
      postseason: closest.game.postseason,
      flavor: "Every decimal was subpoenaed.",
    },
    {
      id: "highest-combined",
      label: "Highest combined score",
      value: combined.combined,
      unit: "points",
      holder: `${combined.game.managerA} vs ${combined.game.managerB}`,
      teamName: `${combined.game.teamA} / ${combined.game.teamB}`,
      season: combined.game.season,
      week: combined.game.week,
      postseason: combined.game.postseason,
      flavor: "Two flamethrowers, one matchup.",
    },
    heartbreak
      ? {
          id: "most-points-loss",
          label: "Most points in a loss",
          value: heartbreak.points,
          unit: "points",
          holder: heartbreak.manager,
          teamName: heartbreak.teamName,
          season:
            locate(heartbreak.manager, heartbreak.points)?.season ?? "",
          week: locate(heartbreak.manager, heartbreak.points)?.week,
          opponent: heartbreak.opponent,
          flavor: "The scoreboard equivalent of stepping on a rake.",
        }
      : null,
    optimal
      ? {
          id: "optimal-score",
          label: "Highest optimal lineup",
          value: optimal.optimalPoints,
          unit: "points",
          holder: optimal.manager,
          teamName: optimal.teamName,
          season: optimal.season,
          week: optimal.week,
          postseason: optimal.postseason,
          flavor: "The theoretical ceiling was touching clouds.",
        }
      : null,
    bench && bench.gap > 0
      ? {
          id: "bench-gap",
          label: "Most points left on the bench",
          value: bench.gap,
          unit: "points",
          holder: bench.manager,
          teamName: bench.teamName,
          season: bench.season,
          week: bench.week,
          postseason: bench.postseason,
          flavor: "An elite performance in lineup malpractice.",
        }
      : null,
    seasonPoints
      ? {
          id: "season-points",
          label: "Most points in a season",
          value: seasonPoints.team.pointsFor,
          unit: "points",
          holder: seasonPoints.team.manager,
          teamName: seasonPoints.team.teamName,
          season: seasonPoints.season,
          flavor: "The strongest full-season scoring campaign.",
        }
      : null,
    seasonWins
      ? {
          id: "season-wins",
          label: "Most regular-season wins",
          value: seasonWins.team.wins,
          unit: "games",
          holder: seasonWins.team.manager,
          teamName: seasonWins.team.teamName,
          season: seasonWins.season,
          flavor: "The cleanest march through the regular season.",
        }
      : null,
    postseasonSide && postseasonGame
      ? {
          id: "postseason-score",
          label: "Highest postseason score",
          value: postseasonSide.points,
          unit: "points",
          holder: postseasonSide.manager,
          teamName: postseasonSide.teamName,
          season: postseasonGame.season,
          week: postseasonGame.week,
          opponent: postseasonSide.opponent,
          postseason: true,
          flavor: "Bright lights, no stage fright.",
        }
      : null,
    streak && streakTeam
      ? {
          id: "winning-streak",
          label: "Longest winning streak",
          value: streak[1],
          unit: "games",
          holder: streakTeam.manager,
          teamName: streakTeam.teamName,
          season: streakTeam.season,
          flavor: "The longest uninterrupted run of violence.",
        }
      : null,
  ];
  return records.filter((record): record is RecordEntry => Boolean(record));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function gradeForPercentile(percentile: number): DraftTeamGrade["grade"] {
  if (percentile >= 0.95) return "A+";
  if (percentile >= 0.8) return "A";
  if (percentile >= 0.6) return "B";
  if (percentile >= 0.4) return "C";
  if (percentile >= 0.2) return "D";
  return "F";
}

export function buildDraftReports(
  seasons: Season[],
  playerFacts: WeeklyPlayerFact[],
): DraftReport[] {
  const production = new Map<string, number>();
  for (const fact of playerFacts) {
    const key = `${fact.season}:${fact.playerId}`;
    production.set(key, (production.get(key) ?? 0) + fact.points);
  }
  const completed = new Set(
    seasons.filter((season) => season.status === "complete").map((season) => season.year),
  );
  const historicalByRound = new Map<number, number[]>();
  for (const season of seasons) {
    for (const pick of season.draft?.picks ?? []) {
      if (pick.isKeeper || !completed.has(season.year)) continue;
      const points = production.get(`${season.year}:${pick.playerId}`) ?? 0;
      historicalByRound.set(pick.round, [
        ...(historicalByRound.get(pick.round) ?? []),
        points,
      ]);
    }
  }

  return seasons
    .filter((season) => season.draft?.picks.length)
    .map((season) => {
      const gradedPicks: DraftPickGrade[] = (season.draft?.picks ?? [])
        .filter((pick) => !pick.isKeeper)
        .map((pick) => {
          const actual = rounded(
            production.get(`${season.year}:${pick.playerId}`) ?? 0,
          );
          let comparison = historicalByRound.get(pick.round) ?? [];
          if (comparison.length < 5) {
            comparison = [
              ...(historicalByRound.get(pick.round - 1) ?? []),
              ...comparison,
              ...(historicalByRound.get(pick.round + 1) ?? []),
            ];
          }
          const expected = rounded(median(comparison));
          const value = rounded(actual - expected);
          const threshold = Math.max(20, expected * 0.25);
          return {
            ...pick,
            production: actual,
            expected,
            value,
            verdict:
              value >= threshold * 2
                ? "Steal"
                : value >= threshold
                  ? "Value"
                  : value <= -threshold * 2
                    ? "Miss"
                    : value <= -threshold
                      ? "Reach"
                      : "On par",
          };
        });
      const teamMap = new Map<
        number,
        { picks: DraftPickGrade[]; weighted: number; weights: number }
      >();
      for (const pick of gradedPicks) {
        const row = teamMap.get(pick.rosterId) ?? {
          picks: [],
          weighted: 0,
          weights: 0,
        };
        const weight = 1 / Math.sqrt(Math.max(1, pick.round));
        row.picks.push(pick);
        row.weighted += pick.value * weight;
        row.weights += weight;
        teamMap.set(pick.rosterId, row);
      }
      const rawTeams = [...teamMap.entries()]
        .map(([rosterId, row]) => {
          const team = season.teams.find((item) => item.rosterId === rosterId);
          const value = row.weights ? row.weighted / row.weights : 0;
          return {
            userId: team?.userId ?? String(rosterId),
            manager: team?.manager ?? `Roster ${rosterId}`,
            teamName: team?.teamName ?? `Roster ${rosterId}`,
            value,
            picks: row.picks,
          };
        })
        .sort((a, b) => a.value - b.value);
      const teams = rawTeams
        .map((team, index) => {
          const percentile =
            rawTeams.length === 1 ? 1 : index / (rawTeams.length - 1);
          const picks = [...team.picks].sort((a, b) => b.value - a.value);
          return {
            userId: team.userId,
            manager: team.manager,
            teamName: team.teamName,
            score: Math.round(percentile * 100),
            grade: gradeForPercentile(percentile),
            value: rounded(team.value),
            bestPick: picks[0] ?? null,
            worstPick: picks.at(-1) ?? null,
          };
        })
        .sort((a, b) => b.score - a.score);
      return {
        season: season.year,
        provisional: season.status !== "complete",
        teams,
        picks: gradedPicks.sort((a, b) => b.value - a.value),
        positionTrends: [
          ...gradedPicks.reduce(
            (map, pick) => {
              const row = map.get(pick.position) ?? { total: 0, picks: 0 };
              row.total += pick.value;
              row.picks += 1;
              map.set(pick.position, row);
              return map;
            },
            new Map<string, { total: number; picks: number }>(),
          ),
        ]
          .map(([position, row]) => ({
            position,
            picks: row.picks,
            averageValue: rounded(row.total / row.picks),
          }))
          .sort((a, b) => b.averageValue - a.averageValue),
      };
    })
    .sort((a, b) => Number(b.season) - Number(a.season));
}

function longestWinStreak(games: RivalryGame[]) {
  const streaks = new Map<string, number>();
  const best = new Map<string, number>();
  for (const game of completedGames(games)) {
    for (const id of [game.managerAId, game.managerBId]) {
      const won = game.winnerId === id;
      const next = won ? (streaks.get(id) ?? 0) + 1 : 0;
      streaks.set(id, next);
      best.set(id, Math.max(best.get(id) ?? 0, next));
    }
  }
  return best;
}

export function buildSuperlatives(
  games: RivalryGame[],
  teamFacts: WeeklyTeamFact[],
  playerFacts: WeeklyPlayerFact[],
  transactions: Record<string, TransactionFeed>,
  eloTimeline: EloPoint[],
  teams: Map<string, Team>,
): Superlative[] {
  const tradeCounts = new Map<string, number>();
  const faab = new Map<string, number>();
  const waiverPlayers = new Map<string, Set<string>>();
  for (const feed of Object.values(transactions)) {
    for (const transaction of feed.transactions) {
      for (const side of transaction.teams) {
        const team = teams.get(
          [...teams.values()].find((item) => item.rosterId === side.rosterId)
            ?.userId ?? "",
        );
        if (!team) continue;
        if (transaction.type === "trade") {
          tradeCounts.set(team.userId, (tradeCounts.get(team.userId) ?? 0) + 1);
        }
        if (transaction.type === "waiver") {
          faab.set(
            team.userId,
            (faab.get(team.userId) ?? 0) + (transaction.waiverBid ?? 0),
          );
          const set = waiverPlayers.get(team.userId) ?? new Set<string>();
          side.adds.forEach((player) => set.add(player.id));
          waiverPlayers.set(team.userId, set);
        }
      }
    }
  }
  const waiverImpact = new Map<string, number>();
  for (const fact of playerFacts.filter((item) => item.starter)) {
    if (waiverPlayers.get(fact.userId)?.has(fact.playerId)) {
      waiverImpact.set(
        fact.userId,
        (waiverImpact.get(fact.userId) ?? 0) + fact.points,
      );
    }
  }
  const heartbreak = new Map<string, number>();
  for (const game of completedGames(games)) {
    if (game.pointsA < game.pointsB) {
      heartbreak.set(
        game.managerAId,
        (heartbreak.get(game.managerAId) ?? 0) + game.pointsA,
      );
    } else if (game.pointsB < game.pointsA) {
      heartbreak.set(
        game.managerBId,
        (heartbreak.get(game.managerBId) ?? 0) + game.pointsB,
      );
    }
  }
  const lineup = new Map<string, { gap: number; games: number }>();
  for (const fact of teamFacts) {
    const row = lineup.get(fact.userId) ?? { gap: 0, games: 0 };
    row.gap += Math.max(0, fact.optimalPoints - fact.points);
    row.games += 1;
    lineup.set(fact.userId, row);
  }
  const streaks = longestWinStreak(games);
  const highest = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  const lowestLineup = [...lineup.entries()]
    .filter(([, value]) => value.games >= 4)
    .map(([id, value]) => [id, value.gap / value.games] as const)
    .sort((a, b) => a[1] - b[1])[0];
  const factsByWeek = new Map<string, WeeklyTeamFact[]>();
  for (const fact of teamFacts) {
    const key = `${fact.season}:${fact.week}`;
    const weeklyFacts = factsByWeek.get(key) ?? [];
    weeklyFacts.push(fact);
    factsByWeek.set(key, weeklyFacts);
  }
  const weeklyHighs = new Map<string, number>();
  const qualifyingPoints = new Map<string, number>();
  for (const weeklyFacts of factsByWeek.values()) {
    if (
      weeklyFacts.length < 2 ||
      weeklyFacts.some((fact) => fact.points <= 0)
    ) {
      continue;
    }
    const highScore = Math.max(...weeklyFacts.map((fact) => fact.points));
    for (const fact of weeklyFacts) {
      qualifyingPoints.set(
        fact.userId,
        (qualifyingPoints.get(fact.userId) ?? 0) + fact.points,
      );
      if (fact.points === highScore) {
        weeklyHighs.set(
          fact.userId,
          (weeklyHighs.get(fact.userId) ?? 0) + 1,
        );
      }
    }
  }
  const scoreboardLeader = [...weeklyHighs.entries()].sort(
    ([userA, highsA], [userB, highsB]) =>
      highsB - highsA ||
      (qualifyingPoints.get(userB) ?? 0) -
        (qualifyingPoints.get(userA) ?? 0) ||
      userA.localeCompare(userB),
  )[0];
  const superlatives: Array<Superlative | null> = [];
  const add = (
    id: string,
    title: string,
    row: [string, number] | undefined,
    format: (value: number) => string,
    explanation: string,
  ) => {
    if (!row) return;
    const team = teams.get(row[0]);
    if (!team) return;
    superlatives.push({
      id,
      title,
      manager: team.manager,
      teamName: team.teamName,
      value: format(row[1]),
      explanation,
    });
  };
  add("waiver-king", "Waiver King", highest(waiverImpact), (v) => `${rounded(v)} starter pts`, "Most starter points from successful waiver claims.");
  add("faab-arsonist", "FAAB Arsonist", highest(faab), (v) => `$${v}`, "Most FAAB committed to successful claims.");
  add("trade-addict", "Trade Addict", highest(tradeCounts), (v) => `${v} trades`, "Most appearances on completed trade receipts.");
  add("heartbreak", "Heartbreak Leader", highest(heartbreak), (v) => `${rounded(v)} pts`, "Most total points scored in losses.");
  add("lineup-wizard", "Lineup Wizard", lowestLineup, (v) => `${rounded(v)} avg gap`, "Smallest average gap between actual and optimal lineups.");
  add("streaker", "The Streaker", highest(streaks), (v) => `${v} straight`, "Longest winning streak in the archive.");
  add(
    "scoreboard-bully",
    "Scoreboard Bully",
    scoreboardLeader,
    (v) => `${v} weekly ${v === 1 ? "high" : "highs"}`,
    "Most league-high scores across completed weeks; ties count for every weekly leader.",
  );

  const ratingBefore = new Map<string, number>();
  const giantKills = new Map<string, number>();
  for (const game of completedGames(games)) {
    const ratingA = ratingBefore.get(game.managerAId) ?? 1500;
    const ratingB = ratingBefore.get(game.managerBId) ?? 1500;
    if (game.winnerId === game.managerAId && ratingB - ratingA >= 75) {
      giantKills.set(
        game.managerAId,
        (giantKills.get(game.managerAId) ?? 0) + 1,
      );
    }
    if (game.winnerId === game.managerBId && ratingA - ratingB >= 75) {
      giantKills.set(
        game.managerBId,
        (giantKills.get(game.managerBId) ?? 0) + 1,
      );
    }
    for (const point of eloTimeline.filter(
      (item) => item.season === game.season && item.week === game.week,
    )) {
      ratingBefore.set(point.userId, point.rating);
    }
  }
  add("giant-killer", "Giant Killer", highest(giantKills), (v) => `${v} upsets`, "Wins over opponents rated at least 75 Elo higher.");
  return superlatives.filter(
    (item): item is Superlative => Boolean(item),
  );
}

export function buildFranchises(
  seasons: Season[],
  games: RivalryGame[],
  records: RecordEntry[],
  elo: LeagueChaos["elo"],
  transactions: Record<string, TransactionFeed>,
  playerFacts: WeeklyPlayerFact[],
): FranchiseProfile[] {
  const teams = currentTeamMap(seasons);
  const completed = seasons.filter((season) => season.status === "complete");
  return [...teams.values()].map((current) => {
    const seasonTeams = seasons
      .map((season) => ({
        season: season.year,
        team: season.teams.find((team) => team.userId === current.userId),
      }))
      .filter(
        (entry): entry is { season: string; team: Team } => Boolean(entry.team),
      );
    const settledTeams = completed
      .map((season) => ({
        season,
        team: season.teams.find((team) => team.userId === current.userId),
      }))
      .filter((entry): entry is { season: Season; team: Team } => Boolean(entry.team));
    const bestSeason = [...settledTeams].sort(
      (a, b) =>
        b.team.wins - a.team.wins ||
        b.team.pointsFor - a.team.pointsFor,
    )[0];
    const opponentRows = new Map<
      string,
      { manager: string; wins: number; losses: number; ties: number }
    >();
    for (const game of games.filter(
      (game) =>
        game.managerAId === current.userId ||
        game.managerBId === current.userId,
    )) {
      const isA = game.managerAId === current.userId;
      const opponentId = isA ? game.managerBId : game.managerAId;
      const row = opponentRows.get(opponentId) ?? {
        manager: isA ? game.managerB : game.managerA,
        wins: 0,
        losses: 0,
        ties: 0,
      };
      if (game.winnerId === null) row.ties += 1;
      else if (game.winnerId === current.userId) row.wins += 1;
      else row.losses += 1;
      opponentRows.set(opponentId, row);
    }
    const opponents = [...opponentRows.values()];
    const nemesis = [...opponents].sort(
      (a, b) => b.losses - b.wins - (a.losses - a.wins),
    )[0];
    const favorite = [...opponents].sort(
      (a, b) => b.wins - b.losses - (a.wins - a.losses),
    )[0];
    const feeds = Object.values(transactions).flatMap((feed) => feed.transactions);
    const teamRosterIds = new Set(seasonTeams.map((entry) => entry.team.rosterId));
    const relevantSides = feeds.flatMap((transaction) =>
      transaction.teams
        .filter((side) => teamRosterIds.has(side.rosterId))
        .map((side) => ({ transaction, side })),
    );
    const finance = settledTeams.reduce(
      (sum, entry) => {
        const prize =
          entry.season.year === "2023" || entry.season.year === "2024"
            ? { buyIn: 10, first: 100 }
            : entry.season.year === "2025"
              ? { buyIn: 15, first: 150 }
              : { buyIn: 0, first: 0 };
        sum.buyIns += prize.buyIn;
        if (entry.season.champion?.userId === current.userId) {
          sum.winnings += prize.first;
        }
        return sum;
      },
      { buyIns: 0, winnings: 0 },
    );
    const standing = elo.standings.find((item) => item.userId === current.userId);
    const playerHighlights = playerFacts
      .filter((fact) => fact.userId === current.userId && fact.starter)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5)
      .map((fact) => ({
        playerName: fact.playerName,
        points: fact.points,
        season: fact.season,
        week: fact.week,
      }));
    return {
      userId: current.userId,
      manager: current.manager,
      teamName: current.teamName,
      avatar: current.avatar,
      teamNames: seasonTeams.map((entry) => ({
        season: entry.season,
        teamName: entry.team.teamName,
      })),
      seasons: settledTeams.length,
      titles: settledTeams.filter(
        (entry) => entry.season.champion?.userId === current.userId,
      ).length,
      titleYears: settledTeams
        .filter((entry) => entry.season.champion?.userId === current.userId)
        .map((entry) => entry.season.year),
      wins: settledTeams.reduce((sum, entry) => sum + entry.team.wins, 0),
      losses: settledTeams.reduce((sum, entry) => sum + entry.team.losses, 0),
      ties: settledTeams.reduce((sum, entry) => sum + entry.team.ties, 0),
      pointsFor: rounded(
        settledTeams.reduce((sum, entry) => sum + entry.team.pointsFor, 0),
      ),
      winnings: finance.winnings,
      net: finance.winnings - finance.buyIns,
      elo: standing?.rating ?? 1500,
      peakElo: standing?.peak ?? 1500,
      nemesis: nemesis
        ? {
            manager: nemesis.manager,
            record: `${nemesis.wins}-${nemesis.losses}${nemesis.ties ? `-${nemesis.ties}` : ""}`,
          }
        : null,
      favoriteOpponent: favorite
        ? {
            manager: favorite.manager,
            record: `${favorite.wins}-${favorite.losses}${favorite.ties ? `-${favorite.ties}` : ""}`,
          }
        : null,
      bestGame:
        records.find(
          (record) =>
            record.id === "highest-team-score" &&
            record.holder === current.manager,
        ) ??
        [...games]
          .filter(
            (game) =>
              game.managerAId === current.userId ||
              game.managerBId === current.userId,
          )
          .flatMap(gameSides)
          .filter((side) => side.userId === current.userId)
          .sort((a, b) => b.points - a.points)
          .map((side) => {
            const game = games.find(
              (item) =>
                (item.managerAId === current.userId &&
                  item.pointsA === side.points) ||
                (item.managerBId === current.userId &&
                  item.pointsB === side.points),
            );
            return game
              ? {
                  id: `franchise-${current.userId}-best`,
                  label: "Franchise high score",
                  value: side.points,
                  unit: "points" as const,
                  holder: current.manager,
                  teamName: side.teamName,
                  season: game.season,
                  week: game.week,
                  opponent: side.opponent,
                  postseason: game.postseason,
                  flavor: "The franchise ceiling.",
                }
              : null;
          })
          .find((record): record is RecordEntry => Boolean(record)) ?? null,
      bestSeason: bestSeason
        ? {
            season: bestSeason.season.year,
            wins: bestSeason.team.wins,
            points: bestSeason.team.pointsFor,
          }
        : null,
      topPerformances: playerHighlights,
      tradeCount: relevantSides.filter(
        ({ transaction }) => transaction.type === "trade",
      ).length,
      waiverCount: relevantSides.filter(
        ({ transaction }) => transaction.type === "waiver",
      ).length,
      faabSpent: relevantSides
        .filter(({ transaction }) => transaction.type === "waiver")
        .reduce(
          (sum, { transaction }) => sum + (transaction.waiverBid ?? 0),
          0,
        ),
    };
  });
}

export function buildKeeperCandidates(
  seasons: Season[],
  playerFacts: WeeklyPlayerFact[],
  transactions: Record<string, TransactionFeed>,
  rosterFacts: WeeklyPlayerFact[] = [],
  archiveReady = false,
): KeeperCandidate[] {
  const sourceSeason =
    seasons.find((season) => season.status === "complete") ?? seasons[1];
  if (!sourceSeason) return [];
  const currentSeason = seasons[0] ?? sourceSeason;
  const teamByRoster = new Map(
    [...sourceSeason.teams, ...currentSeason.teams].map((team) => [
      team.rosterId,
      team,
    ]),
  );
  const draftByPlayer = new Map(
    (sourceSeason.draft?.picks ?? []).map((pick) => [pick.playerId, pick]),
  );
  const details = new Map<
    string,
    {
      playerName: string;
      position: string;
      nflTeam: string;
    }
  >(
    (sourceSeason.draft?.picks ?? []).map((pick) => [
      pick.playerId,
      {
        playerName: pick.playerName,
        position: pick.position,
        nflTeam: pick.nflTeam,
      },
    ]),
  );
  const ownership = new Map<string, number>();
  const acquisition = new Map<
    string,
    {
      type: KeeperCandidate["acquisitionType"];
      rosterId: number;
      tradeTiming: KeeperCandidate["tradeTiming"];
    }
  >();
  const exactRoster = rosterFacts.filter(
    (fact) => fact.season === sourceSeason.year,
  );
  if (exactRoster.length) {
    for (const fact of exactRoster) {
      ownership.set(fact.playerId, fact.rosterId);
      details.set(fact.playerId, {
        playerName: fact.playerName,
        position: fact.position,
        nflTeam: fact.nflTeam,
      });
    }
  } else {
    for (const pick of sourceSeason.draft?.picks ?? []) {
      ownership.set(pick.playerId, pick.rosterId);
    }
  }
  const orderedTransactions = Object.entries(transactions)
    .filter(([season]) => Number(season) >= Number(sourceSeason.year))
    .flatMap(([season, feed]) =>
      feed.transactions.map((transaction) => ({ season, transaction })),
    )
    .sort((a, b) => a.transaction.created - b.transaction.created);
  for (const { season, transaction } of orderedTransactions) {
    const updateOwnership =
      !exactRoster.length || Number(season) > Number(sourceSeason.year);
    for (const side of transaction.teams) {
      if (updateOwnership) {
        for (const player of side.drops) {
          if (ownership.get(player.id) === side.rosterId) {
            ownership.delete(player.id);
          }
        }
      }
      for (const player of side.adds) {
        details.set(player.id, {
          playerName: player.name,
          position: player.position,
          nflTeam: player.nflTeam,
        });
        if (updateOwnership) ownership.set(player.id, side.rosterId);
        acquisition.set(player.id, {
          type: transaction.type === "trade" ? "trade" : "waiver",
          rosterId: side.rosterId,
          tradeTiming:
            transaction.type === "trade"
              ? Number(season) > Number(sourceSeason.year)
                ? "offseason"
                : "in-season"
              : null,
        });
      }
    }
  }
  if (archiveReady && !exactRoster.length) {
    const seasonFacts = playerFacts.filter(
      (fact) => fact.season === sourceSeason.year,
    );
    const latestWeekByRoster = new Map<number, number>();
    for (const fact of seasonFacts) {
      latestWeekByRoster.set(
        fact.rosterId,
        Math.max(latestWeekByRoster.get(fact.rosterId) ?? 0, fact.week),
      );
    }
    for (const [rosterId, latestWeek] of latestWeekByRoster) {
      const finalFacts = seasonFacts.filter(
        (fact) => fact.rosterId === rosterId && fact.week === latestWeek,
      );
      const finalIds = new Set(finalFacts.map((fact) => fact.playerId));
      for (const [playerId, ownerRosterId] of ownership) {
        if (ownerRosterId === rosterId && !finalIds.has(playerId)) {
          ownership.delete(playerId);
        }
      }
      for (const fact of finalFacts) {
        ownership.set(fact.playerId, rosterId);
        details.set(fact.playerId, {
          playerName: fact.playerName,
          position: fact.position,
          nflTeam: fact.nflTeam,
        });
      }
    }
  }
  return [...ownership.entries()]
    .map(([playerId, rosterId]) => {
      const team = teamByRoster.get(rosterId);
      const player = details.get(playerId);
      if (!team || !player) return null;
      const draft = draftByPlayer.get(playerId);
      const move = acquisition.get(playerId);
      const acquisitionType = move?.type ?? "draft";
      const tradeTiming = move?.tradeTiming ?? null;
      const draftCost = draft
        ? Math.max(1, Math.min(10, draft.round - 1))
        : 8;
      return {
        userId: team.userId,
        rosterId,
        playerId,
        playerName: player.playerName,
        position: player.position,
        nflTeam: player.nflTeam,
        acquisitionType,
        tradeTiming,
        costRound: acquisitionType === "waiver" ? 8 : draftCost,
        yearsRemaining: tradeTiming === "offseason" ? 3 : 2,
        source:
          tradeTiming === "offseason"
            ? "Offseason trade · timer reset to 3 years"
            : tradeTiming === "in-season"
              ? "In-season trade · 2 years left"
              : acquisitionType === "waiver"
                ? "Waiver / free agent · Round 8"
                : draft
                  ? `Drafted Round ${draft.round}`
                  : "Roster carryover",
      } satisfies KeeperCandidate;
    })
    .filter((candidate): candidate is KeeperCandidate => Boolean(candidate))
    .sort(
      (a, b) =>
        a.rosterId - b.rosterId ||
        a.costRound - b.costRound ||
        a.playerName.localeCompare(b.playerName),
    );
}

export function buildLeagueChaos(input: ChaosInput): LeagueChaos {
  const teams = currentTeamMap(input.seasons);
  const elo = buildElo(input.games, teams);
  const records = buildRecordBook(
    input.games,
    input.teamFacts,
    input.seasons,
  );
  const superlatives = buildSuperlatives(
    input.games,
    input.teamFacts,
    input.playerFacts,
    input.transactions,
    elo.timeline,
    teams,
  );
  return {
    schemaVersion: CHAOS_SCHEMA_VERSION,
    archiveReady: input.archiveReady,
    records,
    elo,
    superlatives,
    franchises: buildFranchises(
      input.seasons,
      input.games,
      records,
      elo,
      input.transactions,
      input.playerFacts,
    ),
    keeperCandidates: buildKeeperCandidates(
      input.seasons,
      input.playerFacts,
      input.transactions,
      input.rosterFacts,
      input.archiveReady,
    ),
  };
}

export function optimalLineupPoints(
  rosterSlots: string[],
  players: Array<{ position: string; points: number }>,
) {
  const slots = rosterSlots.filter(
    (slot) => !["BN", "IR", "TAXI"].includes(slot),
  );
  const accepts = (slot: string, position: string) => {
    if (slot === position) return true;
    if (slot === "FLEX") return ["RB", "WR", "TE"].includes(position);
    if (slot === "SUPER_FLEX") {
      return ["QB", "RB", "WR", "TE"].includes(position);
    }
    if (slot === "REC_FLEX") return ["WR", "TE"].includes(position);
    return false;
  };
  const memo = new Map<string, number>();
  function solve(slotIndex: number, used: bigint): number {
    if (slotIndex >= slots.length) return 0;
    const key = `${slotIndex}:${used}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let best = 0;
    for (let index = 0; index < players.length; index += 1) {
      const bit = 1n << BigInt(index);
      if ((used & bit) !== 0n || !accepts(slots[slotIndex], players[index].position)) {
        continue;
      }
      best = Math.max(
        best,
        players[index].points + solve(slotIndex + 1, used | bit),
      );
    }
    memo.set(key, best);
    return best;
  }
  return rounded(solve(0, 0n));
}
