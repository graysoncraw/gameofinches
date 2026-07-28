"use client";

import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Banknote,
  LoaderCircle,
  Search,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LeagueTransaction, TransactionFeed } from "../lib/sleeper";

type TransactionFilter = "all" | "trade" | "waiver" | "free_agent";

function typeLabel(type: LeagueTransaction["type"]) {
  if (type === "free_agent") return "Free agent";
  return type[0].toUpperCase() + type.slice(1);
}

function TransactionIcon({ type }: { type: LeagueTransaction["type"] }) {
  if (type === "trade") return <ArrowLeftRight size={18} aria-hidden="true" />;
  if (type === "waiver") return <Banknote size={18} aria-hidden="true" />;
  return <ShoppingBasket size={18} aria-hidden="true" />;
}

export default function TransactionHistory({
  seasons,
  defaultSeason,
}: {
  seasons: string[];
  defaultSeason: string;
}) {
  const [season, setSeason] = useState(defaultSeason);
  const [feed, setFeed] = useState<TransactionFeed | null>(null);
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setVisible(20);
    setFilter("all");
    fetch(`/api/transactions?season=${season}`)
      .then(async (response) => {
        const payload = (await response.json()) as TransactionFeed & {
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Request failed.");
        return payload;
      })
      .then((payload) => {
        if (!cancelled) setFeed(payload);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load transactions.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [season]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (feed?.transactions ?? []).filter((transaction) => {
      if (filter !== "all" && transaction.type !== filter) return false;
      if (!normalizedQuery) return true;
      return JSON.stringify(transaction)
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [feed, filter, query]);

  return (
    <section className="transaction-section" id="transactions">
      <div className="section-heading light">
        <div>
          <span className="section-number">05 / LEAGUE WIRE</span>
          <h2>Every move leaves a trail.</h2>
        </div>
        <p>
          Completed trades, waiver claims, and free-agent moves pulled directly
          from Sleeper.
        </p>
      </div>

      <div className="transaction-toolbar">
        <div className="year-tabs transaction-years">
          {seasons.map((year) => (
            <button
              className={season === year ? "active" : ""}
              type="button"
              key={year}
              onClick={() => setSeason(year)}
            >
              {year}
            </button>
          ))}
        </div>
        <label className="transaction-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search transactions</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a player or franchise…"
          />
        </label>
      </div>

      {feed && (
        <div className="transaction-filters" aria-label="Transaction type">
          {(
            [
              ["all", "All moves", feed.counts.all],
              ["trade", "Trades", feed.counts.trade],
              ["waiver", "Waivers", feed.counts.waiver],
              ["free_agent", "Free agents", feed.counts.free_agent],
            ] as const
          ).map(([value, label, count]) => (
            <button
              type="button"
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => {
                setFilter(value);
                setVisible(20);
              }}
            >
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="transaction-state">
          <LoaderCircle className="spin" size={26} aria-hidden="true" />
          <strong>Opening the {season} ledger…</strong>
        </div>
      ) : error ? (
        <div className="transaction-state">
          <Sparkles size={26} aria-hidden="true" />
          <strong>The Sleeper transaction feed is unavailable.</strong>
          <p>{error}</p>
        </div>
      ) : filtered.length ? (
        <>
          <div className="transaction-list">
            {filtered.slice(0, visible).map((transaction) => (
              <article className="transaction-card" key={transaction.id}>
                <div className={`transaction-type type-${transaction.type}`}>
                  <TransactionIcon type={transaction.type} />
                  <span>{typeLabel(transaction.type)}</span>
                </div>
                <div className="transaction-body">
                  <div className="transaction-meta">
                    <span>
                      {new Date(transaction.created).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "America/Chicago",
                        },
                      )}
                    </span>
                    <span>Week {transaction.week || "Offseason"}</span>
                    {transaction.waiverBid !== null && (
                      <strong>${transaction.waiverBid} FAAB</strong>
                    )}
                  </div>
                  <div className="transaction-teams">
                    {transaction.teams.map((team) => (
                      <div className="transaction-team" key={team.rosterId}>
                        <div>
                          <strong>{team.teamName}</strong>
                          <span>@{team.manager}</span>
                        </div>
                        <div className="move-list">
                          {team.adds.map((player) => (
                            <span className="move-add" key={`add-${player.id}`}>
                              <ArrowUp size={12} aria-hidden="true" />
                              {player.name}
                              <small>
                                {player.position} {player.nflTeam}
                              </small>
                            </span>
                          ))}
                          {team.drops.map((player) => (
                            <span
                              className="move-drop"
                              key={`drop-${player.id}`}
                            >
                              <ArrowDown size={12} aria-hidden="true" />
                              {player.name}
                              <small>
                                {player.position} {player.nflTeam}
                              </small>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {(transaction.draftPicks.length > 0 ||
                    transaction.faabTransfers.length > 0) && (
                    <div className="transaction-extras">
                      {transaction.draftPicks.map((pick, index) => (
                        <span key={`${pick.season}-${pick.round}-${index}`}>
                          {pick.season} Round {pick.round}: {pick.from} →{" "}
                          {pick.to}
                        </span>
                      ))}
                      {transaction.faabTransfers.map((transfer, index) => (
                        <span key={`${transfer.from}-${transfer.to}-${index}`}>
                          ${transfer.amount} FAAB: {transfer.from} → {transfer.to}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          {visible < filtered.length && (
            <button
              className="load-more"
              type="button"
              onClick={() => setVisible((count) => count + 20)}
            >
              Show 20 more · {filtered.length - visible} remaining
            </button>
          )}
        </>
      ) : (
        <div className="transaction-state">
          <ShoppingBasket size={26} aria-hidden="true" />
          <strong>No completed moves found.</strong>
          <p>Try another transaction type, search, or season.</p>
        </div>
      )}
    </section>
  );
}
