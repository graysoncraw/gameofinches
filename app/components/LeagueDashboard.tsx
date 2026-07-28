"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- vinext duplicates React when next/link is used in this client tree. */

import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleDot,
  Clock3,
  Crown,
  DraftingCompass,
  Gauge,
  History,
  Medal,
  RefreshCw,
  Search,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { KeeperRecord } from "../lib/keepers";
import type {
  AllTimeManager,
  DraftPick,
  LeagueData,
  Season,
  Team,
} from "../lib/sleeper";
import LeagueRecords from "./LeagueRecords";
import TransactionHistory from "./TransactionHistory";
import {
  FranchiseDossier,
  KeeperWarRoom,
  LeagueSuperlatives,
  RecordBookExpansion,
} from "./ChaosExperience";

function avatarUrl(avatar: string | null) {
  return avatar ? `https://sleepercdn.com/avatars/thumbs/${avatar}` : null;
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TeamAvatar({
  team,
  size = "normal",
}: {
  team: Pick<Team, "avatar" | "teamName">;
  size?: "small" | "normal" | "large";
}) {
  const src = avatarUrl(team.avatar);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`team-avatar team-avatar--${size}`}
      src={src}
      alt=""
    />
  ) : (
    <span className={`team-avatar fallback team-avatar--${size}`}>
      {initials(team.teamName)}
    </span>
  );
}

function formatPoints(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function record(team: Team) {
  return `${team.wins}–${team.losses}${team.ties ? `–${team.ties}` : ""}`;
}

function standings(season: Season) {
  return [...season.teams].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.ties - a.ties ||
      b.pointsFor - a.pointsFor,
  );
}

function StatusPill({ status }: { status: string }) {
  const label = status.replace("_", " ");
  return (
    <span className={`status-pill status-pill--${status}`}>
      <CircleDot size={13} aria-hidden="true" />
      {label}
    </span>
  );
}

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

