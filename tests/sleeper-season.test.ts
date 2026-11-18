import assert from "node:assert/strict";
import test from "node:test";
import { loadSeason } from "../app/lib/sleeper/season.ts";
import type { SleeperLeague } from "../app/lib/sleeper/types.ts";
import type { sleeperFetch } from "../app/lib/sleeper/client.ts";

const league: SleeperLeague = {
  league_id: "league",
  name: "Test League",
  season: "2026",
  status: "in_season",
  previous_league_id: null,
  total_rosters: 2,
  avatar: null,
  settings: { playoff_week_start: 15 },
  scoring_settings: { rec: 1 },
  roster_positions: ["QB"],
};

test("season ingestion archives only completed games while exposing current scores separately", async () => {
  const requested: string[] = [];
  const fetcher: typeof sleeperFetch = async <T>(path: string): Promise<T> => {
    requested.push(path);
    let value: unknown = [];
    if (path.endsWith("/users"))
      value = [1, 2].map((id) => ({
        user_id: String(id),
        display_name: `Manager ${id}`,
        metadata: { team_name: `Team ${id}` },
      }));
    if (path.endsWith("/rosters"))
      value = [1, 2].map((id) => ({
        roster_id: id,
        owner_id: String(id),
        players: [String(id)],
        settings: {},
      }));
    if (path.includes("/matchups/")) {
      const week = Number(path.split("/").at(-1));
      value = [1, 2].map((id) => ({
        roster_id: id,
        matchup_id: 1,
        points: week === 1 ? 100 : id * 50,
        custom_points: null,
        starters: [String(id)],
        players: [String(id)],
        players_points: { [String(id)]: week === 1 ? 100 : 50 },
      }));
    }
    return value as T;
  };
  const result = await loadSeason(
    league,
    {
      "1": { full_name: "Player 1", position: "QB" },
      "2": { full_name: "Player 2", position: "QB" },
    },
    { season: "2026", week: 2, lastCompletedWeek: 1, phase: "regular" },
    fetcher,
  );
  assert.equal(result.matchupGames.length, 1);
  assert.equal(result.matchupGames[0].winnerId, null);
  assert.deepEqual(
    result.teamFacts.map((fact) => fact.result),
    ["tie", "tie"],
  );
  assert.ok(result.playerFacts.every((fact) => fact.week === 1));
  assert.ok(result.performances.every((performance) => performance.week === 1));
  assert.equal(result.currentMatchups[0].away.points, 100);
  assert.equal(result.currentMatchups[0].status, "in-progress");
  assert.equal(
    requested.filter((path) => path.includes("/matchups/")).length,
    2,
  );
  assert.equal(result.rosterFacts.length, 2);
  assert.ok(result.rosterFacts.every((fact) => fact.week === 0));
});
