/* eslint-disable @next/next/no-html-link-for-pages -- navigation intentionally uses full-page links. */

import { ArrowUpRight, Clock3, Gauge, Medal, Trophy } from "lucide-react";
import type { KeeperRecord } from "../lib/keepers";
import type { AllTimeManager, LeagueData } from "../lib/league-types";
import { formatPoints } from "../lib/league-format";
import TeamAvatar from "./TeamAvatar";
import LeagueNavigation from "./LeagueNavigation";
import LeagueOverview from "./LeagueOverview";
import DraftRoom from "./DraftRoom";
import KeeperBoard from "./KeeperBoard";
import SeasonArchive from "./SeasonArchive";
import LeagueRecords from "./LeagueRecords";
import PlayoffHistory from "./PlayoffHistory";
import TransactionHistory from "./TransactionHistory";
import {
  FranchiseDossier,
  KeeperWarRoom,
  LeagueSuperlatives,
  RecordBookExpansion,
} from "./LeagueExtras";

function ManagerRow({
  manager,
  rank,
}: {
  manager: AllTimeManager;
  rank: number;
}) {
  return (
    <tr>
      <td className="rank-cell">{String(rank).padStart(2, "0")}</td>
      <td>
        <div className="manager-cell">
          <TeamAvatar
            size="small"
            team={{
              avatar: manager.avatar,
              teamName: manager.currentTeamName,
            }}
          />
          <div>
            <strong>{manager.currentTeamName}</strong>
            <span>@{manager.manager}</span>
          </div>
        </div>
      </td>
      <td className="numeric title-count">
        {manager.titles ? (
          <span title={`Champion: ${manager.titleYears.join(", ")}`}>
            <Trophy size={15} aria-hidden="true" /> {manager.titles}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="numeric">
        {manager.wins}–{manager.losses}
      </td>
      <td className="numeric">{(manager.winPct * 100).toFixed(1)}%</td>
      <td className="numeric">{formatPoints(manager.pointsFor)}</td>
    </tr>
  );
}

export default function LeagueDashboard({
  data,
  keepers,
  activePage = "overview",
  profileUserId,
}: {
  data: LeagueData;
  keepers: KeeperRecord[];
  activePage?: string;
  profileUserId?: string;
}) {
  const current = data.seasons[0];
  const allTimeLeader = data.allTime[0];
  const mostPoints = [...data.allTime].sort(
    (a, b) => b.pointsFor - a.pointsFor,
  )[0];

  return (
    <main>
      <LeagueNavigation activePage={activePage} leagueId={current.leagueId} />

      {activePage === "overview" && <LeagueOverview data={data} />}

      {activePage === "teams" && (
        <section className="content-section" id="franchises">
          <div className="section-heading">
            <div>
              <span className="section-number">01 / ACTIVE TEAMS</span>
              <h2>The ten in the room</h2>
            </div>
            <p>
              The current {current.year} ownership table, straight from Sleeper.
              Team names evolve. The receipts don’t.
            </p>
          </div>

          <div className="team-grid">
            {current.teams.map((team, index) => (
              <a
                className="team-card"
                href={`/teams/${team.userId}`}
                key={team.rosterId}
              >
                <div className="team-card-top">
                  <span className="roster-number">
                    ROSTER {String(team.rosterId).padStart(2, "0")}
                  </span>
                  <span className="team-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <TeamAvatar team={team} size="large" />
                <div className="team-card-copy">
                  <h3>{team.teamName}</h3>
                  <p>
                    @{team.manager}
                    {team.commissioner && (
                      <span className="commish-badge">COMMISH</span>
                    )}
                  </p>
                </div>
                <div className="team-card-foot">
                  <span>
                    {team.playerCount
                      ? `${team.playerCount} players`
                      : "Pre-draft"}
                  </span>
                  <span>Waiver #{team.waiverPosition}</span>
                </div>
                <span className="team-dossier-link">
                  Open dossier <ArrowUpRight size={14} aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {activePage === "teams-retired" && (
        <section
          className="content-section retired-franchises"
          id="retired-franchises"
        >
          <div className="section-heading">
            <div>
              <span className="section-number">02 / RETIRED TEAMS</span>
              <h2>Gone, not forgotten.</h2>
            </div>
            <p>
              Former managers keep their own records, transactions, players, and
              roster history—even when a new owner inherits their old slot.
            </p>
          </div>

          {data.chaos.franchises.length ? (
            <div className="team-grid retired-team-grid">
              {data.chaos.franchises.map((franchise, index) => (
                <a
                  className="team-card retired-team-card"
                  href={`/teams/${franchise.userId}`}
                  key={franchise.userId}
                >
                  <div className="team-card-top">
                    <span className="roster-number">RETIRED FRANCHISE</span>
                    <span className="team-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <TeamAvatar team={franchise} size="large" />
                  <div className="team-card-copy">
                    <h3>{franchise.teamName}</h3>
                    <p>@{franchise.manager}</p>
                  </div>
                  <div className="team-card-foot">
                    <span>Through {franchise.lastSeason}</span>
                    <span>{franchise.seasons} seasons</span>
                  </div>
                  <span className="team-dossier-link">
                    Open archive <ArrowUpRight size={14} aria-hidden="true" />
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="empty-state">No retired teams in the archive.</p>
          )}
        </section>
      )}

      {activePage === "history" && (
        <section className="dark-section" id="history">
          <div className="section-heading light">
            <div>
              <span className="section-number">02 / THE RECORD BOOK</span>
              <h2>All-time table</h2>
            </div>
            <p>
              Regular-season records across every completed Game of Inches
              campaign.
            </p>
          </div>

          <div className="record-layout">
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Franchise</th>
                    <th className="numeric">Titles</th>
                    <th className="numeric">Record</th>
                    <th className="numeric">Win %</th>
                    <th className="numeric">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.allTime.map((manager, index) => (
                    <ManagerRow
                      key={manager.userId}
                      manager={manager}
                      rank={index + 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="record-cards">
              <div className="record-card accent">
                <Medal size={22} aria-hidden="true" />
                <span>Top of the table</span>
                <strong>{allTimeLeader?.currentTeamName}</strong>
                <small>
                  {allTimeLeader?.wins} wins ·{" "}
                  {((allTimeLeader?.winPct ?? 0) * 100).toFixed(1)}%
                </small>
              </div>
              <div className="record-card">
                <Gauge size={22} aria-hidden="true" />
                <span>All-time points leader</span>
                <strong>{mostPoints?.currentTeamName}</strong>
                <small>{formatPoints(mostPoints?.pointsFor ?? 0)} points</small>
              </div>
              <div className="record-card">
                <Clock3 size={22} aria-hidden="true" />
                <span>League age</span>
                <strong>{data.seasons.length} seasons</strong>
                <small>2023 — {current.year}</small>
              </div>
            </aside>
          </div>
        </section>
      )}

      {activePage === "history-seasons" && <SeasonArchive data={data} />}

      {activePage === "history-playoffs" && <PlayoffHistory data={data} />}

      {activePage === "records" && <LeagueRecords data={data} view="money" />}
      {activePage === "records-rivalries" && (
        <LeagueRecords data={data} view="rivalries" />
      )}
      {activePage === "records-performances" && (
        <LeagueRecords data={data} view="performances" />
      )}
      {activePage === "records-superlatives" && (
        <LeagueSuperlatives data={data} />
      )}
      {activePage === "records-book" && (
        <RecordBookExpansion data={data} view="book" />
      )}
      {activePage === "records-elo" && (
        <RecordBookExpansion data={data} view="elo" />
      )}

      {activePage === "drafts" && <DraftRoom data={data} />}

      {activePage === "moves" && (
        <>
          <TransactionHistory
            seasons={data.seasons.map((season) => season.year)}
            defaultSeason={current.year}
          />
        </>
      )}

      {activePage === "keepers" && (
        <KeeperBoard data={data} keepers={keepers} />
      )}

      {activePage === "keepers-rules" && (
        <>
          <section className="content-section keeper-section keeper-rules-page">
            <div className="section-heading">
              <div>
                <span className="section-number">07 / KEEPER RULES</span>
                <h2>How the keeper clock works.</h2>
              </div>
              <p>
                The round-cost lineage and eligibility rules used by the
                official board and the public Keeper Lab.
              </p>
            </div>
            <div className="keeper-rules">
              <div>
                <span>01</span>
                <strong>Costs move up one round each year</strong>
              </div>
              <div>
                <span>02</span>
                <strong>Waiver additions start at Round 8</strong>
              </div>
              <div>
                <span>03</span>
                <strong>Post–Round 10 picks cost Round 10</strong>
              </div>
              <div>
                <span>04</span>
                <strong>Three-year max; trades reset the clock</strong>
              </div>
            </div>
          </section>
          <section className="rules-strip">
            <div>
              <span>LEAGUE DNA</span>
              <h2>Built for the long game.</h2>
            </div>
            <dl>
              <div>
                <dt>Scoring</dt>
                <dd>{current.settings.receptionPoints} PPR</dd>
              </div>
              <div>
                <dt>Lineup</dt>
                <dd>2 QB · 2 RB · 2 WR · TE · 2 FLEX · K</dd>
              </div>
              <div>
                <dt>Playoffs</dt>
                <dd>
                  {current.settings.playoffTeams} teams · Week{" "}
                  {current.settings.playoffWeekStart}
                </dd>
              </div>
              <div>
                <dt>Trade deadline</dt>
                <dd>Week {current.settings.tradeDeadline}</dd>
              </div>
            </dl>
          </section>
        </>
      )}

      {activePage === "keepers-lab" && (
        <KeeperWarRoom data={data} keepers={keepers} />
      )}

      {activePage === "profile" &&
        (() => {
          const profile = data.chaos.franchises.find(
            (item) => item.userId === profileUserId,
          );
          return profile ? (
            <FranchiseDossier profile={profile} keepers={keepers} />
          ) : null;
        })()}

      <footer>
        <a className="brand footer-brand" href="/">
          <span className="brand-mark">
            G<span>/</span>I
          </span>
          <span>
            Game of Inches
            <small>Fantasy Football League</small>
          </span>
        </a>
        <p>
          League data powered by Sleeper. Built for the ten who know that every
          decimal matters.
        </p>
        <a href="/admin">
          Commissioner desk <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </footer>
    </main>
  );
}
