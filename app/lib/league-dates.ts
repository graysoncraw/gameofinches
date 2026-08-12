const DRAFT_FALLBACKS: Record<string, number> = {
  "2026": Date.parse("2026-09-05T19:00:00-05:00"),
};

const KEEPER_DEADLINES: Record<string, string> = {
  "2026": "2026-08-17",
};

export function resolveDraftStart(
  season: string,
  sleeperStartTime: number | null | undefined,
) {
  return sleeperStartTime ?? DRAFT_FALLBACKS[season] ?? null;
}

export function keeperDeadlineForSeason(season: string) {
  const date = KEEPER_DEADLINES[season];
  return date ? new Date(`${date}T12:00:00-05:00`) : null;
}
