"use client";

import { ArrowRight, ChevronDown, Crown, Medal, Trophy } from "lucide-react";
import type { CSSProperties } from "react";
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
    .filter((matchup) => matchup !== null)
    .sort((a, b) => a.round - b.round || a.matchId - b.matchId);
}

function roundLabel(
  round: number,
  roundIndex: number,
  roundCount: number,
  playoffTeams: number,
) {
  if (roundIndex === roundCount - 1) return "Finals";
  if (roundIndex === roundCount - 2) return "Semifinals";
  if (roundIndex === 0 && playoffTeams === 6) return "Quarterfinals";
  return `Round ${round}`;
}

function matchupClassName(matchup: DisplayMatchup) {
  return [
    "playoff-bracket-match",
    matchup.placement === 1 ? "is-championship" : "",
    matchup.placement && matchup.placement > 1 ? "is-placement" : "",
    matchup.bracket === "consolation" ? "is-consolation" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function PlayoffBracket({
  destination,
  matchups,
  season,
}: {
  destination: string;
  matchups: DisplayMatchup[];
  season: Season;
}) {
  const rounds = [...new Set(matchups.map((matchup) => matchup.round))].sort(
    (a, b) => a - b,
  );

  return (
    <div className="playoff-bracket-shell">
      <div className="playoff-bracket-direction" aria-hidden="true">
        <span>Opening round</span>
        <ArrowRight size={17} />
        <span>{destination}</span>
      </div>
      <div className="playoff-bracket-scroll">
        <div
          className="playoff-bracket-track"
          role="group"
          aria-label={`${season.year} ${destination.toLowerCase()} bracket`}
        >
          {rounds.map((round, roundIndex) => {
            const roundMatchups = matchups
              .filter((matchup) => matchup.round === round)
              .sort(
                (a, b) =>
                  Number(b.placement === 1) -
                    Number(a.placement === 1) ||
                  (a.placement ?? Number.MAX_SAFE_INTEGER) -
                    (b.placement ?? Number.MAX_SAFE_INTEGER) ||
                  a.matchId - b.matchId,
              );
            const label = roundLabel(
              round,
              roundIndex,
              rounds.length,
              season.settings.playoffTeams,
            );
            const matchupStyle = {
              "--match-count": Math.max(1, roundMatchups.length),
            } as CSSProperties;

            return (
              <section
                className="playoff-bracket-round"
                key={round}
                aria-label={`${label}, week ${roundMatchups[0]?.week}`}
              >
                <header className="playoff-bracket-round-heading">
                  <span>{label}</span>
                  <strong>Week {roundMatchups[0]?.week}</strong>
                </header>
                <div
                  className={`playoff-bracket-matchups ${
                    roundMatchups.length > 1 ? "has-multiple" : ""
                  }`}
                  style={matchupStyle}
                >
                  {roundMatchups.map((matchup) => (
                    <article
                      className={matchupClassName(matchup)}
                      key={`${round}-${matchup.bracket}-${matchup.matchId}`}
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
        </div>
      </div>
    </div>
  );
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
  const championshipMatchups = matchups.filter(
    (matchup) => matchup.bracket === "championship",
  );
  const consolationMatchups = matchups.filter(
    (matchup) => matchup.bracket === "consolation",
  );

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
          <select
            value={season.year}
            onChange={(event) => setYear(event.target.value)}
          >
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

      {matchups.length ? (
        <>
          {championshipMatchups.length > 0 && (
            <PlayoffBracket
              destination="Championship"
              matchups={championshipMatchups}
              season={season}
            />
          )}
          {consolationMatchups.length > 0 && (
            <PlayoffBracket
              destination="Consolation finish"
              matchups={consolationMatchups}
              season={season}
            />
          )}
        </>
      ) : (
        <div className="playoff-history-empty">
          No completed playoff matchups were found for {season.year}.
        </div>
      )}
    </section>
  );
}
