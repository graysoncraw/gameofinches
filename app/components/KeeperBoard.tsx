"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- navigation intentionally uses full-page links. */

import { Crown, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { KeeperRecord } from "../lib/keepers";
import TeamAvatar from "./TeamAvatar";
import type { LeagueData } from "../lib/league-types";

export default function KeeperBoard({
  data,
  keepers,
}: {
  data: LeagueData;
  keepers: KeeperRecord[];
}) {
  const current = data.seasons[0];
  const [keeperYear, setKeeperYear] = useState(current.year);
  const keeperYears = [
    ...new Set([current.year, ...keepers.map((item) => item.season)]),
  ].sort((a, b) => Number(b) - Number(a));
  const selectedKeepers = keepers.filter((item) => item.season === keeperYear);
  const keeperTeams =
    data.seasons.find((item) => item.year === keeperYear)?.teams ??
    current.teams;
  return (
    <section className="content-section keeper-section" id="keepers">
      <div className="section-heading">
        <div>
          <span className="section-number">07 / KEEPER DESK</span>
          <h2>{keeperYear} keeper board</h2>
        </div>
        <p>
          The official manual ledger: up to {current.settings.maxKeepers}{" "}
          keepers per franchise, with their draft cost and eligibility clock.
        </p>
      </div>

      <div className="keeper-toolbar">
        <div className="year-tabs keeper-years" aria-label="Keeper season">
          {keeperYears.map((year) => (
            <button
              type="button"
              key={year}
              className={keeperYear === year ? "active" : ""}
              onClick={() => setKeeperYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
        <div className="keeper-legend">
          <span>
            <i className="year-three" /> Year 1 · 3 left
          </span>
          <span>
            <i className="year-two" /> Year 2 · 2 left
          </span>
          <span>
            <i className="year-one" /> Year 3 · final year
          </span>
        </div>
      </div>

      {selectedKeepers.length ? (
        <div className="keeper-history-grid">
          {keeperTeams.map((team) => {
            const teamKeepers = selectedKeepers
              .filter((keeper) => keeper.rosterId === team.rosterId)
              .sort((a, b) => a.slot - b.slot);
            if (!teamKeepers.length) return null;
            return (
              <article className="keeper-history-team" key={team.rosterId}>
                <div className="keeper-history-head">
                  <TeamAvatar team={team} size="small" />
                  <div>
                    <strong>{teamKeepers[0]?.teamName || team.teamName}</strong>
                    <span>@{teamKeepers[0]?.managerName || team.manager}</span>
                  </div>
                </div>
                {teamKeepers.map((keeper) => (
                  <div
                    className={`keeper-history-player years-${keeper.yearsRemaining}`}
                    key={`${keeper.rosterId}-${keeper.slot}`}
                  >
                    <ShieldCheck size={18} aria-hidden="true" />
                    <div>
                      <strong>{keeper.playerName}</strong>
                      <span>
                        {keeper.position || "Keeper"}{" "}
                        {keeper.nflTeam ? `· ${keeper.nflTeam}` : ""}
                      </span>
                    </div>
                    <div className="keeper-cost">
                      <span>Cost</span>
                      <strong>R{keeper.costRound}</strong>
                    </div>
                  </div>
                ))}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="keeper-open">
          <div className="keeper-open-copy">
            <span className="open-stamp">SELECTIONS OPEN</span>
            <h3>No official {keeperYear} keepers are locked yet.</h3>
            <p>
              Each franchise has two slots waiting. The commissioner portal is
              the source of truth because Sleeper only receives keepers when the
              draft board is finalized.
            </p>
            <a className="button button--keeper" href="/admin">
              Open commissioner desk <Crown size={16} aria-hidden="true" />
            </a>
          </div>
          <div className="keeper-slots">
            {keeperTeams.map((team) => (
              <div key={team.rosterId}>
                <TeamAvatar team={team} size="small" />
                <span>{team.teamName}</span>
                <i />
                <i />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
