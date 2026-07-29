"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- navigation intentionally uses full-page links. */

import {
  ArrowLeft,
  ArrowRight,
  Award,
  Banknote,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Crown,
  Flame,
  Gauge,
  Gavel,
  Medal,
  Search,
  ShieldCheck,
  Skull,
  Swords,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { KeeperRecord } from "../lib/keepers";
import type { FranchiseProfile, KeeperCandidate } from "../lib/chaos";
import {
  FIRST_ROUND_CONFLICT_MESSAGE,
  hasFirstRoundKeeperConflict,
  projectKeeperCandidate,
} from "../lib/keeper-rules";
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

export function RecordBookExpansion({
  data,
  view,
}: {
  data: LeagueData;
  view: "book" | "elo";
}) {
  return (
    <section className="record-book-section">
      <div className="section-heading">
        <div>
          <span className="section-number">
            {view === "book" ? "THE RECORD BOOK" : "K=24 · STARTING AT 1500"}
          </span>
          <h2>
            {view === "book"
              ? "Some marks deserve a warning label."
              : "The all-time Elo ladder."}
          </h2>
        </div>
        <p>
          {view === "book"
            ? "Team scores, margins, heartbreak, lineup efficiency, and postseason explosions—zero and unplayed matchups excluded."
            : "Every matchup counts equally, with no home advantage and a transparent K-factor of 24."}
        </p>
      </div>
      {view === "book" && (
        <div className="record-book-grid">
          {data.chaos.records.map((record, index) => (
            <article key={record.id}>
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {index < 3 ? (
                  <Medal size={18} aria-hidden="true" />
                ) : (
                  <BookOpen size={18} aria-hidden="true" />
                )}
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
      )}
      {view === "elo" && (
        <div className="elo-history">
          <div className="panel-title">
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
                <small>
                  {standing.games} rated games · peak {number(standing.peak)}
                </small>
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
      )}
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
        .map((candidate) =>
          projectKeeperCandidate(candidate, keepers, sourceSeason),
        )
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

  const chosen = selected
    .map((id) => candidates.find((candidate) => candidate.playerId === id))
    .filter((candidate): candidate is KeeperCandidate => Boolean(candidate));
  const collision =
    chosen.length === 2 && chosen[0].costRound === chosen[1].costRound;
  const invalid = hasFirstRoundKeeperConflict(
    chosen[0]?.costRound,
    chosen[1]?.costRound,
  );
  const firstRoundSelected = chosen.some(
    (candidate) => candidate.costRound === 1,
  );

  function toggle(playerId: string) {
    const candidate = candidates.find((item) => item.playerId === playerId);
    if (
      candidate &&
      !selected.includes(playerId) &&
      hasFirstRoundKeeperConflict(
        candidate.costRound,
        firstRoundSelected ? 1 : undefined,
      )
    ) {
      return;
    }

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
      {!data.chaos.archiveReady && (
        <div className="archive-indexing">
          <Gauge size={16} aria-hidden="true" />
          Candidates are reconstructed from the latest draft and transaction
          ledger. The next scheduled sync will confirm final roster ownership.
        </div>
      )}

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
            {candidates.map((candidate) => {
              const selectedCandidate = selected.includes(candidate.playerId);
              const firstRoundBlocked =
                !selectedCandidate &&
                firstRoundSelected &&
                candidate.costRound === 1;
              return (
                <button
                  className={selectedCandidate ? "selected" : ""}
                  type="button"
                  onClick={() => toggle(candidate.playerId)}
                  key={candidate.playerId}
                  disabled={
                    candidate.yearsRemaining <= 0 || firstRoundBlocked
                  }
                  title={
                    firstRoundBlocked
                      ? FIRST_ROUND_CONFLICT_MESSAGE
                      : undefined
                  }
                >
                  <div>
                    <strong>{candidate.playerName}</strong>
                    <span>
                      {candidate.position} · {candidate.nflTeam || "FA"}
                    </span>
                    <small>
                      {firstRoundBlocked
                        ? "Round 1 keeper slot already filled"
                        : candidate.source}
                    </small>
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
              );
            })}
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
              {FIRST_ROUND_CONFLICT_MESSAGE}
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
          keeper.managerName
            .toLowerCase()
            .includes(profile.manager.toLowerCase())),
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
        <div>
          <span>Record</span>
          <strong>
            {profile.wins}–{profile.losses}
            {profile.ties ? `–${profile.ties}` : ""}
          </strong>
          <small>
            {games
              ? `${((profile.wins / games) * 100).toFixed(1)}% wins`
              : "No games"}
          </small>
        </div>
        <div>
          <span>Titles</span>
          <strong>{profile.titles}</strong>
          <small>{profile.titleYears.join(" · ") || "Still hunting"}</small>
        </div>
        <div>
          <span>Best season</span>
          <strong>{profile.bestSeason?.season ?? "—"}</strong>
          <small>
            {profile.bestSeason
              ? `${profile.bestSeason.wins} wins · ${number(profile.bestSeason.points)} PF`
              : "No completed season"}
          </small>
        </div>
        <div>
          <span>Prize money</span>
          <strong>{money(profile.winnings)}</strong>
          <small>
            {profile.net >= 0 ? "+" : ""}
            {money(profile.net)} net
          </small>
        </div>
      </div>
      <div className="franchise-two-up">
        <article>
          <div className="panel-title">
            <Swords size={19} aria-hidden="true" />
            <div>
              <span>ENEMIES DEPARTMENT</span>
              <strong>Who owns whom?</strong>
            </div>
          </div>
          <dl className="enemy-list">
            <div>
              <dt>Nemesis</dt>
              <dd>
                {profile.nemesis?.manager ?? "None yet"}
                <small>{profile.nemesis?.record}</small>
              </dd>
            </div>
            <div>
              <dt>Favorite target</dt>
              <dd>
                {profile.favoriteOpponent?.manager ?? "None yet"}
                <small>{profile.favoriteOpponent?.record}</small>
              </dd>
            </div>
          </dl>
        </article>
        <article>
          <div className="panel-title">
            <Banknote size={19} aria-hidden="true" />
            <div>
              <span>MARKET ACTIVITY</span>
              <strong>Transaction tendencies</strong>
            </div>
          </div>
          <dl className="transaction-tendencies">
            <div>
              <dt>Trades</dt>
              <dd>{profile.tradeCount}</dd>
            </div>
            <div>
              <dt>Waiver wins</dt>
              <dd>{profile.waiverCount}</dd>
            </div>
            <div>
              <dt>FAAB spent</dt>
              <dd>${profile.faabSpent}</dd>
            </div>
          </dl>
        </article>
      </div>
      <div className="franchise-timeline">
        <div className="panel-title">
          <CalendarDays size={19} aria-hidden="true" />
          <div>
            <span>IDENTITY CRISIS ARCHIVE</span>
            <strong>Team-name history</strong>
          </div>
        </div>
        {profile.teamNames.map((team) => (
          <div key={team.season}>
            <span>{team.season}</span>
            <strong>{team.teamName}</strong>
          </div>
        ))}
      </div>
      <div className="franchise-two-up">
        <article>
          <div className="panel-title">
            <Flame size={19} aria-hidden="true" />
            <div>
              <span>SIGNATURE GAMES</span>
              <strong>Best starter performances</strong>
            </div>
          </div>
          {profile.topPerformances.length ? (
            profile.topPerformances.map((performance) => (
              <div
                className="profile-list-row"
                key={`${performance.season}-${performance.week}-${performance.playerName}`}
              >
                <span>
                  {performance.season} W{performance.week}
                </span>
                <strong>{performance.playerName}</strong>
                <b>{number(performance.points)}</b>
              </div>
            ))
          ) : (
            <p className="profile-empty">Player-level archive indexing.</p>
          )}
        </article>
        <article>
          <div className="panel-title">
            <Crown size={19} aria-hidden="true" />
            <div>
              <span>KEEPER LEGACY</span>
              <strong>Players held close</strong>
            </div>
          </div>
          {franchiseKeepers.length ? (
            franchiseKeepers.map((keeper) => (
              <div
                className="profile-list-row"
                key={`${keeper.season}-${keeper.slot}`}
              >
                <span>{keeper.season}</span>
                <strong>{keeper.playerName}</strong>
                <b>R{keeper.costRound}</b>
              </div>
            ))
          ) : (
            <p className="profile-empty">No recorded keeper history.</p>
          )}
        </article>
      </div>
    </section>
  );
}
