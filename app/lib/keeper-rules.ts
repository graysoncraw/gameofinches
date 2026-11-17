import type { KeeperCandidate } from "./chaos";
import type { KeeperRecord } from "./keepers";

export const FIRST_ROUND_CONFLICT_MESSAGE =
  "Two Round 1 keepers are not allowed. Choose one.";

export function hasFirstRoundKeeperConflict(
  firstCost: number | null | undefined,
  secondCost: number | null | undefined,
) {
  return firstCost === 1 && secondCost === 1;
}

export function projectKeeperCandidate(
  candidate: KeeperCandidate,
  keepers: KeeperRecord[],
  sourceSeason: string,
): KeeperCandidate {
  const sameRoster = keepers.find(
    (keeper) =>
      keeper.season === sourceSeason &&
      keeper.rosterId === candidate.rosterId &&
      keeper.playerName.toLowerCase() === candidate.playerName.toLowerCase(),
  );
  const previous =
    sameRoster ??
    keepers.find(
      (keeper) =>
        keeper.season === sourceSeason &&
        keeper.playerName.toLowerCase() === candidate.playerName.toLowerCase(),
    );
  if (!previous) return candidate;

  const traded = candidate.acquisitionType === "trade";
  const yearsRemaining =
    candidate.tradeTiming === "offseason"
      ? 3
      : candidate.tradeTiming === "in-season"
        ? 2
        : Math.max(0, previous.yearsRemaining - 1);
  const keeperYearsUsed = Math.max(1, 3 - yearsRemaining);

  return {
    ...candidate,
    costRound: Math.max(1, previous.costRound - 1),
    yearsRemaining,
    acquisitionType: traded ? "trade" : previous.acquisitionType,
    source:
      candidate.tradeTiming === "offseason"
        ? "Offseason trade · timer reset to 3 years; keeper cost lineage retained"
        : candidate.tradeTiming === "in-season"
          ? "In-season trade · 2 years left; keeper cost lineage retained"
          : `Returning keeper · ${keeperYearsUsed} ${keeperYearsUsed === 1 ? "year" : "years"} previously`,
  };
}
