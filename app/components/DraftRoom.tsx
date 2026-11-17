"use client";

import { ChevronDown, DraftingCompass, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { DraftPick } from "../lib/league-types";
import type { LeagueData } from "../lib/league-types";

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

export default function DraftRoom({ data }: { data: LeagueData }) {
  const current = data.seasons[0];
  const [draftYear, setDraftYear] = useState(current.year);
  const [draftRound, setDraftRound] = useState(1);
  const [draftSearch, setDraftSearch] = useState("");
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

  function chooseDraftYear(year: string) {
    setDraftYear(year);
    setDraftRound(1);
    setDraftSearch("");
  }

  return (
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
          <span>{draftSearch ? "SEARCH RESULTS" : `ROUND ${draftRound}`}</span>
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
  );
}
