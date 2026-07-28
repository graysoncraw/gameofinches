"use client";

import { Banknote, ChevronDown, Flame, Swords, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import type { LeagueData } from "../lib/sleeper";

function money(value: number, signed = false) {
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function points(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function LeagueRecords({ data }: { data: LeagueData }) {
  const managers = useMemo(() => {
    const values = new Map<
      string,
      { userId: string; manager: string; teamName: string }
    >();
    for (const rivalry of data.rivalries) {
      values.set(rivalry.managerA.userId, rivalry.managerA);
      values.set(rivalry.managerB.userId, rivalry.managerB);
    }
    return [...values.values()].sort((a, b) =>
      a.manager.localeCompare(b.manager),
    );
  }, [data.rivalries]);

  const firstRivalry = data.rivalries[0];
  const [managerA, setManagerA] = useState(
    firstRivalry?.managerA.userId ?? managers[0]?.userId ?? "",
  );
  const [managerB, setManagerB] = useState(
    firstRivalry?.managerB.userId ?? managers[1]?.userId ?? "",
  );
  const rivalry = data.rivalries.find(
    (item) =>
      (item.managerA.userId === managerA &&
        item.managerB.userId === managerB) ||
      (item.managerA.userId === managerB &&
        item.managerB.userId === managerA),
  );
  const reversed = rivalry?.managerA.userId !== managerA;
  const sideA = rivalry
    ? reversed
      ? rivalry.managerB
      : rivalry.managerA
    : managers.find((manager) => manager.userId === managerA);
  const sideB = rivalry
    ? reversed
      ? rivalry.managerA
      : rivalry.managerB
    : managers.find((manager) => manager.userId === managerB);
  const winsA = rivalry ? (reversed ? rivalry.winsB : rivalry.winsA) : 0;
  const winsB = rivalry ? (reversed ? rivalry.winsA : rivalry.winsB) : 0;
  const pointsA = rivalry ? (reversed ? rivalry.pointsB : rivalry.pointsA) : 0;
  const pointsB = rivalry ? (reversed ? rivalry.pointsA : rivalry.pointsB) : 0;
  const pending = data.finances.seasons.find(
    (season) => season.status === "pending",
  );

  function chooseA(value: string) {
    setManagerA(value);
    if (value === managerB) {
      setManagerB(
        managers.find((manager) => manager.userId !== value)?.userId ?? "",
      );
    }
  }

  function chooseB(value: string) {
    setManagerB(value);
    if (value === managerA) {
      setManagerA(
        managers.find((manager) => manager.userId !== value)?.userId ?? "",
      );
    }
  }

  return (
    <section className="records-section" id="records">
      <div className="section-heading">
        <div>
          <span className="section-number">03 / DEEP CUTS</span>
          <h2>Money, grudges & explosions.</h2>
        </div>
        <p>
          The receipts behind the standings: settled cash, every head-to-head,
          and the biggest starter performances in league history.
        </p>
      </div>

      <div className="money-panel">
        <div className="records-title">
          <div>
            <Banknote size={22} aria-hidden="true" />
            <span>SETTLED THROUGH 2025</span>
          </div>
          <strong>League money ledger</strong>
        </div>
        <div className="money-layout">
          <div className="table-shell money-table">
            <table>
              <thead>
                <tr>
                  <th>Manager</th>
                  <th className="numeric">Buy-ins</th>
                  <th className="numeric">Won</th>
                  <th className="numeric">Net</th>
                </tr>
              </thead>
              <tbody>
                {data.finances.managers.map((manager) => (
                  <tr key={manager.userId}>
                    <td>
                      <strong>{manager.teamName}</strong>
                      <span>@{manager.manager}</span>
                    </td>
                    <td className="numeric">{money(manager.buyIns)}</td>
                    <td className="numeric">{money(manager.winnings)}</td>
                    <td
                      className={`numeric money-net ${
                        manager.net > 0
                          ? "positive"
                          : manager.net < 0
                            ? "negative"
                            : ""
                      }`}
                    >
                      {money(manager.net, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pending && (
            <aside className="pending-purse">
              <span>{pending.year} PRIZE POOL</span>
              <strong>{money(pending.prizePool)}</strong>
              <p>{money(pending.buyIn)} per franchise · pending</p>
              <dl>
                <div>
                  <dt>Champion</dt>
                  <dd>{money(pending.first)}</dd>
                </div>
                <div>
                  <dt>Runner-up</dt>
                  <dd>{money(pending.second)}</dd>
                </div>
                <div>
                  <dt>Third place</dt>
                  <dd>{money(pending.third)}</dd>
                </div>
              </dl>
            </aside>
          )}
        </div>
      </div>

      <div className="rivalry-panel">
        <div className="records-title">
          <div>
            <Swords size={22} aria-hidden="true" />
            <span>HEAD TO HEAD</span>
          </div>
          <strong>Choose your enemies</strong>
        </div>
        <div className="rivalry-selectors">
          <label className="select-shell">
            <span className="sr-only">First manager</span>
            <select value={managerA} onChange={(event) => chooseA(event.target.value)}>
              {managers
                .filter((manager) => manager.userId !== managerB)
                .map((manager) => (
                  <option value={manager.userId} key={manager.userId}>
                    {manager.manager}
                  </option>
                ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
          <span>VS</span>
          <label className="select-shell">
            <span className="sr-only">Second manager</span>
            <select value={managerB} onChange={(event) => chooseB(event.target.value)}>
              {managers
                .filter((manager) => manager.userId !== managerA)
                .map((manager) => (
                  <option value={manager.userId} key={manager.userId}>
                    {manager.manager}
                  </option>
                ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
        </div>

        {rivalry ? (
          <>
            <div className="rivalry-score">
              <div>
                <span>{sideA?.teamName}</span>
                <strong>{winsA}</strong>
                <small>{points(pointsA)} total points</small>
              </div>
              <div className="rivalry-center">
                <span>ALL TIME</span>
                <strong>
                  {rivalry.games.length} game
                  {rivalry.games.length === 1 ? "" : "s"}
                </strong>
                <small>{rivalry.ties ? `${rivalry.ties} tied` : "No ties"}</small>
              </div>
              <div>
                <span>{sideB?.teamName}</span>
                <strong>{winsB}</strong>
                <small>{points(pointsB)} total points</small>
              </div>
            </div>
            <div className="rivalry-games">
              {rivalry.games.map((game) => {
                const gameReversed = game.managerAId !== managerA;
                return (
                  <div key={`${game.season}-${game.week}`}>
                    <span>
                      {game.season} · Week {game.week}
                      {game.postseason ? " · Postseason" : ""}
                    </span>
                    <strong>
                      {points(gameReversed ? game.pointsB : game.pointsA)}
                      <i>—</i>
                      {points(gameReversed ? game.pointsA : game.pointsB)}
                    </strong>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rivalry-empty">These two have not met yet.</div>
        )}
      </div>

      <div className="performances-panel">
        <div className="records-title">
          <div>
            <Flame size={22} aria-hidden="true" />
            <span>TOP 10 STARTER SCORES</span>
          </div>
          <strong>Sunday detonations</strong>
        </div>
        <div className="performance-list">
          {data.topPerformances.map((performance, index) => (
            <article key={`${performance.season}-${performance.week}-${performance.playerId}`}>
              <span className="performance-rank">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="performance-player">
                <span>{performance.position || "FLEX"}</span>
                <div>
                  <strong>{performance.playerName}</strong>
                  <small>
                    {performance.season} · Week {performance.week}
                    {performance.postseason ? " · Postseason" : ""}
                  </small>
                </div>
              </div>
              <div className="performance-owner">
                <span>Owned by</span>
                <strong>{performance.teamName}</strong>
                <small>
                  @{performance.owner} vs. {performance.opponentTeam}
                </small>
              </div>
              <div className="performance-points">
                <Trophy size={16} aria-hidden="true" />
                <strong>{points(performance.points)}</strong>
                <span>PTS</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
