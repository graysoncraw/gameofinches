import {
  optimalLineupPoints,
  type WeeklyTeamFact,
  type WeeklyPlayerFact,
} from "../chaos.ts";
import type {
  Season,
  Team,
  PlayoffMatchup,
  RivalryGame,
  PlayerPerformance,
} from "../league-types";
import type {
  SleeperLeague,
  SleeperUser,
  SleeperRoster,
  SleeperDraft,
  SleeperPick,
  BracketMatch,
  SleeperMatchup,
  PlayerLabel,
} from "./types";
import { sleeperFetch } from "./client.ts";
import { playerLabel } from "./players.ts";
import {
  matchupPairs,
  buildWeeklyMatchups,
  type LeagueWeek,
  type WeeklyMatchup,
} from "../weekly-update.ts";

export type SeasonLoad = {
  season: Season;
  currentMatchups: WeeklyMatchup[];
  matchupGames: RivalryGame[];
  performances: PlayerPerformance[];
  teamFacts: WeeklyTeamFact[];
  playerFacts: WeeklyPlayerFact[];
  rosterFacts: WeeklyPlayerFact[];
};

function points(settings: Record<string, number>, key: string) {
  return (settings[key] ?? 0) + (settings[`${key}_decimal`] ?? 0) / 100;
}

export async function loadSeason(
  league: SleeperLeague,
  players: Record<string, PlayerLabel>,
  context: LeagueWeek,
  fetcher: typeof sleeperFetch = sleeperFetch,
): Promise<SeasonLoad> {
  const [
    users,
    rosters,
    drafts,
    winnersBracket,
    losersBracket,
    weeklyMatchups,
  ] = await Promise.all([
    fetcher<SleeperUser[]>(`/league/${league.league_id}/users`),
    fetcher<SleeperRoster[]>(`/league/${league.league_id}/rosters`),
    fetcher<SleeperDraft[]>(`/league/${league.league_id}/drafts`),
    fetcher<BracketMatch[]>(`/league/${league.league_id}/winners_bracket`),
    fetcher<BracketMatch[]>(`/league/${league.league_id}/losers_bracket`),
    Promise.all(
      Array.from(
        { length: context.week ?? context.lastCompletedWeek },
        (_, index) =>
          fetcher<SleeperMatchup[]>(
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
    ? await fetcher<SleeperPick[]>(`/draft/${primaryDraft.draft_id}/picks`)
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
    if (week > context.lastCompletedWeek) return;
    for (const [first, second] of matchupPairs(matchups)) {
      const teamA = teamByRosterId.get(first.roster_id);
      const teamB = teamByRosterId.get(second.roster_id);
      if (!teamA || !teamB) continue;
      const pointsA = Number(first.custom_points ?? first.points ?? 0);
      const pointsB = Number(second.custom_points ?? second.points ?? 0);
      if (pointsA === 0 && pointsB === 0) continue;
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
  const maxWinnerRound = Math.max(0, ...winnersBracket.map((match) => match.r));
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
      if (week > context.lastCompletedWeek) return null;
      const weekRows = weeklyMatchups[week - 1] ?? [];
      const winnerRow = weekRows.find(
        (row) => row.roster_id === winner.rosterId,
      );
      const loserRow = weekRows.find((row) => row.roster_id === loser.rosterId);
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
          points: Number(winnerRow?.custom_points ?? winnerRow?.points ?? 0),
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
    currentMatchups: buildWeeklyMatchups(
      weeklyMatchups[(context.week ?? context.lastCompletedWeek) - 1] ?? [],
      teams,
      context.phase === "complete",
    ),
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
              const name = [pick.metadata?.first_name, pick.metadata?.last_name]
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
