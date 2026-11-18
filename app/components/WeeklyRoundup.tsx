/* eslint-disable @next/next/no-html-link-for-pages -- navigation intentionally uses full-page links. */

import { ArrowUpRight, Radio, Sparkles } from "lucide-react";
import type { LeagueData } from "../lib/league-types";
import { formatPoints, record, standings } from "../lib/league-format";
import SnapshotRefresh from "./SnapshotRefresh";

export default function WeeklyRoundup({ data }: { data: LeagueData }) {
  const current = data.seasons[0];
  const weekly = data.weekly;
  const context = weekly?.context;
  const recap = weekly?.recap;
  const label = context?.week
    ? `Week ${context.week}`
    : context?.phase === "complete"
      ? "Season complete"
      : "Preseason";
  const updated = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(data.fetchedAt));

  return (
    <section
      className="weekly-section"
      id="this-week"
      aria-labelledby="weekly-title"
    >
      <SnapshotRefresh nextSyncAt={data.nextSyncAt} />
      <div className="weekly-heading">
        <div>
          <span className="section-number">
            <Radio size={14} aria-hidden="true" /> {current.year} /{" "}
            {label.toUpperCase()}
          </span>
          <h2 id="weekly-title">This week in inches.</h2>
        </div>
        <p>League drama, measured to two decimal places.</p>
      </div>

      <article className="weekly-recap">
        <div className="weekly-recap-intro">
          <span className="weekly-eyebrow">
            <Sparkles size={16} aria-hidden="true" />{" "}
            {recap
              ? `WEEK ${recap.week} RECAP`
              : "FROM THE COMMISSIONER’S COUCH"}
          </span>
          <h3>
            {recap?.headline ??
              (context?.phase === "preseason"
                ? "Fresh rosters. Reckless optimism."
                : "The receipts are warming up.")}
          </h3>
          <p>
            {recap?.introduction ??
              (context?.phase === "preseason"
                ? "Everyone is undefeated in the group chat. Enjoy it while it lasts: the first weekly recap arrives after the opening scores are final."
                : "The next recap arrives after Sleeper finalizes a scoring week. Until then, your lineup decisions remain defensible.")}
          </p>
        </div>
        {recap && (
          <div className="weekly-highlights">
            {recap.highlights.map((highlight) => (
              <div key={highlight.label}>
                <span>{highlight.label}</span>
                <p>{highlight.text}</p>
              </div>
            ))}
          </div>
        )}
      </article>

      <div className="weekly-tables">
        <div className="weekly-scoreboard">
          <div className="weekly-table-head">
            <h3>
              {context?.phase === "complete"
                ? "Final matchups"
                : `${label} matchups`}
            </h3>
            <span>
              {context?.phase === "complete" ? "FINAL" : "THE MATCHUPS"}
            </span>
          </div>
          {weekly?.matchups.length ? (
            weekly.matchups.map((matchup) => (
              <article className="weekly-matchup" key={matchup.id}>
                <span className="matchup-status">
                  {matchup.status === "final"
                    ? "Final"
                    : matchup.status === "scheduled"
                      ? "Scheduled"
                      : "Scores so far"}
                </span>
                {[matchup.home, matchup.away].map((team) => (
                  <div key={team.rosterId}>
                    <a href={`/teams/${team.userId}`}>{team.teamName}</a>
                    <strong>
                      {matchup.status === "scheduled"
                        ? "—"
                        : team.points.toFixed(2)}
                    </strong>
                  </div>
                ))}
              </article>
            ))
          ) : (
            <p className="weekly-empty">
              {weekly
                ? "Matchups will appear when Sleeper publishes the schedule."
                : "The current scoreboard returns with the next successful Sleeper sync."}
            </p>
          )}
        </div>
        <div className="weekly-standings">
          <div className="weekly-table-head">
            <h3>{current.year} standings</h3>
            <span>W–L–T / PF</span>
          </div>
          <ol>
            {standings(current).map((team, index) => (
              <li key={team.rosterId}>
                <span className="weekly-rank">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <a href={`/teams/${team.userId}`}>{team.teamName}</a>
                <span className="weekly-record">{record(team)}</span>
                <strong>{formatPoints(team.pointsFor)}</strong>
              </li>
            ))}
          </ol>
          <a className="weekly-all-teams" href="/teams">
            Meet the franchises <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
      <p className="weekly-sync">
        Sleeper snapshot · <time dateTime={data.fetchedAt}>{updated}</time> ·
        Refreshes at 6 AM and 6 PM Central. Scores may change until finalized.
      </p>
    </section>
  );
}
