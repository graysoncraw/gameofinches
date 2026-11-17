/* eslint-disable @next/next/no-html-link-for-pages -- navigation intentionally uses full-page links. */

import {
  CalendarDays,
  Crown,
  DraftingCompass,
  History,
  Trophy,
  Users,
} from "lucide-react";
import WeeklyRoundup from "./WeeklyRoundup";
import type { LeagueData } from "../lib/league-types";

export default function LeagueOverview({ data }: { data: LeagueData }) {
  const current = data.seasons[0];
  const latestCompleted = data.seasons.find(
    (season) => season.status === "complete",
  );
  return (
    <>
      <section className="hero" id="top">
        <div className="yard-lines" aria-hidden="true" />
        <div className="hero-copy">
          <p className="kicker">
            {current.year} SEASON ·{" "}
            {data.weekly?.context.week
              ? `WEEK ${data.weekly.context.week}`
              : data.weekly?.context.phase === "complete"
                ? "SEASON COMPLETE"
                : "THE LONG GAME"}{" "}
            · {current.teams.length} FRANCHISES
          </p>
          <h1>
            Every inch
            <span>counts.</span>
          </h1>
          <p className="hero-deck">
            {data.seasons.length} seasons of receipts. Every champion, draft
            pick, rivalry, and hard-earned point in one living league archive.
          </p>
          <div className="hero-actions">
            <a className="button button--primary" href="/history">
              Explore the archive <History size={17} aria-hidden="true" />
            </a>
            <a className="button button--ghost" href="#this-week">
              This week in GoI
            </a>
          </div>
        </div>

        <aside className="hero-scoreboard" aria-label="League snapshot">
          <div className="scoreboard-head">
            <span>League snapshot</span>
            <span>{current.year}</span>
          </div>
          <div className="scoreboard-grid">
            <div>
              <span>Format</span>
              <strong>2QB PPR</strong>
            </div>
            <div>
              <span>Keepers</span>
              <strong>{current.settings.maxKeepers}</strong>
            </div>
            <div>
              <span>Playoff</span>
              <strong>{current.settings.playoffTeams} teams</strong>
            </div>
            <div>
              <span>FAAB</span>
              <strong>${current.settings.waiverBudget}</strong>
            </div>
          </div>
          {latestCompleted?.champion && (
            <div className="reigning-champ">
              <div className="champ-icon">
                <Crown size={22} aria-hidden="true" />
              </div>
              <div>
                <span>Reigning champion</span>
                <strong>{latestCompleted.champion.teamName}</strong>
                <small>
                  {latestCompleted.champion.manager} · {latestCompleted.year}
                </small>
              </div>
            </div>
          )}
          <div className="inch-meter" aria-hidden="true">
            {Array.from({ length: 25 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
        </aside>
      </section>

      <section className="quick-stats" aria-label="League quick stats">
        <div>
          <Users size={20} aria-hidden="true" />
          <span>Franchises</span>
          <strong>{current.teams.length}</strong>
        </div>
        <div>
          <CalendarDays size={20} aria-hidden="true" />
          <span>Seasons logged</span>
          <strong>{data.seasons.length}</strong>
        </div>
        <div>
          <Trophy size={20} aria-hidden="true" />
          <span>Distinct champions</span>
          <strong>{data.distinctChampionCount}</strong>
        </div>
        <div>
          <DraftingCompass size={20} aria-hidden="true" />
          <span>Draft picks archived</span>
          <strong>
            {data.seasons.reduce(
              (total, season) => total + (season.draft?.picks.length ?? 0),
              0,
            )}
          </strong>
        </div>
      </section>
      <WeeklyRoundup data={data} />
    </>
  );
}
