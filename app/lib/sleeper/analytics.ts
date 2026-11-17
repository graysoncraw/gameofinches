import type {
  AllTimeManager,
  FinancialManager,
  FinancialSeason,
  Rivalry,
  RivalryGame,
  Season,
  Team,
} from "../league-types";

export function buildAllTime(seasons: Season[]): AllTimeManager[] {
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
        b.titles - a.titles || b.winPct - a.winPct || b.pointsFor - a.pointsFor,
    );
}

export function buildRivalries(games: RivalryGame[]): Rivalry[] {
  const grouped = new Map<string, RivalryGame[]>();
  for (const game of games) {
    const id = `${game.managerAId}:${game.managerBId}`;
    grouped.set(id, [...(grouped.get(id) ?? []), game]);
  }
  return [...grouped.entries()]
    .map(([id, rivalryGames]) => {
      const latest = [...rivalryGames].sort(
        (a, b) => Number(b.season) - Number(a.season) || b.week - a.week,
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
          (a, b) => Number(b.season) - Number(a.season) || b.week - a.week,
        ),
      };
    })
    .sort(
      (a, b) => b.games.length - a.games.length || a.id.localeCompare(b.id),
    );
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

export function buildFinances(seasons: Season[]) {
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
      if (season.thirdPlace?.userId === team.userId)
        row.winnings += prize.third;
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
