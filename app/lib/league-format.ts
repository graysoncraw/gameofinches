import type { Season, Team } from "./league-types";

const pointsFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});
export const formatPoints = (value: number) => pointsFormatter.format(value);
export const avatarUrl = (avatar: string | null) =>
  avatar ? `https://sleepercdn.com/avatars/thumbs/${avatar}` : null;
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
export const record = (team: Pick<Team, "wins" | "losses" | "ties">) =>
  `${team.wins}–${team.losses}${team.ties ? `–${team.ties}` : ""}`;
export const standings = (season: Season) =>
  [...season.teams].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.ties - a.ties ||
      b.pointsFor - a.pointsFor ||
      a.rosterId - b.rosterId,
  );
