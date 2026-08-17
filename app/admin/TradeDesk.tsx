"use client";

import {
  ArrowRight,
  Check,
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { KeeperCandidate } from "../lib/chaos";
import type { LeagueTransaction, Team } from "../lib/sleeper";

type TradeAsset = {
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string;
  fromRosterId: number;
  toRosterId: number;
};

type TradeDraft = {
  transactionId: string;
  date: string;
  week: number;
  assets: TradeAsset[];
};

const blankAsset = (teams: Team[]): TradeAsset => ({
  playerId: "",
  playerName: "",
  position: "",
  nflTeam: "",
  fromRosterId: teams[0]?.rosterId ?? 0,
  toRosterId: teams[1]?.rosterId ?? 0,
});

const blankDraft = (teams: Team[]): TradeDraft => ({
  transactionId: "",
  date: new Date().toISOString().slice(0, 10),
  week: 0,
  assets: [blankAsset(teams)],
});

function localDate(milliseconds: number) {
  const date = new Date(milliseconds);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function transactionAssets(transaction: LeagueTransaction): TradeAsset[] {
  const drops = new Map<
    string,
    { player: LeagueTransaction["teams"][number]["drops"][number]; rosterId: number }
  >();
  for (const side of transaction.teams) {
    for (const player of side.drops) {
      drops.set(player.id, { player, rosterId: side.rosterId });
    }
  }
  return transaction.teams.flatMap((side) =>
    side.adds.flatMap((player) => {
      const source = drops.get(player.id);
      if (!source || source.rosterId === side.rosterId) return [];
      return [{
        playerId: player.id,
        playerName: player.name,
        position: player.position,
        nflTeam: player.nflTeam,
        fromRosterId: source.rosterId,
        toRosterId: side.rosterId,
      }];
    }),
  );
}

function sourceLabel(transaction: LeagueTransaction) {
  if (transaction.source !== "commissioner") return "Sleeper";
  return transaction.commissionerEdited
    ? "Commissioner adjusted"
    : "Commissioner entry";
}

export default function TradeDesk({
  currentSeason,
  seasons,
  teamsBySeason,
  keeperCandidates,
}: {
  currentSeason: string;
  seasons: string[];
  teamsBySeason: Record<string, Team[]>;
  keeperCandidates: KeeperCandidate[];
}) {
  const tradeSeasons = useMemo(
    () => [...new Set([currentSeason, ...seasons])].sort((a, b) => Number(b) - Number(a)),
    [currentSeason, seasons],
  );
  const [season, setSeason] = useState(currentSeason);
  const [trades, setTrades] = useState<LeagueTransaction[]>([]);
  const [draft, setDraft] = useState<TradeDraft>(() =>
    blankDraft(teamsBySeason[currentSeason] ?? []),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const teams = teamsBySeason[season] ?? [];
  const selectedTrade = trades.find((trade) => trade.id === draft.transactionId);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setStatus(null);
      fetch(`/api/admin/transactions?season=${season}`)
        .then(async (response) => {
          const payload = (await response.json()) as {
            transactions?: LeagueTransaction[];
            error?: string;
          };
          if (!response.ok) {
            throw new Error(payload.error ?? "Unable to load trades.");
          }
          return payload.transactions ?? [];
        })
        .then((items) => {
          if (cancelled) return;
          setTrades(items);
          setDraft(blankDraft(teamsBySeason[season] ?? []));
        })
        .catch((error) => {
          if (!cancelled) {
            setStatus({
              type: "error",
              text:
                error instanceof Error ? error.message : "Unable to load trades.",
            });
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [season, teamsBySeason]);

  function selectTrade(id: string) {
    const transaction = trades.find((item) => item.id === id);
    if (!transaction) {
      setDraft(blankDraft(teams));
      return;
    }
    const assets = transactionAssets(transaction);
    setDraft({
      transactionId: transaction.id,
      date: localDate(transaction.created),
      week: transaction.week,
      assets,
    });
    setStatus(null);
  }

  function updateAsset(index: number, patch: Partial<TradeAsset>) {
    setDraft((current) => ({
      ...current,
      assets: current.assets.map((asset, assetIndex) =>
        assetIndex === index ? { ...asset, ...patch } : asset,
      ),
    }));
  }

  function playerOptions(asset: TradeAsset) {
    const candidates =
      season === currentSeason
        ? keeperCandidates.filter(
            (candidate) => candidate.rosterId === asset.fromRosterId,
          )
        : [];
    if (
      asset.playerId &&
      !candidates.some((candidate) => candidate.playerId === asset.playerId)
    ) {
      return [
        {
          playerId: asset.playerId,
          playerName: asset.playerName,
          position: asset.position,
          nflTeam: asset.nflTeam,
          rosterId: asset.fromRosterId,
        },
        ...candidates,
      ];
    }
    return candidates;
  }

  async function saveTrade() {
    setSaving(true);
    setStatus(null);
    try {
      const created = new Date(`${draft.date}T12:00:00`).getTime();
      const response = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season,
          transactionId: draft.transactionId || undefined,
          week: draft.week,
          created,
          assets: draft.assets,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save trade.");
      setStatus({
        type: "success",
        text: draft.transactionId
          ? "Trade history updated. Refreshing Keeper Lab…"
          : "Manual trade added. Refreshing Keeper Lab…",
      });
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to save trade.",
      });
      setSaving(false);
    }
  }

  async function removeEdit() {
    if (!selectedTrade || selectedTrade.source !== "commissioner") return;
    const confirmed = window.confirm(
      selectedTrade.commissionerEdited
        ? "Restore Sleeper's original version of this trade?"
        : "Delete this commissioner-entered trade?",
    );
    if (!confirmed) return;
    setSaving(true);
    setStatus(null);
    try {
      const params = new URLSearchParams({ transactionId: selectedTrade.id });
      const response = await fetch(`/api/admin/transactions?${params}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to update trade.");
      setStatus({
        type: "success",
        text: selectedTrade.commissionerEdited
          ? "Sleeper’s original trade was restored."
          : "Manual trade removed.",
      });
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to update trade.",
      });
      setSaving(false);
    }
  }

  return (
    <section className="admin-trade-desk">
      <div className="admin-trade-heading">
        <div>
          <span>MANUAL LEAGUE LEDGER</span>
          <h2>Trade desk</h2>
          <p>
            Add keeper-only trades or correct a Sleeper trade. These entries
            update public trade history and Keeper Lab immediately.
          </p>
        </div>
        <label>
          <span>Trade season</span>
          <select value={season} onChange={(event) => setSeason(event.target.value)}>
            {tradeSeasons.map((year) => (
              <option value={year} key={year}>{year}</option>
            ))}
          </select>
        </label>
      </div>

      {status && (
        <div className={`admin-trade-status admin-trade-status--${status.type}`} role="status">
          {status.type === "success" ? <Check size={15} /> : <CircleAlert size={15} />}
          {status.text}
        </div>
      )}

      <div className="admin-trade-grid">
        <div className="admin-trade-history">
          <button
            type="button"
            className={!draft.transactionId ? "active" : ""}
            onClick={() => selectTrade("")}
          >
            <Plus size={15} />
            <span><strong>Add manual trade</strong><small>Keeper or off-platform move</small></span>
          </button>
          {loading ? (
            <div className="admin-trade-loading"><LoaderCircle className="spin" size={18} /> Loading trades…</div>
          ) : (
            trades.map((trade) => (
              <button
                type="button"
                className={draft.transactionId === trade.id ? "active" : ""}
                onClick={() => selectTrade(trade.id)}
                key={trade.id}
              >
                <Pencil size={14} />
                <span>
                  <strong>{trade.teams.map((team) => team.teamName).join(" ↔ ")}</strong>
                  <small>Week {trade.week || "Offseason"} · {sourceLabel(trade)}</small>
                </span>
              </button>
            ))
          )}
        </div>

        <div className="admin-trade-editor">
          <div className="admin-trade-meta">
            <label>
              <span>Trade date</span>
              <input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
            </label>
            <label>
              <span>Timing</span>
              <select value={draft.week} onChange={(event) => setDraft((current) => ({ ...current, week: Number(event.target.value) }))}>
                <option value={0}>Offseason · resets to 3 years</option>
                {Array.from({ length: 18 }, (_, index) => (
                  <option value={index + 1} key={index + 1}>Week {index + 1} · 2 years</option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-trade-assets">
            {draft.assets.map((asset, index) => {
              const options = playerOptions(asset);
              return (
                <div className="admin-trade-asset" key={`${index}-${asset.playerId}`}>
                  <label>
                    <span>From</span>
                    <select value={asset.fromRosterId} onChange={(event) => updateAsset(index, { fromRosterId: Number(event.target.value), playerId: "", playerName: "", position: "", nflTeam: "" })}>
                      {teams.map((team) => <option value={team.rosterId} key={team.rosterId}>{team.teamName}</option>)}
                    </select>
                  </label>
                  <label className="admin-trade-player">
                    <span>Player</span>
                    <select
                      value={asset.playerId}
                      onChange={(event) => {
                        const candidate = options.find((item) => item.playerId === event.target.value);
                        updateAsset(index, candidate ? {
                          playerId: candidate.playerId,
                          playerName: candidate.playerName,
                          position: candidate.position,
                          nflTeam: candidate.nflTeam,
                        } : { playerId: "", playerName: "", position: "", nflTeam: "" });
                      }}
                    >
                      <option value="">Select keeper candidate</option>
                      {options.map((candidate) => (
                        <option value={candidate.playerId} key={candidate.playerId}>
                          {candidate.playerName} · {candidate.position} {candidate.nflTeam}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ArrowRight className="admin-trade-arrow" size={17} />
                  <label>
                    <span>To</span>
                    <select value={asset.toRosterId} onChange={(event) => updateAsset(index, { toRosterId: Number(event.target.value) })}>
                      {teams.map((team) => (
                        <option value={team.rosterId} disabled={team.rosterId === asset.fromRosterId} key={team.rosterId}>{team.teamName}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="admin-trade-remove"
                    onClick={() => setDraft((current) => ({ ...current, assets: current.assets.filter((_, assetIndex) => assetIndex !== index) }))}
                    disabled={draft.assets.length === 1}
                    aria-label={`Remove traded player ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          <button type="button" className="admin-trade-add" onClick={() => setDraft((current) => ({ ...current, assets: [...current.assets, blankAsset(teams)] }))}>
            <Plus size={14} /> Add another player
          </button>

          <div className="admin-trade-actions">
            {selectedTrade?.source === "commissioner" && (
              <button type="button" className="admin-trade-reset" onClick={removeEdit} disabled={saving}>
                {selectedTrade.commissionerEdited ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                {selectedTrade.commissionerEdited ? "Restore Sleeper version" : "Delete manual trade"}
              </button>
            )}
            <button type="button" className="admin-trade-save" onClick={saveTrade} disabled={saving || draft.assets.some((asset) => !asset.playerId || asset.fromRosterId === asset.toRosterId)}>
              {saving ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}
              {draft.transactionId ? "Save trade changes" : "Add to league history"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
