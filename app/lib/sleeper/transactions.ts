import type { LeagueTransaction, TransactionFeed, Team } from "../league-types";
import type { SleeperLeague, SleeperTransaction, PlayerLabel } from "./types";
import { sleeperFetch } from "./client";
import { playerLabel } from "./players";

export async function loadTransactionFeed(
  league: SleeperLeague,
  teams: Team[],
  players: Record<string, PlayerLabel>,
): Promise<TransactionFeed> {
  const weeklyTransactions = await Promise.all(
    Array.from({ length: 19 }, (_, week) =>
      sleeperFetch<SleeperTransaction[]>(
        `/league/${league.league_id}/transactions/${week}`,
      ),
    ),
  );
  const teamByRoster = new Map(
    teams.map((team) => [
      team.rosterId,
      { teamName: team.teamName, manager: team.manager },
    ]),
  );
  const teamName = (rosterId: number) =>
    teamByRoster.get(rosterId)?.teamName ?? `Roster ${rosterId}`;
  const seen = new Set<string>();
  const transactions = weeklyTransactions
    .flat()
    .filter((transaction) => {
      if (
        transaction.status !== "complete" ||
        !["trade", "waiver", "free_agent"].includes(transaction.type) ||
        seen.has(transaction.transaction_id)
      ) {
        return false;
      }
      seen.add(transaction.transaction_id);
      return true;
    })
    .map<LeagueTransaction>((transaction) => {
      const rosterIds = new Set<number>(transaction.roster_ids ?? []);
      for (const rosterId of Object.values(transaction.adds ?? {})) {
        rosterIds.add(Number(rosterId));
      }
      for (const rosterId of Object.values(transaction.drops ?? {})) {
        rosterIds.add(Number(rosterId));
      }
      return {
        id: transaction.transaction_id,
        type: transaction.type,
        source: "sleeper",
        commissionerEdited: false,
        week: transaction.leg ?? 0,
        created: transaction.created,
        waiverBid: transaction.settings?.waiver_bid ?? null,
        teams: [...rosterIds].map((rosterId) => {
          const team = teamByRoster.get(rosterId);
          return {
            rosterId,
            teamName: team?.teamName ?? `Roster ${rosterId}`,
            manager: team?.manager ?? `Roster ${rosterId}`,
            adds: Object.entries(transaction.adds ?? {})
              .filter(([, target]) => Number(target) === rosterId)
              .map(([playerId]) => playerLabel(playerId, players)),
            drops: Object.entries(transaction.drops ?? {})
              .filter(([, source]) => Number(source) === rosterId)
              .map(([playerId]) => playerLabel(playerId, players)),
          };
        }),
        draftPicks: (transaction.draft_picks ?? []).map((pick) => ({
          season: pick.season,
          round: pick.round,
          originalTeam: teamName(pick.roster_id),
          from: teamName(pick.previous_owner_id),
          to: teamName(pick.owner_id),
          originalRosterId: pick.roster_id,
          previousOwnerRosterId: pick.previous_owner_id,
          ownerRosterId: pick.owner_id,
        })),
        faabTransfers: (transaction.waiver_budget ?? []).map((transfer) => ({
          amount: transfer.amount,
          from: teamName(transfer.sender),
          to: teamName(transfer.receiver),
          senderRosterId: transfer.sender,
          receiverRosterId: transfer.receiver,
        })),
      };
    })
    .sort((a, b) => b.created - a.created);

  return {
    season: league.season,
    transactions,
    counts: {
      all: transactions.length,
      trade: transactions.filter((item) => item.type === "trade").length,
      waiver: transactions.filter((item) => item.type === "waiver").length,
      free_agent: transactions.filter((item) => item.type === "free_agent")
        .length,
    },
  };
}
