const KEEPER_DEADLINES: Record<string, string> = {
  "2026": "2026-08-17",
};

export function keeperDeadlineForSeason(season: string) {
  const date = KEEPER_DEADLINES[season];
  return date ? new Date(`${date}T12:00:00-05:00`) : null;
}
