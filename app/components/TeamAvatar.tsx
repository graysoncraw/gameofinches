import type { Team } from "../lib/league-types";
import { avatarUrl, initials } from "../lib/league-format";

export default function TeamAvatar({
  team,
  size = "normal",
}: {
  team: Pick<Team, "avatar" | "teamName">;
  size?: "small" | "normal" | "large";
}) {
  const src = avatarUrl(team.avatar);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={`team-avatar team-avatar--${size}`} src={src} alt="" />
  ) : (
    <span className={`team-avatar fallback team-avatar--${size}`}>
      {initials(team.teamName)}
    </span>
  );
}
