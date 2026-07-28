import { LockKeyhole } from "lucide-react";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import AdminPortal from "./AdminPortal";
import { isCommissioner } from "../lib/admin-auth";
import { getKeeperRecords } from "../lib/keepers";
import { getLeagueData } from "../lib/sleeper";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");

  if (!isCommissioner(user)) {
    return (
      <main className="admin-denied">
        <div>
          <LockKeyhole size={30} aria-hidden="true" />
          <span>GAME OF INCHES · COMMISSIONER DESK</span>
          <h1>This account isn’t on the commissioner list.</h1>
          <p>
            You’re signed in as {user.email}. Ask the commissioner to add this
            email before trying again.
          </p>
          <a href={chatGPTSignOutPath("/admin")}>Sign in with another account</a>
        </div>
      </main>
    );
  }

  const [league, keepers] = await Promise.all([
    getLeagueData(),
    getKeeperRecords(),
  ]);

  return (
    <AdminPortal
      currentSeason={league.currentSeason}
      seasons={league.seasons.map((season) => season.year)}
      teamsBySeason={Object.fromEntries(
        league.seasons.map((season) => [season.year, season.teams]),
      )}
      initialKeepers={keepers}
      user={user}
      signOutPath={chatGPTSignOutPath("/")}
    />
  );
}
