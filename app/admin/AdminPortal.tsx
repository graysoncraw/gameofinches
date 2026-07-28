"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleAlert,
  Crown,
  LoaderCircle,
  LogOut,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { KeeperCandidate } from "../lib/chaos";
import {
  FIRST_ROUND_CONFLICT_MESSAGE,
  hasFirstRoundKeeperConflict,
  projectKeeperCandidate,
} from "../lib/keeper-candidates";
import type { KeeperRecord } from "../lib/keepers";
import type { Team } from "../lib/sleeper";

type KeeperDraft = {
  playerName: string;
  position: string;
  nflTeam: string;
  costRound: number;
  yearsRemaining: number;
  acquisitionType: "draft" | "waiver" | "trade";
  notes: string;
};

const emptyDraft = (): KeeperDraft => ({
  playerName: "",
  position: "",
  nflTeam: "",
  costRound: 10,
  yearsRemaining: 2,
  acquisitionType: "draft",
  notes: "",
});

function draftKey(season: string, rosterId: number, slot: number) {
  return `${season}-${rosterId}-${slot}`;
}

function recordToDraft(record?: KeeperRecord): KeeperDraft {
  return record
    ? {
        playerName: record.playerName,
        position: record.position,
        nflTeam: record.nflTeam,
        costRound: record.costRound,
        yearsRemaining: record.yearsRemaining,
        acquisitionType: record.acquisitionType,
        notes: record.notes,
      }
    : emptyDraft();
}

