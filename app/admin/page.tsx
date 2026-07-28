import AdminLogin from "./AdminLogin";
import AdminPortal from "./AdminPortal";
import { hasCommissionerSession } from "../lib/admin-auth";
import { getKeeperRecords } from "../lib/keepers";
import { getLeagueData } from "../lib/sleeper";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await hasCommissionerSession())) return <AdminLogin />;

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
      keeperCandidates={league.chaos.keeperCandidates}
      sourceSeason={
        league.seasons.find((season) => season.status === "complete")?.year ??
        ""
      }
    />
  );
}
