"use client";

import { ChevronDown, Crown, Medal, Trophy } from "lucide-react";
import { useState } from "react";
import type { LeagueData, PlayoffMatchup, Season } from "../lib/sleeper";

type DisplayMatchup = PlayoffMatchup & { fallback?: boolean };

function score(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function fallbackMatchups(data: LeagueData, season: Season): DisplayMatchup[] {
  const games = data.rivalries
    .flatMap((rivalry) => rivalry.games)
    .filter((game) => game.season === season.year && game.postseason);
  return games
    .map((game, index) => {
      const teamA = season.teams.find(
        (team) => team.userId === game.managerAId,
      );
      const teamB = season.teams.find(
        (team) => team.userId === game.managerBId,
      );
      if (!teamA || !teamB || !game.winnerId) return null;
      const winnerIsA = game.winnerId === game.managerAId;
      const winner = winnerIsA ? teamA : teamB;
      const loser = winnerIsA ? teamB : teamA;
      const winnerPoints = winnerIsA ? game.pointsA : game.pointsB;
      const loserPoints = winnerIsA ? game.pointsB : game.pointsA;
      const championshipIds = new Set(
        [season.champion?.userId, season.runnerUp?.userId].filter(
          (userId): userId is string => Boolean(userId),
        ),
      );
      const isChampionship =
        championshipIds.size === 2 &&
        championshipIds.has(teamA.userId) &&
        championshipIds.has(teamB.userId);
      const isThirdPlace =
        season.thirdPlace?.userId === winner.userId &&
        game.week > season.settings.playoffWeekStart;
      const round = game.week - season.settings.playoffWeekStart + 1;
      return {
        season: season.year,
        week: game.week,
        round,
        matchId: index + 1,
        bracket: "championship",
        placement: isChampionship ? 1 : isThirdPlace ? 3 : null,
        stage: isChampionship
          ? "Championship"
          : isThirdPlace
            ? "Third-place game"
            : round === 1 && season.settings.playoffTeams === 6
              ? "Quarterfinal"
              : round === 2
                ? "Semifinal"
                : `Postseason Week ${game.week}`,
        winner: {
          rosterId: winner.rosterId,
          userId: winner.userId,
          manager: winner.manager,
          teamName: winner.teamName,
          points: winnerPoints,
        },
        loser: {
          rosterId: loser.rosterId,
          userId: loser.userId,
          manager: loser.manager,
          teamName: loser.teamName,
          points: loserPoints,
        },
        fallback: true,
      } satisfies DisplayMatchup;
    })
    .filter((matchup): matchup is DisplayMatchup => Boolean(matchup))
    .sort((a, b) => a.round - b.round || a.matchId - b.matchId);
}

export default function PlayoffHistory({ data }: { data: LeagueData }) {
  const completed = data.seasons.filter(
    (season) => season.status === "complete",
  );
  const [year, setYear] = useState(completed[0]?.year ?? "");
  const season =
    completed.find((candidate) => candidate.year === year) ?? completed[0];
  const matchups: DisplayMatchup[] = season
    ? season.playoffs?.length
      ? season.playoffs
      : fallbackMatchups(data, season)
    : [];
  const rounds = [...new Set(matchups.map((matchup) => matchup.round))];

  if (!season) return null;

  return (
    <section className="playoff-history-section">
      <div className="section-heading">
        <div>
          <span className="section-number">02 / PLAYOFF HISTORY</span>
          <h2>The road to the title.</h2>
        </div>
        <p>
          Every postseason matchup, from the opening round through the
          championship and consolation finish.
        </p>
      </div>

      <div className="playoff-history-toolbar">
        <label className="select-shell">
          <span className="sr-only">Choose a playoff season</span>
          <select value={season.year} onChange={(event) => setYear(event.target.value)}>
            {completed.map((candidate) => (
              <option value={candidate.year} key={candidate.year}>
                {candidate.year} playoffs
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
        {matchups.some((matchup) => matchup.fallback) && (
          <span>Full bracket labels will finish on the next scheduled sync.</span>
        )}
      </div>

      <div className="playoff-podium">
        <article>
          <Crown size={22} aria-hidden="true" />
          <span>Champion</span>
          <strong>{season.champion?.teamName ?? "Unknown"}</strong>
          <small>{season.champion?.manager}</small>
        </article>
        <article>
          <Trophy size={22} aria-hidden="true" />
          <span>Runner-up</span>
          <strong>{season.runnerUp?.teamName ?? "Unknown"}</strong>
          <small>{season.runnerUp?.manager}</small>
        </article>
        <article>
          <Medal size={22} aria-hidden="true" />
          <span>Third place</span>
          <strong>{season.thirdPlace?.teamName ?? "Not recorded"}</strong>
          <small>{season.thirdPlace?.manager}</small>
        </article>
      </div>

      <div className="playoff-round-list">
        {rounds.map((round) => {
          const roundMatchups = matchups.filter(
            (matchup) => matchup.round === round,
          );
          return (
            <section className="playoff-round" key={round}>
              <div>
                <span>ROUND {round}</span>
                <strong>Week {roundMatchups[0]?.week}</strong>
              </div>
              <div className="playoff-matchup-grid">
                {roundMatchups.map((matchup) => (
                  <article
                    className={
                      matchup.placement === 1 ? "is-championship" : ""
                    }
                    key={`${matchup.bracket}-${matchup.matchId}`}
                  >
                    <header>
                      <span>{matchup.stage}</span>
                      <small>
                        {matchup.bracket === "consolation"
                          ? "Consolation"
                          : "Championship bracket"}
                      </small>
                    </header>
                    <div className="playoff-team is-winner">
                      <div>
                        <strong>{matchup.winner.teamName}</strong>
                        <span>{matchup.winner.manager}</span>
                      </div>
                      <b>{score(matchup.winner.points)}</b>
                    </div>
                    <div className="playoff-team">
                      <div>
                        <strong>{matchup.loser.teamName}</strong>
                        <span>{matchup.loser.manager}</span>
                      </div>
                      <b>{score(matchup.loser.points)}</b>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
        {!matchups.length && (
          <div className="playoff-history-empty">
            No completed playoff matchups were found for {season.year}.
          </div>
        )}
      </div>
    </section>
  );
}
