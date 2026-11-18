import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWeeklyMatchups,
  buildWeeklyRecap,
  resolveLeagueWeek,
} from "../app/lib/weekly-update.ts";
import type { LeagueWeek } from "../app/lib/weekly-update.ts";
import type {
  SleeperMatchup,
  SleeperNFLState,
} from "../app/lib/sleeper/types.ts";
import type { Team } from "../app/lib/league-types.ts";
import type { WeeklyTeamFact, WeeklyPlayerFact } from "../app/lib/chaos.ts";

const nfl: SleeperNFLState = {
  season: "2026",
  season_type: "regular",
  leg: 11,
  week: 11,
  display_week: 10,
};
const league = {
  season: "2026",
  status: "in_season",
  settings: { last_scored_leg: 10, playoff_week_start: 15 },
};
const context = resolveLeagueWeek(league, nfl);
const team = (rosterId: number): Team => ({
  rosterId,
  userId: String(rosterId),
  teamName: `Team ${rosterId}`,
  manager: `Manager ${rosterId}`,
  username: null,
  avatar: null,
  commissioner: false,
  wins: 0,
  losses: 0,
  ties: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  potentialPoints: 0,
  waiverBudgetUsed: 0,
  waiverPosition: 0,
  playerCount: 0,
});
const row = (
  rosterId: number,
  matchupId: number | null,
  points: number,
): SleeperMatchup => ({
  roster_id: rosterId,
  matchup_id: matchupId,
  points,
  custom_points: null,
  players: [],
  starters: [],
});
const fact = (rosterId: number, points: number, week = 10): WeeklyTeamFact => ({
  season: "2026",
  week,
  rosterId,
  userId: String(rosterId),
  manager: `Manager ${rosterId}`,
  teamName: `Team ${rosterId}`,
  matchupId: 1,
  opponentRosterId: rosterId === 1 ? 2 : 1,
  opponentId: rosterId === 1 ? "2" : "1",
  points,
  optimalPoints: points,
  postseason: false,
  result: rosterId === 1 ? "win" : "loss",
});

test("uses the NFL scoring leg rather than the lagging display week", () => {
  assert.deepEqual(context, {
    season: "2026",
    week: 11,
    lastCompletedWeek: 10,
    phase: "regular",
  });
  assert.equal(
    resolveLeagueWeek({ ...league, settings: {} }, nfl).lastCompletedWeek,
    10,
  );
  assert.equal(
    resolveLeagueWeek({ ...league, settings: { last_scored_leg: 11 } }, nfl)
      .lastCompletedWeek,
    10,
  );
});

test("pre-draft leagues and future seasons do not inherit current NFL scores", () => {
  for (const sample of [
    { ...league, status: "pre_draft" },
    { ...league, season: "2027" },
  ]) {
    assert.equal(resolveLeagueWeek(sample, nfl).week, null);
    assert.equal(resolveLeagueWeek(sample, nfl).lastCompletedWeek, 0);
  }
});

test("fantasy playoffs follow league settings; NFL playoffs do not restart fantasy Week 1", () => {
  assert.equal(
    resolveLeagueWeek(league, { ...nfl, leg: 15 }).phase,
    "playoffs",
  );
  const postseason = resolveLeagueWeek(league, {
    ...nfl,
    season_type: "post",
    week: 1,
    leg: 1,
  });
  assert.equal(postseason.phase, "complete");
  assert.equal(postseason.week, null);
  assert.equal(postseason.lastCompletedWeek, 18);
  assert.equal(
    resolveLeagueWeek(
      { ...league, status: "complete", settings: { last_scored_leg: 17 } },
      nfl,
    ).lastCompletedWeek,
    17,
  );
});

test("matchup cards pair rosters, honor commissioner scores, and omit byes", () => {
  const rows = [
    row(1, 1, 10),
    { ...row(2, 1, 20), custom_points: 0 },
    row(3, null, 0),
    row(4, 2, 0),
  ];
  const matches = buildWeeklyMatchups(rows, [
    team(1),
    team(2),
    team(3),
    team(4),
  ]);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].away.points, 0);
  assert.equal(matches[0].status, "in-progress");
  assert.equal(
    buildWeeklyMatchups([row(1, 1, 0), row(2, 1, 0)], [team(1), team(2)])[0]
      .status,
    "scheduled",
  );
  assert.equal(
    buildWeeklyMatchups(rows, [team(1), team(2)], true)[0].status,
    "final",
  );
});

test("recap uses only the most recent completed week in this season", () => {
  const facts = [
    fact(1, 101),
    fact(2, 100),
    fact(1, 999, 11),
    { ...fact(2, 900), season: "2025" },
  ];
  const recap = buildWeeklyRecap(context, facts, []);
  assert.equal(recap?.week, 10);
  assert.match(recap!.highlights[0].text, /101\.00/);
  assert.match(recap!.highlights[1].text, /1\.00/);
  assert.doesNotMatch(JSON.stringify(recap), /999|900/);
  assert.deepEqual(buildWeeklyRecap(context, facts, []), recap);
});

test("ties and shared weekly highs are reported honestly", () => {
  const facts = [
    { ...fact(1, 100), result: "tie" as const },
    { ...fact(2, 100), result: "tie" as const },
  ];
  const recap = buildWeeklyRecap(context, facts, []);
  assert.match(
    recap!.highlights[0].text,
    /Team 1 & Team 2 each dropped 100\.00/,
  );
  assert.equal(recap!.highlights[1].label, "Perfectly awkward");
});

test("recap celebrates starters and never invents results for empty weeks", () => {
  const player: WeeklyPlayerFact = {
    season: "2026",
    week: 10,
    rosterId: 1,
    userId: "1",
    playerId: "p1",
    playerName: "Starter",
    position: "QB",
    nflTeam: "KC",
    points: 40,
    starter: true,
  };
  const recap = buildWeeklyRecap(
    context,
    [fact(1, 101), fact(2, 100)],
    [
      player,
      {
        ...player,
        playerId: "p2",
        playerName: "Bench",
        points: 60,
        starter: false,
      },
    ],
  );
  assert.match(recap!.highlights.at(-1)!.text, /Starter/);
  assert.doesNotMatch(JSON.stringify(recap), /Bench/);
  const opening: LeagueWeek = { ...context, week: 1, lastCompletedWeek: 0 };
  assert.equal(buildWeeklyRecap(opening, [fact(1, 20, 1)], [player]), null);
});
