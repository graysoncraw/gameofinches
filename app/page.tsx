/* eslint-disable @next/next/no-html-link-for-pages -- keep page links compatible with the vinext runtime. */

import LeagueDashboard from "./components/LeagueDashboard";
import { getKeeperRecords } from "./lib/keepers";
import { getLeagueData } from "./lib/sleeper";
import type { LeagueData } from "./lib/sleeper";

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

function dataForPage(
  data: LeagueData,
  activePage: string,
  profileUserId?: string,
): LeagueData {
  const chaos = data.chaos;
  const recordBookPage = activePage === "records-book";
  const eloPage = activePage === "records-elo";
  return {
    ...data,
    chaos: {
      ...chaos,
      recaps: [],
      records:
        recordBookPage || activePage === "profile"
          ? chaos.records
          : [],
      elo:
        eloPage || activePage === "profile"
          ? chaos.elo
          : { standings: [], timeline: [] },
      drafts: [],
      trades: [],
      superlatives:
        activePage === "records-superlatives" ? chaos.superlatives : [],
      franchises:
        activePage === "profile"
          ? chaos.franchises.filter(
              (franchise) => franchise.userId === profileUserId,
            ).map((franchise) => ({ ...franchise, draftGrades: [] }))
          : [],
      keeperCandidates:
        activePage === "keepers-lab" ? chaos.keeperCandidates : [],
    },
  };
}

export default async function Home({
  activePage = "overview",
  profileUserId,
}: {
  activePage?: string;
  profileUserId?: string;
} = {}) {
  const result = await loadHomeData();
  if (result) {
    const pageData = dataForPage(result.data, activePage, profileUserId);
    return (
      <LeagueDashboard
        activePage={activePage}
        data={pageData}
        keepers={result.keepers}
        profileUserId={profileUserId}
      />
    );
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
        <a href="/">Try again</a>
      </div>
    </main>
  );
}
