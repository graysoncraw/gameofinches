"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- vinext duplicates React when next/link is used in this client tree. */

import {
  ArrowLeft,
  ArrowRight,
  Award,
  Banknote,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Crown,
  Flame,
  Gauge,
  Gavel,
  GitBranch,
  Medal,
  Newspaper,
  Search,
  ShieldCheck,
  Skull,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { KeeperRecord } from "../lib/keepers";
import type { FranchiseProfile, KeeperCandidate } from "../lib/chaos";
import type { LeagueData } from "../lib/sleeper";

function number(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function avatarUrl(avatar: string | null) {
  return avatar ? `https://sleepercdn.com/avatars/thumbs/${avatar}` : null;
}

function savedKeeperSelections(year: string, userId: string) {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(
      `goi-keeper-lab:${year}:${userId}`,
    );
    return saved ? (JSON.parse(saved) as string[]).slice(0, 2) : [];
  } catch {
    return [];
  }
}

function Initials({
  name,
  avatar,
}: {
  name: string;
  avatar: string | null;
}) {
  const src = avatarUrl(avatar);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="chaos-avatar" src={src} alt="" />;
  }
  return (
    <span className="chaos-avatar chaos-avatar--fallback">
      {name
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </span>
  );
}

export function ChaosHub({
  data,
  initialRecap,
}: {
  data: LeagueData;
  initialRecap?: { season: string; week: number };
}) {
  const chaos = data.chaos;
  const initialId = initialRecap
    ? `${initialRecap.season}-${initialRecap.week}`
    : chaos.recaps[0]?.id;
  const [recapId, setRecapId] = useState(initialId ?? "");
  const recap =
    chaos.recaps.find((item) => item.id === recapId) ?? chaos.recaps[0];

  return (
    <section className="chaos-page">
      <div className="chaos-masthead">
        <div className="chaos-masthead__rule">
          <span>THE OFFICIAL PAPER OF BAD BEATS</span>
          <span>EST. 2023 · PRICE: ONE LINEUP REGRET</span>
        </div>
        <div className="chaos-title">
          <Newspaper size={38} aria-hidden="true" />
          <div>
            <span>THE GAME OF INCHES</span>
            <h1>Gazette</h1>
          </div>
        </div>
        <p>
          Weekly violence, mathematical grudges, and the league’s permanent
          record of who did what to whom.
        </p>
        {!chaos.archiveReady && (
          <div className="archive-indexing">
            <Gauge size={16} aria-hidden="true" />
            Full player-level archive indexing will finish during the next
            scheduled Sleeper sync.
          </div>
        )}
      </div>

      {recap ? (
        <article className="gazette-lead">
          <div className="gazette-toolbar">
            <span>
              {recap.postseason ? "POSTSEASON EDITION" : "REGULAR-SEASON EDITION"}
            </span>
            <label>
              <span className="sr-only">Choose weekly edition</span>
              <select value={recap.id} onChange={(event) => setRecapId(event.target.value)}>
                {chaos.recaps.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.season} · Week {item.week}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
          </div>
          <div className="gazette-headline">
            <span>{recap.season} · WEEK {recap.week}</span>
            <h2>{recap.headline}</h2>
            <p>{recap.dek}</p>
          </div>
          <div className="gazette-grid">
            <div className="gazette-score">
              <Flame size={20} aria-hidden="true" />
              <span>HIGH SCORE</span>
              <strong>{number(recap.highScore.points)}</strong>
              <p>{recap.highScore.teamName}</p>
              <small>{recap.highScore.manager}</small>
            </div>
            <div>
              <Target size={20} aria-hidden="true" />
              <span>PHOTO FINISH</span>
              <strong>{number(recap.closestGame.margin)} pts</strong>
              <p>
                {recap.closestGame.winner} over {recap.closestGame.loser}
              </p>
              <small>
                {number(recap.closestGame.winnerPoints)}–
                {number(recap.closestGame.loserPoints)}
              </small>
            </div>
            <div>
              <Skull size={20} aria-hidden="true" />
              <span>PUBLIC EXECUTION</span>
              <strong>{number(recap.blowout.margin)} pts</strong>
              <p>
                {recap.blowout.winner} over {recap.blowout.loser}
              </p>
            </div>
            <div>
              <Swords size={20} aria-hidden="true" />
              <span>HEARTBREAK</span>
              <strong>
                {recap.heartbreak ? number(recap.heartbreak.points) : "—"}
              </strong>
              <p>{recap.heartbreak?.manager ?? "No eligible tragedy"}</p>
            </div>
            <div>
              <Gavel size={20} aria-hidden="true" />
              <span>BENCH CRIME</span>
              <strong>
                {recap.benchCrime ? number(recap.benchCrime.gap) : "Indexing"}
              </strong>
              <p>{recap.benchCrime?.manager ?? "Awaiting full archive"}</p>
            </div>
            <div>
              <Zap size={20} aria-hidden="true" />
              <span>UPSET WATCH</span>
              <strong>
                {recap.upset ? `${number(recap.upset.eloGap)} Elo` : "No upset"}
              </strong>
              <p>
                {recap.upset
                  ? `${recap.upset.winner} stunned ${recap.upset.loser}`
                  : "The favorites survived"}
              </p>
            </div>
            <div>
              <BarChart3 size={20} aria-hidden="true" />
              <span>STANDINGS MOVER</span>
              <strong>
                {recap.standingsMove
                  ? `+${recap.standingsMove.delta}`
                  : "No jump"}
              </strong>
              <p>
                {recap.standingsMove
                  ? `${recap.standingsMove.manager}: #${recap.standingsMove.from} to #${recap.standingsMove.to}`
                  : "The table held its shape"}
              </p>
            </div>
          </div>
          <a className="gazette-permalink" href={`/chaos/${recap.season}/${recap.week}`}>
            Open shareable edition <ArrowRight size={15} aria-hidden="true" />
          </a>
        </article>
      ) : (
        <div className="chaos-empty">
          <Newspaper size={28} aria-hidden="true" />
          <h2>The presses are warming up.</h2>
          <p>The first completed week will publish the next Gazette edition.</p>
        </div>
      )}

      <div className="chaos-dashboard">
        <div className="chaos-panel elo-panel">
          <div className="chaos-panel__title">
            <BarChart3 size={20} aria-hidden="true" />
            <div>
              <span>ALL-TIME ELO</span>
              <strong>The power index</strong>
            </div>
          </div>
          <div className="elo-list">
            {chaos.elo.standings.map((standing) => (
              <a href={`/teams/${standing.userId}`} key={standing.userId}>
                <span>{String(standing.rank).padStart(2, "0")}</span>
                <div>
                  <strong>{standing.teamName}</strong>
                  <small>{standing.manager}</small>
                </div>
                <b>{number(standing.rating)}</b>
                <i className={standing.change >= 0 ? "positive" : "negative"}>
                  {standing.change >= 0 ? "+" : ""}
                  {number(standing.change)}
                </i>
              </a>
            ))}
          </div>
        </div>

        <div className="chaos-panel record-watch">
          <div className="chaos-panel__title">
            <Trophy size={20} aria-hidden="true" />
            <div>
              <span>RECORD WATCH</span>
              <strong>The permanent damage</strong>
            </div>
          </div>
          {chaos.records.slice(0, 5).map((record) => (
            <div className="record-watch__row" key={record.id}>
              <span>{record.label}</span>
              <strong>
                {number(record.value)}
                <small>{record.unit === "points" ? " pts" : ""}</small>
              </strong>
              <p>
                {record.holder} · {record.season}
                {record.week ? ` W${record.week}` : ""}
              </p>
            </div>
          ))}
          <a href="/records">
            Enter the full record book <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="superlative-section">
        <div className="section-heading">
          <div>
            <span className="section-number">AUTOMATIC DISRESPECT</span>
            <h2>The league superlatives</h2>
          </div>
          <p>Every title is earned by a transparent, deeply unserious formula.</p>
        </div>
        <div className="superlative-grid">
          {chaos.superlatives.map((award, index) => (
            <article key={award.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <Award size={22} aria-hidden="true" />
              <h3>{award.title}</h3>
              <strong>{award.manager}</strong>
              <p>{award.teamName}</p>
              <b>{award.value}</b>
              <small>{award.explanation}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RecordBookExpansion({ data }: { data: LeagueData }) {
  return (
    <section className="record-book-section">
      <div className="section-heading">
        <div>
          <span className="section-number">THE RECORD BOOK</span>
          <h2>Some marks deserve a warning label.</h2>
        </div>
        <p>
          Team scores, margins, heartbreak, lineup efficiency, and postseason
          explosions—zero and unplayed matchups excluded.
        </p>
      </div>
      <div className="record-book-grid">
        {data.chaos.records.map((record, index) => (
          <article key={record.id}>
            <div>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {index < 3 ? <Medal size={18} aria-hidden="true" /> : <BookOpen size={18} aria-hidden="true" />}
            </div>
            <small>{record.label}</small>
            <strong>{number(record.value)}</strong>
            <h3>{record.holder}</h3>
            <p>
              {record.season}
              {record.week ? ` · Week ${record.week}` : ""}
              {record.opponent ? ` · vs ${record.opponent}` : ""}
            </p>
            <em>{record.flavor}</em>
          </article>
        ))}
      </div>
      <div className="elo-history">
        <div className="chaos-panel__title">
          <Gauge size={20} aria-hidden="true" />
          <div>
            <span>K=24 · STARTING RATING 1500</span>
            <strong>All-time Elo ladder</strong>
          </div>
        </div>
        {data.chaos.elo.standings.map((standing) => (
          <a href={`/teams/${standing.userId}`} key={standing.userId}>
            <span>#{standing.rank}</span>
            <div>
              <strong>{standing.teamName}</strong>
              <small>{standing.games} rated games · peak {number(standing.peak)}</small>
            </div>
            <div className="elo-meter">
              <i
                style={{
                  width: `${Math.max(8, Math.min(100, ((standing.rating - 1300) / 500) * 100))}%`,
                }}
              />
            </div>
            <b>{number(standing.rating)}</b>
          </a>
        ))}
      </div>
    </section>
  );
}

export function LeagueSuperlatives({ data }: { data: LeagueData }) {
  return (
    <section className="superlative-section">
      <div className="section-heading">
        <div>
          <span className="section-number">AUTOMATIC DISRESPECT</span>
          <h2>The league superlatives</h2>
        </div>
        <p>Every title is earned by a transparent, deeply unserious formula.</p>
      </div>
      <div className="superlative-grid">
        {data.chaos.superlatives.map((award, index) => (
          <article key={award.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <Award size={22} aria-hidden="true" />
            <h3>{award.title}</h3>
            <strong>{award.manager}</strong>
            <p>{award.teamName}</p>
            <b>{award.value}</b>
            <small>{award.explanation}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DraftReportCards({ data }: { data: LeagueData }) {
  const [season, setSeason] = useState(data.chaos.drafts[0]?.season ?? "");
  const report =
    data.chaos.drafts.find((item) => item.season === season) ??
    data.chaos.drafts[0];
  if (!report) return null;
  return (
    <section className="draft-report-section">
      <div className="section-heading">
        <div>
          <span className="section-number">RETROSPECTIVE SCOUTING</span>
          <h2>The draft report cards</h2>
        </div>
        <p>
          Non-keeper picks graded against round expectations. Early picks carry
          more weight; active seasons remain provisional.
        </p>
      </div>
      <div className="draft-report-toolbar">
        <label>
          <CalendarDays size={16} aria-hidden="true" />
          <select value={report.season} onChange={(event) => setSeason(event.target.value)}>
            {data.chaos.drafts.map((item) => (
              <option key={item.season} value={item.season}>
                {item.season} {item.provisional ? "· provisional" : ""}
              </option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </label>
        <span>
          Value = recorded player production minus the historical median for
          that round.
        </span>
      </div>
      <div className="draft-grade-grid">
        {report.teams.map((team) => (
          <article key={team.userId}>
            <span className={`draft-letter grade-${team.grade.replace("+", "plus")}`}>
              {team.grade}
            </span>
            <div>
              <h3>{team.teamName}</h3>
              <p>{team.manager}</p>
            </div>
            <dl>
              <div>
                <dt>Score</dt>
                <dd>{team.score}</dd>
              </div>
              <div>
                <dt>Weighted value</dt>
                <dd className={team.value >= 0 ? "positive" : "negative"}>
                  {team.value >= 0 ? "+" : ""}
                  {number(team.value)}
                </dd>
              </div>
            </dl>
            {team.bestPick && (
              <div className="draft-pick-callout steal">
                <span>BEST RECEIPT</span>
                <strong>{team.bestPick.playerName}</strong>
                <small>
                  R{team.bestPick.round} · {team.bestPick.verdict} ·{" "}
                  {team.bestPick.value >= 0 ? "+" : ""}
                  {number(team.bestPick.value)}
                </small>
              </div>
            )}
            {team.worstPick && team.worstPick.playerId !== team.bestPick?.playerId && (
              <div className="draft-pick-callout miss">
                <span>TOUGH TAPE</span>
                <strong>{team.worstPick.playerName}</strong>
                <small>
                  R{team.worstPick.round} · {team.worstPick.verdict} ·{" "}
                  {number(team.worstPick.value)}
                </small>
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="position-trends">
        <div className="chaos-panel__title">
          <BarChart3 size={19} aria-hidden="true" />
          <div>
            <span>POSITION MARKET</span>
            <strong>Where the value lived</strong>
          </div>
        </div>
        {report.positionTrends.map((trend) => (
          <div key={trend.position}>
            <span>{trend.position || "—"}</span>
            <div>
              <i
                className={trend.averageValue >= 0 ? "positive-bar" : "negative-bar"}
                style={{
                  width: `${Math.max(6, Math.min(100, Math.abs(trend.averageValue) / 2))}%`,
                }}
              />
            </div>
            <strong>
              {trend.averageValue >= 0 ? "+" : ""}
              {number(trend.averageValue)}
            </strong>
            <small>{trend.picks} picks</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TradeTrees({ data }: { data: LeagueData }) {
  const seasons = [...new Set(data.chaos.trades.map((trade) => trade.season))];
  const [season, setSeason] = useState(seasons[0] ?? "");
  const trades = data.chaos.trades.filter((trade) => trade.season === season);
  if (!data.chaos.trades.length) return null;
  return (
    <section className="trade-tree-section">
      <div className="section-heading">
        <div>
          <span className="section-number">RECEIPT AUDIT</span>
          <h2>Trade trees & impact verdicts</h2>
        </div>
        <p>
          Impact counts starter points scored for the receiving roster from the
          trade week forward. It is not a dynasty-value calculator—and says so.
        </p>
      </div>
      <div className="trade-tree-toolbar">
        {seasons.map((year) => (
          <button
            className={year === season ? "active" : ""}
            type="button"
            onClick={() => setSeason(year)}
            key={year}
          >
            {year}
          </button>
        ))}
      </div>
      <div className="trade-tree-list">
        {trades.map((trade) => (
          <article key={trade.id}>
            <div className="trade-tree-head">
              <div>
                <GitBranch size={19} aria-hidden="true" />
                <span>
                  {trade.season} · Week {trade.week || "Offseason"}
                </span>
              </div>
              <strong className={`trade-status status-${trade.status}`}>
                {trade.status}
              </strong>
            </div>
            <h3>{trade.verdict}</h3>
            <div className="trade-sides">
              {trade.sides.map((side) => (
                <div key={side.rosterId}>
                  <span>{side.teamName}</span>
                  <strong>{side.manager}</strong>
                  <b>{number(side.impact)} starter-impact pts</b>
                  <dl>
                    <div>
                      <dt>RECEIVED</dt>
                      <dd>{side.received.join(" · ") || "No listed assets"}</dd>
                    </div>
                    <div>
                      <dt>SENT</dt>
                      <dd>{side.sent.join(" · ") || "No listed assets"}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
            {trade.hasUnresolvedPicks && (
              <p className="trade-pending">
                Future draft capital keeps this verdict open.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function projectedCandidate(
  candidate: KeeperCandidate,
  keepers: KeeperRecord[],
  sourceSeason: string,
) {
  const previous = keepers.find(
    (keeper) =>
      keeper.season === sourceSeason &&
      keeper.rosterId === candidate.rosterId &&
      keeper.playerName.toLowerCase() === candidate.playerName.toLowerCase(),
  );
  if (!previous) return candidate;
  return {
    ...candidate,
    costRound: Math.max(1, previous.costRound - 1),
    yearsRemaining: Math.max(0, previous.yearsRemaining - 1),
    acquisitionType: previous.acquisitionType,
    source: `Returning keeper · ${previous.yearsRemaining} years previously`,
  };
}

export function KeeperWarRoom({
  data,
  keepers,
}: {
  data: LeagueData;
  keepers: KeeperRecord[];
}) {
  const current = data.seasons[0];
  const sourceSeason =
    data.seasons.find((season) => season.status === "complete")?.year ?? "";
  const teams = current.teams;
  const [userId, setUserId] = useState(teams[0]?.userId ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [secondGetsLaterRound, setSecondGetsLaterRound] = useState(false);
  const team = teams.find((item) => item.userId === userId) ?? teams[0];
  const candidates = useMemo(
    () =>
      data.chaos.keeperCandidates
        .filter((candidate) => candidate.userId === team?.userId)
        .map((candidate) => projectedCandidate(candidate, keepers, sourceSeason))
        .filter((candidate) =>
          `${candidate.playerName} ${candidate.position} ${candidate.nflTeam}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
    [data.chaos.keeperCandidates, keepers, query, sourceSeason, team?.userId],
  );

  useEffect(() => {
    if (!teams[0]) return;
    const frame = window.requestAnimationFrame(() => {
      setSelected(savedKeeperSelections(current.year, teams[0].userId));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [current.year, teams]);

  function toggle(playerId: string) {
    setSelected((currentSelected) => {
      const next = currentSelected.includes(playerId)
        ? currentSelected.filter((item) => item !== playerId)
        : [...currentSelected, playerId].slice(-2);
      if (team) {
        window.localStorage.setItem(
          `goi-keeper-lab:${current.year}:${team.userId}`,
          JSON.stringify(next),
        );
      }
      return next;
    });
  }

  const chosen = selected
    .map((id) => candidates.find((candidate) => candidate.playerId === id))
    .filter((candidate): candidate is KeeperCandidate => Boolean(candidate));
  const collision =
    chosen.length === 2 && chosen[0].costRound === chosen[1].costRound;
  const invalid = collision && chosen[0].costRound === 1;
  const roundFor = (index: number) => {
    if (!collision) return chosen[index]?.costRound;
    const laterIndex = secondGetsLaterRound ? 1 : 0;
    return index === laterIndex
      ? chosen[index].costRound
      : Math.max(1, chosen[index].costRound - 1);
  };
  const deadline = current.draft?.startTime
    ? new Date(current.draft.startTime - 7 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <section className="keeper-lab-section">
      <div className="section-heading">
        <div>
          <span className="section-number">PUBLIC KEEPER LAB</span>
          <h2>Build the two-player escape plan.</h2>
        </div>
        <p>
          Experiment freely. These choices stay on this device and never alter
          the official Commissioner Desk.
        </p>
      </div>
      <div className="keeper-lab-head">
        <label>
          <Users size={17} aria-hidden="true" />
          <select
            value={team?.userId}
            onChange={(event) => {
              const nextUserId = event.target.value;
              setUserId(nextUserId);
              setQuery("");
              setSelected(savedKeeperSelections(current.year, nextUserId));
            }}
          >
            {teams.map((item) => (
              <option value={item.userId} key={item.userId}>
                {item.manager} · {item.teamName}
              </option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </label>
        <div>
          <CalendarDays size={17} aria-hidden="true" />
          <span>Keeper deadline</span>
          <strong>
            {deadline
              ? deadline.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "America/Chicago",
                })
              : "Awaiting draft time"}
          </strong>
        </div>
      </div>

      <div className="keeper-lab-layout">
        <div className="keeper-candidate-panel">
          <label className="keeper-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search eligible keepers</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a player…"
            />
          </label>
          <div className="keeper-candidate-list">
            {candidates.map((candidate) => (
              <button
                className={selected.includes(candidate.playerId) ? "selected" : ""}
                type="button"
                onClick={() => toggle(candidate.playerId)}
                key={candidate.playerId}
                disabled={candidate.yearsRemaining <= 0}
              >
                <div>
                  <strong>{candidate.playerName}</strong>
                  <span>
                    {candidate.position} · {candidate.nflTeam || "FA"}
                  </span>
                  <small>{candidate.source}</small>
                </div>
                <div>
                  <span>R{candidate.costRound}</span>
                  <b>
                    {candidate.yearsRemaining > 0
                      ? `${candidate.yearsRemaining} yr`
                      : "Expired"}
                  </b>
                </div>
              </button>
            ))}
            {!candidates.length && (
              <div className="keeper-lab-empty">
                {data.chaos.archiveReady
                  ? "No eligible roster candidates match this search."
                  : "Full roster candidates will arrive after archive indexing."}
              </div>
            )}
          </div>
        </div>

        <aside className="keeper-scenario">
          <div>
            <ShieldCheck size={20} aria-hidden="true" />
            <span>{current.year} SCENARIO</span>
          </div>
          {[0, 1].map((index) => {
            const candidate = chosen[index];
            return (
              <article className={candidate ? "filled" : ""} key={index}>
                <span>SLOT {index + 1}</span>
                {candidate ? (
                  <>
                    <strong>{candidate.playerName}</strong>
                    <p>{candidate.source}</p>
                    <b>Forfeit Round {roundFor(index)}</b>
                    <button type="button" onClick={() => toggle(candidate.playerId)}>
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <strong>Open</strong>
                    <p>Select a candidate from the board.</p>
                  </>
                )}
              </article>
            );
          })}
          {collision && !invalid && (
            <div className="round-collision">
              <Gavel size={16} aria-hidden="true" />
              <p>
                Both players target Round {chosen[0].costRound}. One must move
                up a round.
              </p>
              <button
                type="button"
                onClick={() => setSecondGetsLaterRound((value) => !value)}
              >
                Give the later round to{" "}
                {secondGetsLaterRound
                  ? chosen[0].playerName
                  : chosen[1].playerName}
              </button>
            </div>
          )}
          {invalid && (
            <div className="round-collision invalid">
              <Skull size={16} aria-hidden="true" />
              Two Round 1 costs cannot coexist. Choose one.
            </div>
          )}
          <a href="/admin">
            Commissioners: lock official choices{" "}
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        </aside>
      </div>
    </section>
  );
}

export function FranchiseDossier({
  profile,
  keepers,
}: {
  profile: FranchiseProfile;
  keepers: KeeperRecord[];
}) {
  const franchiseKeepers = keepers.filter((keeper) =>
    profile.teamNames.some(
      (team) =>
        team.season === keeper.season &&
        (team.teamName === keeper.teamName ||
          keeper.managerName.toLowerCase().includes(profile.manager.toLowerCase())),
    ),
  );
  const games = profile.wins + profile.losses + profile.ties;
  return (
    <section className="franchise-page">
      <a className="franchise-back" href="/teams">
        <ArrowLeft size={15} aria-hidden="true" /> All franchises
      </a>
      <div className="franchise-hero">
        <Initials name={profile.teamName} avatar={profile.avatar} />
        <div>
          <span>FRANCHISE DOSSIER</span>
          <h1>{profile.teamName}</h1>
          <p>{profile.manager}</p>
        </div>
        <div className="franchise-elo">
          <span>ALL-TIME ELO</span>
          <strong>{number(profile.elo)}</strong>
          <small>Peak {number(profile.peakElo)}</small>
        </div>
      </div>
      <div className="franchise-stat-grid">
        <div><span>Record</span><strong>{profile.wins}–{profile.losses}{profile.ties ? `–${profile.ties}` : ""}</strong><small>{games ? `${((profile.wins / games) * 100).toFixed(1)}% wins` : "No games"}</small></div>
        <div><span>Titles</span><strong>{profile.titles}</strong><small>{profile.titleYears.join(" · ") || "Still hunting"}</small></div>
        <div><span>Best season</span><strong>{profile.bestSeason?.season ?? "—"}</strong><small>{profile.bestSeason ? `${profile.bestSeason.wins} wins · ${number(profile.bestSeason.points)} PF` : "No completed season"}</small></div>
        <div><span>Prize money</span><strong>{money(profile.winnings)}</strong><small>{profile.net >= 0 ? "+" : ""}{money(profile.net)} net</small></div>
      </div>
      <div className="franchise-two-up">
        <article>
          <div className="chaos-panel__title"><Swords size={19} aria-hidden="true" /><div><span>ENEMIES DEPARTMENT</span><strong>Who owns whom?</strong></div></div>
          <dl className="enemy-list">
            <div><dt>Nemesis</dt><dd>{profile.nemesis?.manager ?? "None yet"}<small>{profile.nemesis?.record}</small></dd></div>
            <div><dt>Favorite target</dt><dd>{profile.favoriteOpponent?.manager ?? "None yet"}<small>{profile.favoriteOpponent?.record}</small></dd></div>
          </dl>
        </article>
        <article>
          <div className="chaos-panel__title"><Banknote size={19} aria-hidden="true" /><div><span>MARKET ACTIVITY</span><strong>Transaction tendencies</strong></div></div>
          <dl className="transaction-tendencies">
            <div><dt>Trades</dt><dd>{profile.tradeCount}</dd></div>
            <div><dt>Waiver wins</dt><dd>{profile.waiverCount}</dd></div>
            <div><dt>FAAB spent</dt><dd>${profile.faabSpent}</dd></div>
          </dl>
        </article>
      </div>
      <div className="franchise-timeline">
        <div className="chaos-panel__title"><CalendarDays size={19} aria-hidden="true" /><div><span>IDENTITY CRISIS ARCHIVE</span><strong>Team-name history</strong></div></div>
        {profile.teamNames.map((team) => (
          <div key={team.season}><span>{team.season}</span><strong>{team.teamName}</strong></div>
        ))}
      </div>
      <div className="franchise-two-up">
        <article>
          <div className="chaos-panel__title"><Flame size={19} aria-hidden="true" /><div><span>SIGNATURE GAMES</span><strong>Best starter performances</strong></div></div>
          {profile.topPerformances.length ? profile.topPerformances.map((performance) => (
            <div className="profile-list-row" key={`${performance.season}-${performance.week}-${performance.playerName}`}>
              <span>{performance.season} W{performance.week}</span><strong>{performance.playerName}</strong><b>{number(performance.points)}</b>
            </div>
          )) : <p className="profile-empty">Player-level archive indexing.</p>}
        </article>
        <article>
          <div className="chaos-panel__title"><Crown size={19} aria-hidden="true" /><div><span>KEEPER LEGACY</span><strong>Players held close</strong></div></div>
          {franchiseKeepers.length ? franchiseKeepers.map((keeper) => (
            <div className="profile-list-row" key={`${keeper.season}-${keeper.slot}`}><span>{keeper.season}</span><strong>{keeper.playerName}</strong><b>R{keeper.costRound}</b></div>
          )) : <p className="profile-empty">No recorded keeper history.</p>}
        </article>
      </div>
    </section>
  );
}
