import Link from "next/link";
import LeagueDashboard from "./components/LeagueDashboard";
import { getKeeperRecords } from "./lib/keepers";
import { getLeagueData } from "./lib/sleeper";

export const dynamic = "force-dynamic";

async function loadHomeData() {
  try {
    const [data, keepers] = await Promise.all([
      getLeagueData(),
      getKeeperRecords(),
    ]);
    return { data, keepers };
  } catch (error) {
    console.error("Unable to load Sleeper league data", error);
    return null;
  }
}

export default async function Home() {
  const result = await loadHomeData();
  if (result) {
    return <LeagueDashboard data={result.data} keepers={result.keepers} />;
  }

  return (
    <main className="error-page">
      <div className="error-card">
        <span>GAME OF INCHES</span>
        <h1>The data feed is taking a timeout.</h1>
        <p>
          Sleeper didn’t answer this request. Refresh in a moment and the league
          archive should be right back.
        </p>
        <Link href="/">Try again</Link>
      </div>
    </main>
  );
}