export default function AdminPortal({
  currentSeason,
  seasons,
  teamsBySeason,
  initialKeepers,
  keeperCandidates,
  sourceSeason,
}: {
  currentSeason: string;
  seasons: string[];
  teamsBySeason: Record<string, Team[]>;
  initialKeepers: KeeperRecord[];
  keeperCandidates: KeeperCandidate[];
  sourceSeason: string;
}) {
  const editableSeasons = useMemo(
    () =>
      [...new Set([currentSeason, ...seasons])].sort(
        (a, b) => Number(b) - Number(a),
      ),
    [currentSeason, seasons],
  );
  const [season, setSeason] = useState(currentSeason);
  const [keepers, setKeepers] = useState(initialKeepers);
  const [drafts, setDrafts] = useState<Record<string, KeeperDraft>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const teams = teamsBySeason[season] ?? teamsBySeason[currentSeason] ?? [];

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.reload();
  }

  function keeperFor(rosterId: number, slot: number) {
    return keepers.find(
      (keeper) =>
        keeper.season === season &&
        keeper.rosterId === rosterId &&
        keeper.slot === slot,
    );
  }

  function draftFor(rosterId: number, slot: number) {
    const key = draftKey(season, rosterId, slot);
    return drafts[key] ?? recordToDraft(keeperFor(rosterId, slot));
  }

  function updateDraft(
    rosterId: number,
    slot: number,
    patch: Partial<KeeperDraft>,
  ) {
    const key = draftKey(season, rosterId, slot);
    setDrafts((current) => ({
      ...current,
      [key]: { ...draftFor(rosterId, slot), ...patch },
    }));
  }

  function candidatesFor(team: Team) {
    if (season !== currentSeason) return [];
    return keeperCandidates
      .filter(
        (candidate) =>
          candidate.userId === team.userId ||
          candidate.rosterId === team.rosterId,
      )
      .map((candidate) =>
        projectKeeperCandidate(candidate, keepers, sourceSeason),
      );
  }

  async function save(team: Team, slot: number) {
    const key = draftKey(season, team.rosterId, slot);
    const draft = draftFor(team.rosterId, slot);
    const otherDraft = draftFor(team.rosterId, slot === 1 ? 2 : 1);
    if (
      draft.playerName &&
      otherDraft.playerName &&
      hasFirstRoundKeeperConflict(draft.costRound, otherDraft.costRound)
    ) {
      setMessage({ type: "error", text: FIRST_ROUND_CONFLICT_MESSAGE });
      return;
    }

    setSavingKey(key);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/keepers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          season,
          rosterId: team.rosterId,
          slot,
          managerName: team.manager,
          teamName: team.teamName,
        }),
      });
      const payload = (await response.json()) as {
        keeper?: KeeperRecord;
        error?: string;
      };
      if (!response.ok || !payload.keeper) {
        throw new Error(payload.error ?? "Unable to save keeper.");
      }

      setKeepers((current) => [
        ...current.filter(
          (keeper) =>
            !(
              keeper.season === season &&
              keeper.rosterId === team.rosterId &&
              keeper.slot === slot
            ),
        ),
        payload.keeper as KeeperRecord,
      ]);
      setDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setMessage({
        type: "success",
        text: `${draft.playerName} saved for ${team.teamName}.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to save keeper.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function remove(team: Team, slot: number) {
    const existing = keeperFor(team.rosterId, slot);
    if (!existing) {
      updateDraft(team.rosterId, slot, emptyDraft());
      return;
    }

    const key = draftKey(season, team.rosterId, slot);
    setSavingKey(key);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        season,
        rosterId: String(team.rosterId),
        slot: String(slot),
      });
      const response = await fetch(`/api/admin/keepers?${params}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Unable to clear keeper slot.");

      setKeepers((current) =>
        current.filter(
          (keeper) =>
            !(
              keeper.season === season &&
              keeper.rosterId === team.rosterId &&
              keeper.slot === slot
            ),
        ),
      );
      setDrafts((current) => ({
        ...current,
        [key]: emptyDraft(),
      }));
      setMessage({
        type: "success",
        text: `Keeper slot cleared for ${team.teamName}.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Unable to clear keeper.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link href="/" className="admin-back">
          <ArrowLeft size={16} aria-hidden="true" /> League site
        </Link>
        <div className="admin-identity">
          <span>Commissioner session</span>
          <button type="button" onClick={signOut}>
            Sign out <LogOut size={14} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="admin-hero">
        <div>
          <span>GAME OF INCHES · PRIVATE</span>
          <h1>Commissioner desk</h1>
          <p>
            Set keeper costs and eligibility here. Changes publish to the
            league keeper board immediately.
          </p>
        </div>
        <label className="admin-season">
          <span>Editing season</span>
          <select
            value={season}
            onChange={(event) => setSeason(event.target.value)}
          >
            {editableSeasons.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <ChevronDown size={17} aria-hidden="true" />
        </label>
      </section>

      {message && (
        <div className={`admin-toast admin-toast--${message.type}`} role="status">
          {message.type === "success" ? (
            <Check size={17} aria-hidden="true" />
          ) : (
            <CircleAlert size={17} aria-hidden="true" />
          )}
          {message.text}
        </div>
      )}

      <div className="admin-layout">
        <section className="admin-team-list">
          {teams.map((team) => (
            <article className="admin-team" key={team.rosterId}>
              <div className="admin-team-heading">
                <div>
                  <span>ROSTER {String(team.rosterId).padStart(2, "0")}</span>
                  <h2>{team.teamName}</h2>
                  <p>@{team.manager}</p>
                </div>
                <Crown size={23} aria-hidden="true" />
              </div>

              <div className="admin-slots">
                {[1, 2].map((slot) => {
                  const draft = draftFor(team.rosterId, slot);
                  const otherDraft = draftFor(
                    team.rosterId,
                    slot === 1 ? 2 : 1,
                  );
                  const otherKeeper = otherDraft.playerName.toLowerCase();
                  const candidates = candidatesFor(team).filter(
                    (candidate) =>
                      candidate.playerName.toLowerCase() !== otherKeeper ||
                      candidate.playerName.toLowerCase() ===
                        draft.playerName.toLowerCase(),
                  );
                  const selectedCandidate = candidates.find(
                    (candidate) =>
                      candidate.playerName.toLowerCase() ===
                      draft.playerName.toLowerCase(),
                  );
                  const savedOnly =
                    draft.playerName && !selectedCandidate
                      ? draft.playerName
                      : null;
                  const firstRoundTaken =
                    Boolean(otherDraft.playerName) &&
                    otherDraft.costRound === 1;
                  const firstRoundConflict =
                    Boolean(draft.playerName && otherDraft.playerName) &&
                    hasFirstRoundKeeperConflict(
                      draft.costRound,
                      otherDraft.costRound,
                    );
                  const key = draftKey(season, team.rosterId, slot);
                  const isSaving = savingKey === key;
                  return (
                    <div className="admin-slot" key={slot}>
                      <div className="admin-slot-label">
                        <span>KEEPER {slot}</span>
                        <button
                          type="button"
                          onClick={() => remove(team, slot)}
                          disabled={isSaving}
                          aria-label={`Clear keeper ${slot} for ${team.teamName}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="admin-fields">
                        <label className="field-wide">
                          <span>Eligible player</span>
                          <select
                            value={draft.playerName}
                            onChange={(event) => {
                              const candidate = candidates.find(
                                (item) =>
                                  item.playerName === event.target.value,
                              );
                              updateDraft(
                                team.rosterId,
                                slot,
                                candidate
                                  ? {
                                      playerName: candidate.playerName,
                                      position: candidate.position,
                                      nflTeam: candidate.nflTeam,
                                      costRound: candidate.costRound,
                                      yearsRemaining:
                                        candidate.yearsRemaining,
                                      acquisitionType:
                                        candidate.acquisitionType,
                                      notes: candidate.source,
                                    }
                                  : emptyDraft(),
                              );
                            }}
                          >
                            <option value="">Select a roster candidate</option>
                            {savedOnly && (
                              <option value={savedOnly}>
                                {savedOnly} · saved selection
                              </option>
                            )}
                            {candidates.map((candidate) => (
                              <option
                                key={candidate.playerId}
                                value={candidate.playerName}
                                disabled={
                                  candidate.playerName !== draft.playerName &&
                                  firstRoundTaken &&
                                  candidate.costRound === 1
                                }
                              >
                                {candidate.playerName} · {candidate.position} ·
                                R{candidate.costRound}
                                {firstRoundTaken &&
                                candidate.costRound === 1
                                  ? " · unavailable"
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        {selectedCandidate ? (
                          <div className="admin-candidate-summary field-wide">
                            <span>
                              {selectedCandidate.position} ·{" "}
                              {selectedCandidate.nflTeam || "FA"}
                            </span>
                            <strong>
                              Recommended R{selectedCandidate.costRound} ·{" "}
                              {selectedCandidate.yearsRemaining}{" "}
                              {selectedCandidate.yearsRemaining === 1
                                ? "year"
                                : "years"}
                            </strong>
                            <small>{selectedCandidate.source}</small>
                          </div>
                        ) : (
                          <p className="admin-candidate-empty field-wide">
                            {season === currentSeason
                              ? "Choose from this franchise’s synced roster and acquisition history."
                              : "Historical seasons preserve saved selections; roster candidates are available for the current season."}
                          </p>
                        )}
                        <label>
                          <span>2026 cost</span>
                          <select
                            value={draft.costRound}
                            onChange={(event) =>
                              updateDraft(team.rosterId, slot, {
                                costRound: Number(event.target.value),
                              })
                            }
                          >
                            {Array.from({ length: 19 }, (_, index) => (
                              <option
                                value={index + 1}
                                key={index + 1}
                                disabled={
                                  index === 0 &&
                                  draft.costRound !== 1 &&
                                  firstRoundTaken
                                }
                              >
                                Round {index + 1}
                                {index === 0 &&
                                firstRoundTaken
                                  ? " · already used"
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        {firstRoundConflict && (
                          <p
                            className="admin-field-error field-wide"
                            role="alert"
                          >
                            {FIRST_ROUND_CONFLICT_MESSAGE}
                          </p>
                        )}
                        <label>
                          <span>Keeper stage</span>
                          <select
                            value={draft.yearsRemaining}
                            onChange={(event) =>
                              updateDraft(team.rosterId, slot, {
                                yearsRemaining: Number(event.target.value),
                              })
                            }
                          >
                            <option value={3}>
                              Year 1 · offseason trade · 3 years left
                            </option>
                            <option value={2}>Year 2 · 2 years left</option>
                            <option value={1}>Year 3 · final year</option>
                          </select>
                        </label>
                        <label>
                          <span>Acquired</span>
                          <select
                            value={draft.acquisitionType}
                            onChange={(event) =>
                              updateDraft(team.rosterId, slot, {
                                acquisitionType: event.target
                                  .value as KeeperDraft["acquisitionType"],
                              })
                            }
                          >
                            <option value="draft">Draft</option>
                            <option value="waiver">Waiver / free agent</option>
                            <option value="trade">Trade</option>
                          </select>
                        </label>
                        <label className="field-wide">
                          <span>Commissioner note</span>
                          <input
                            value={draft.notes}
                            onChange={(event) =>
                              updateDraft(team.rosterId, slot, {
                                notes: event.target.value,
                              })
                            }
                            placeholder="Optional context"
                          />
                        </label>
                      </div>
                      <button
                        className="admin-save"
                        type="button"
                        onClick={() => save(team, slot)}
                        disabled={
                          isSaving ||
                          !draft.playerName.trim() ||
                          firstRoundConflict
                        }
                      >
                        {isSaving ? (
                          <LoaderCircle
                            className="spin"
                            size={15}
                            aria-hidden="true"
                          />
                        ) : (
                          <Save size={15} aria-hidden="true" />
                        )}
                        Save keeper {slot}
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>

        <aside className="admin-rules">
          <span>KEEPER CALCULATOR</span>
          <h2>Round escalator</h2>
          <ol>
            <li>Up to two players per franchise.</li>
            <li>A kept player costs one round earlier than the prior draft.</li>
            <li>Waiver pickups begin at an 8th-round cost.</li>
            <li>Players drafted after Round 10 begin at Round 10.</li>
            <li>Two keepers with the same cost occupy consecutive rounds.</li>
            <li>Two Round 1 keepers cannot be selected.</li>
            <li>Offseason trades reset the timer to three years.</li>
            <li>In-season trades receive two keeper years.</li>
          </ol>
          <p>
            The portal stores the official ruling. It does not write to the
            Sleeper draft board.
          </p>
        </aside>
      </div>
    </main>
  );
}
