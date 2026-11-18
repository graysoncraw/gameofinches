"use client";

import {
  ChevronDown,
  DraftingCompass,
  Gauge,
  Swords,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { formatPoints, record, standings } from "../lib/league-format";
import TeamAvatar from "./TeamAvatar";
import type { LeagueData } from "../lib/league-types";

export default function SeasonArchive({ data }: { data: LeagueData }) {
  const current = data.seasons[0];
  const completedSeasons = data.seasons.filter(
    (season) => season.status === "complete",
  );
  const latestCompleted = completedSeasons[0];
  const [archiveYear, setArchiveYear] = useState(
    latestCompleted?.year ?? current.year,
  );
  const archive =
    data.seasons.find((season) => season.year === archiveYear) ??
    latestCompleted ??
    current;
  const archiveStandings = standings(archive);
  const topScorer = [...archive.teams].sort(
    (a, b) => b.pointsFor - a.pointsFor,
  )[0];
  return (
    <section className="content-section archive-section">
      <div className="section-heading">
        <div>
          <span className="section-number">04 / YEAR BY YEAR</span>
          <h2>Season archive</h2>
        </div>
        <label className="select-shell">
          <span className="sr-only">Choose a season</span>
          <select
            value={archiveYear}
            onChange={(event) => setArchiveYear(event.target.value)}
          >
            {completedSeasons.map((season) => (
              <option value={season.year} key={season.year}>
                {season.year} season
              </option>
            ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </label>
      </div>

      <div className="season-feature">
        <article className="champion-panel">
          <span className="panel-label">{archive.year} CHAMPION</span>
          <div className="trophy-watermark" aria-hidden="true">
            <Trophy />
          </div>
          {archive.champion ? (
            <>
              <TeamAvatar team={archive.champion} size="large" />
              <h3>{archive.champion.teamName}</h3>
              <p>@{archive.champion.manager}</p>
              <div className="champ-record">
                <div>
                  <span>Regular season</span>
                  <strong>{record(archive.champion)}</strong>
                </div>
                <div>
                  <span>Points scored</span>
                  <strong>{formatPoints(archive.champion.pointsFor)}</strong>
                </div>
              </div>
            </>
          ) : (
            <p>Champion data is not yet available.</p>
          )}
        </article>

        <div className="season-standings">
          <div className="standings-head">
            <div>
              <span>FINAL REGULAR SEASON TABLE</span>
              <strong>{archive.year}</strong>
            </div>
            <span>{archive.teams.length} teams</span>
          </div>
          {archiveStandings.map((team, index) => (
            <div className="standing-row" key={team.rosterId}>
              <span className="standing-rank">{index + 1}</span>
              <TeamAvatar team={team} size="small" />
              <div className="standing-name">
                <strong>{team.teamName}</strong>
                <span>@{team.manager}</span>
              </div>
              <span className="standing-record">{record(team)}</span>
              <strong className="standing-points">
                {formatPoints(team.pointsFor)}
                <small>PF</small>
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className="season-notes">
        <div>
          <Swords size={18} aria-hidden="true" />
          <span>Championship</span>
          <strong>
            {archive.champion?.teamName ?? "TBD"} over{" "}
            {archive.runnerUp?.teamName ?? "TBD"}
          </strong>
        </div>
        <div>
          <Gauge size={18} aria-hidden="true" />
          <span>Points leader</span>
          <strong>
            {topScorer?.teamName} · {formatPoints(topScorer?.pointsFor ?? 0)}
          </strong>
        </div>
        <div>
          <DraftingCompass size={18} aria-hidden="true" />
          <span>Draft class</span>
          <strong>{archive.draft?.picks.length ?? 0} picks</strong>
        </div>
      </div>
    </section>
  );
}
