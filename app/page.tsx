import LeagueDashboard from "./components/LeagueDashboard";
import { getLeagueData } from "./lib/sleeper";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const data = await getLeagueData();
    return <LeagueDashboard data={data} />;
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
