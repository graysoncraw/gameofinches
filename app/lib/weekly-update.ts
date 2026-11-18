import type { WeeklyPlayerFact, WeeklyTeamFact } from "./chaos";
import type { Team } from "./league-types";
import type {
  SleeperLeague,
  SleeperMatchup,
  SleeperNFLState,
} from "./sleeper/types";

export type LeagueWeek = {
  season: string;
  week: number | null;
  lastCompletedWeek: number;
  phase: "preseason" | "regular" | "playoffs" | "complete";
};

export type WeeklyMatchup = {
  id: number;
  home: Pick<Team, "rosterId" | "userId" | "teamName"> & { points: number };
  away: Pick<Team, "rosterId" | "userId" | "teamName"> & { points: number };
  status: "scheduled" | "in-progress" | "final";
};

export type WeeklyRecap = {
  week: number;
  headline: string;
  introduction: string;
  highlights: Array<{ label: string; text: string }>;
};

export type WeeklyOverview = {
  context: LeagueWeek;
  matchups: WeeklyMatchup[];
  recap: WeeklyRecap | null;
};

const validWeek = (value: number | undefined) =>
  Number.isInteger(value) && value! >= 0 && value! <= 18;

export function resolveLeagueWeek(
  league: Pick<SleeperLeague, "season" | "status" | "settings">,
  nfl: SleeperNFLState,
): LeagueWeek {
  const base = { season: league.season, week: null, lastCompletedWeek: 0 };
  if (
    league.status === "complete" ||
    Number(league.season) < Number(nfl.season)
  ) {
    return {
      ...base,
      lastCompletedWeek: validWeek(league.settings.last_scored_leg)
        ? league.settings.last_scored_leg
        : 18,
      phase: "complete",
    };
  }
  if (
    league.status === "pre_draft" ||
    league.status === "drafting" ||
    league.season !== nfl.season ||
    nfl.season_type === "pre"
  ) {
    return { ...base, phase: "preseason" };
  }
  if (nfl.season_type === "post" || nfl.season_type === "off") {
    return { ...base, lastCompletedWeek: 18, phase: "complete" };
  }
  // NFL playoff weeks restart at one. Only regular-season legs are fantasy weeks.
  const leg = nfl.leg || nfl.week || league.settings.leg || 1;
  const week = Math.max(1, Math.min(18, Math.trunc(leg)));
  const lastCompletedWeek = Math.min(
    week - 1,
    validWeek(league.settings.last_scored_leg)
      ? league.settings.last_scored_leg
      : week - 1,
  );
  return {
    season: league.season,
    week,
    lastCompletedWeek,
    phase:
      league.settings.playoff_week_start > 0 &&
      week >= league.settings.playoff_week_start
        ? "playoffs"
        : "regular",
  };
}

export function matchupPairs(rows: SleeperMatchup[]) {
  const groups = new Map<number, SleeperMatchup[]>();
  for (const row of rows) {
    if (row.matchup_id === null) continue;
    const group = groups.get(row.matchup_id) ?? [];
    group.push(row);
    groups.set(row.matchup_id, group);
  }
  return [...groups.values()].filter(
    (group): group is [SleeperMatchup, SleeperMatchup] => group.length === 2,
  );
}

export function buildWeeklyMatchups(
  rows: SleeperMatchup[],
  teams: Team[],
  final = false,
): WeeklyMatchup[] {
  const byRoster = new Map(teams.map((team) => [team.rosterId, team]));
  return matchupPairs(rows)
    .flatMap(([first, second]) => {
      const home = byRoster.get(first.roster_id);
      const away = byRoster.get(second.roster_id);
      if (!home || !away) return [];
      const pointsHome = Number(first.custom_points ?? first.points ?? 0);
      const pointsAway = Number(second.custom_points ?? second.points ?? 0);
      return [
        {
          id: first.matchup_id!,
          home: {
            rosterId: home.rosterId,
            userId: home.userId,
            teamName: home.teamName,
            points: pointsHome,
          },
          away: {
            rosterId: away.rosterId,
            userId: away.userId,
            teamName: away.teamName,
            points: pointsAway,
          },
          status: final
            ? ("final" as const)
            : pointsHome !== 0 || pointsAway !== 0
              ? ("in-progress" as const)
              : ("scheduled" as const),
        },
      ];
    })
    .sort((a, b) => a.id - b.id);
}

export function buildWeeklyRecap(
  context: LeagueWeek,
  teams: WeeklyTeamFact[],
  players: WeeklyPlayerFact[],
): WeeklyRecap | null {
  const eligible = teams.filter(
    (fact) =>
      fact.season === context.season &&
      fact.week > 0 &&
      fact.week <= context.lastCompletedWeek,
  );
  const week = Math.max(0, ...eligible.map((fact) => fact.week));
  if (!week) return null;
  const rows = eligible.filter((fact) => fact.week === week);
  const byUser = new Map(rows.map((fact) => [fact.userId, fact]));
  const sorted = [...rows].sort(
    (a, b) => b.points - a.points || a.rosterId - b.rosterId,
  );
  const leaders = sorted.filter((fact) => fact.points === sorted[0].points);
  const closest = rows
    .filter((fact) => fact.result === "win" && byUser.has(fact.opponentId))
    .sort(
      (a, b) =>
        a.points -
          byUser.get(a.opponentId)!.points -
          (b.points - byUser.get(b.opponentId)!.points) ||
        a.rosterId - b.rosterId,
    )[0];
  const starter = players
    .filter(
      (fact) =>
        fact.season === context.season &&
        fact.week === week &&
        fact.starter &&
        byUser.has(fact.userId),
    )
    .sort(
      (a, b) => b.points - a.points || a.playerId.localeCompare(b.playerId),
    )[0];
  const points = (value: number) => value.toFixed(2);
  const highlights = [
    {
      label: "Scoreboard royalty",
      text: `${leaders.map((fact) => fact.teamName).join(" & ")} ${leaders.length === 1 ? "dropped" : "each dropped"} ${points(sorted[0].points)} points. The group chat has been notified.`,
    },
  ];
  if (closest) {
    const opponent = byUser.get(closest.opponentId)!;
    highlights.push({
      label: "Sweaty palms award",
      text: `${closest.teamName} scaped by ${opponent.teamName} by ${points(closest.points - opponent.points)}. Every decimal really does count.`,
    });
  } else if (rows.some((fact) => fact.result === "tie")) {
    highlights.push({
      label: "Perfectly awkward",
      text: "A tie hit the scoreboard. All that lineup tinkering, just to agree to disagree.",
    });
  }
  if (starter)
    highlights.push({
      label: "Main character energy",
      text: `${starter.playerName} put up ${points(starter.points)} for ${byUser.get(starter.userId)!.teamName}. Someone owes that player a thank-you note.`,
    });
  const headlines = [
    "The receipts are in.",
    "Another week. More ammunition.",
    "Small margins. Big feelings.",
    "The group chat has entered the chat.",
  ];
  return {
    week,
    headline: headlines[week % headlines.length],
    introduction: `Week ${week} is in the books. ${context.week ? `Week ${context.week} gets a fresh scoreboard` : "The season gets its final curtain call"}, but the receipts stay forever.`,
    highlights,
  };
}