function DraftCard({ pick }: { pick: DraftPick }) {
  return (
    <article className={`draft-pick ${pick.isKeeper ? "is-keeper" : ""}`}>
      <div className="pick-number">
        <span>Pick</span>
        {pick.pickNo}
      </div>
      <div className="pick-player">
        <div className="position-tag">{pick.position}</div>
        <div>
          <strong>{pick.playerName}</strong>
          <span>
            {pick.nflTeam} · {pick.teamName}
          </span>
        </div>
      </div>
      <span className="draft-slot">Slot {pick.draftSlot}</span>
    </article>
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
  const completedSeasons = data.seasons.filter(
    (season) => season.status === "complete",
  );
  const latestCompleted = completedSeasons[0];
  const [archiveYear, setArchiveYear] = useState(
    latestCompleted?.year ?? current.year,
  );
  const [draftYear, setDraftYear] = useState(
    latestCompleted?.year ?? current.year,
  );
  const [draftRound, setDraftRound] = useState(1);
  const [draftSearch, setDraftSearch] = useState("");
  const [keeperYear, setKeeperYear] = useState(current.year);

  const archive =
    data.seasons.find((season) => season.year === archiveYear) ??
    latestCompleted ??
    current;
  const draftSeason =
    data.seasons.find((season) => season.year === draftYear) ?? current;
  const draftRounds = draftSeason.draft?.rounds ?? 0;
  const selectedPicks = useMemo(() => {
    const picks = draftSeason.draft?.picks ?? [];
    const query = draftSearch.trim().toLowerCase();
    if (query) {
      return picks.filter((pick) =>
        [
          pick.playerName,
          pick.teamName,
          pick.manager,
          pick.position,
          pick.nflTeam,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }
    return picks.filter((pick) => pick.round === draftRound);
  }, [draftRound, draftSearch, draftSeason]);

  const archiveStandings = standings(archive);
  const topScorer = [...archive.teams].sort(
    (a, b) => b.pointsFor - a.pointsFor,
  )[0];
  const keeperYears = [...new Set([current.year, ...keepers.map((item) => item.season)])]
    .sort((a, b) => Number(b) - Number(a));
  const selectedKeepers = keepers.filter((item) => item.season === keeperYear);
  const keeperTeams = data.seasons.find((item) => item.year === keeperYear)?.teams ??
    current.teams;
  const allTimeLeader = data.allTime[0];
  const mostPoints = [...data.allTime].sort(
    (a, b) => b.pointsFor - a.pointsFor,
  )[0];
  const lastUpdated = new Date(data.fetchedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });

  function chooseDraftYear(year: string) {
    setDraftYear(year);
    setDraftRound(1);
    setDraftSearch("");
  }

  return (
    <main>
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Game of Inches home">
          <span className="brand-mark">
            G<span>/</span>I
          </span>
          <span>
            Game of Inches
            <small>Fantasy Football League</small>
          </span>
        </a>
        <div className="nav-links">
          {[
            ["overview", "/", "Overview"],
            ["teams", "/teams", "Teams"],
            ["history", "/history", "History"],
            ["records", "/records", "Records"],
            ["drafts", "/drafts", "Drafts"],
            ["moves", "/moves", "Moves"],
            ["keepers", "/keepers", "Keepers"],
          ].map(([key, href, label]) => (
            <a
              className={
                (activePage === "profile" ? "teams" : activePage) === key
                  ? "active"
                  : ""
              }
              href={href}
              key={key}
            >
              {label}
            </a>
          ))}
        </div>
        <a
          className="sleeper-link"
          href={`https://sleeper.com/leagues/${current.leagueId}`}
          target="_blank"
          rel="noreferrer"
        >
          Open Sleeper <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </nav>

      {activePage === "overview" && (
        <>
      <section className="hero" id="top">
        <div className="yard-lines" aria-hidden="true" />
        <div className="hero-copy">
          <div className="eyebrow-row">
            <StatusPill status={current.status} />
            <span className="live-note">
              <RefreshCw size={13} aria-hidden="true" /> Synced {lastUpdated}
            </span>
          </div>
          <p className="kicker">EST. 2023 · 10 FRANCHISES · 2 KEEPERS</p>
          <h1>
            Every inch
            <span>counts.</span>
          </h1>
          <p className="hero-deck">
            Four seasons of receipts. Every champion, draft pick, rivalry, and
            hard-earned point in one living league archive.
          </p>
          <div className="hero-actions">
            <a className="button button--primary" href="/history">
              Explore the archive <History size={17} aria-hidden="true" />
            </a>
            <a className="button button--ghost" href="/drafts">
              Enter the draft room
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
          <strong>10</strong>
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
        </>
      )}

      {activePage === "teams" && (
      <section className="content-section" id="franchises">
        <div className="section-heading">
          <div>
            <span className="section-number">01 / FRANCHISES</span>
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
                <span>{team.playerCount ? `${team.playerCount} players` : "Pre-draft"}</span>
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

      {activePage === "history" && (
        <>
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
        </>
      )}

      {activePage === "records" && (
        <>
          <LeagueRecords data={data} />
          <LeagueSuperlatives data={data} />
          <RecordBookExpansion data={data} />
        </>
      )}

      {activePage === "drafts" && (
        <>
      <section className="draft-section" id="drafts">
        <div className="section-heading">
          <div>
            <span className="section-number">05 / DRAFT ROOM</span>
            <h2>Every pick. No amnesia.</h2>
          </div>
          <p>
            Search the full archive or replay any round from the league’s draft
            history.
          </p>
        </div>

        <div className="draft-toolbar">
          <div className="year-tabs" aria-label="Draft season">
            {data.seasons.map((season) => (
              <button
                className={draftYear === season.year ? "active" : ""}
                type="button"
                onClick={() => chooseDraftYear(season.year)}
                key={season.year}
              >
                {season.year}
              </button>
            ))}
          </div>
          <label className="draft-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search draft picks</span>
            <input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Search player, team, manager…"
            />
          </label>
          {!draftSearch && draftRounds > 0 && (
            <label className="select-shell compact">
              <span className="sr-only">Choose a draft round</span>
              <select
                value={draftRound}
                onChange={(event) => setDraftRound(Number(event.target.value))}
              >
                {Array.from({ length: draftRounds }, (_, index) => (
                  <option value={index + 1} key={index + 1}>
                    Round {index + 1}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </label>
          )}
        </div>

        <div className="draft-board-head">
          <div>
            <span>
              {draftSearch ? "SEARCH RESULTS" : `ROUND ${draftRound}`}
            </span>
            <strong>{draftYear} DRAFT</strong>
          </div>
          <span>
            {selectedPicks.length} pick{selectedPicks.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="draft-board">
          {selectedPicks.length ? (
            selectedPicks.map((pick) => (
              <DraftCard pick={pick} key={`${pick.pickNo}-${pick.playerId}`} />
            ))
          ) : (
            <div className="empty-draft">
              <DraftingCompass size={30} aria-hidden="true" />
              <strong>
                {draftSeason.draft?.status === "pre_draft"
                  ? `${draftYear} is still on the clock.`
                  : "No picks match that search."}
              </strong>
              <p>
                {draftSeason.draft?.status === "pre_draft"
                  ? "Picks will appear here automatically once the Sleeper draft begins."
                  : "Try a player, team name, manager, or position."}
              </p>
            </div>
          )}
        </div>
      </section>
        </>
      )}

      {activePage === "moves" && (
        <>
      <TransactionHistory
        seasons={data.seasons.map((season) => season.year)}
        defaultSeason={latestCompleted?.year ?? current.year}
      />
        </>
      )}

      {activePage === "keepers" && (
        <>
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
            <span><i className="year-three" /> Year 1 · 3 left</span>
            <span><i className="year-two" /> Year 2 · 2 left</span>
            <span><i className="year-one" /> Year 3 · final year</span>
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
                Each franchise has two slots waiting. The commissioner portal
                is the source of truth because Sleeper only receives keepers
                when the draft board is finalized.
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

        <div className="keeper-rules">
          <div><span>01</span><strong>Costs move up one round each year</strong></div>
          <div><span>02</span><strong>Waiver additions start at Round 8</strong></div>
          <div><span>03</span><strong>Post–Round 10 picks cost Round 10</strong></div>
          <div><span>04</span><strong>Three-year max; trades reset the clock</strong></div>
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
      <KeeperWarRoom data={data} keepers={keepers} />
        </>
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
