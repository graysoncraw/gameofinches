import LeagueDashboard from "./components/LeagueDashboard";
import { getKeeperRecords } from "./lib/keepers";
import { getLeagueData } from "./lib/sleeper";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const [data, keepers] = await Promise.all([
      getLeagueData(),
      getKeeperRecords(),
    ]);
    return <LeagueDashboard data={data} keepers={keepers} />;
  } catch (error) {
    console.error("Unable to load Sleeper league data", error);
    return (
      <main className="error-page">
        <div className="error-card">
          <span>GAME OF INCHES</span>
          <h1>The data feed is taking a timeout.</h1>
          <p>
            Sleeper didn’t answer this request. Refresh in a moment and the
            league archive should be right back.
          </p>
          <a href="/">Try again</a>
        </div>
      </main>
    );
  }
}
