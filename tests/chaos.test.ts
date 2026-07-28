import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDraftReports,
  buildElo,
  buildKeeperCandidates,
  buildRecordBook,
  buildTradeAnalyses,
  buildWeeklyRecaps,
  optimalLineupPoints,
  type WeeklyPlayerFact,
  type WeeklyTeamFact,
} from "../app/lib/chaos.ts";
import {
  hasFirstRoundKeeperConflict,
  projectKeeperCandidate,
} from "../app/lib/keeper-candidates.ts";
import type { KeeperRecord } from "../app/lib/keepers.ts";
import type {
  RivalryGame,
  Season,
  Team,
  TransactionFeed,
} from "../app/lib/sleeper.ts";

const teamA: Team = {
  rosterId: 1,
  userId: "a",
  manager: "Alpha",
  username: "alpha",
  teamName: "Alpha Team",
  avatar: null,
  commissioner: false,
  wins: 1,
  losses: 0,
  ties: 0,
  pointsFor: 120,
  pointsAgainst: 110,
  potentialPoints: 130,
  waiverBudgetUsed: 0,
  waiverPosition: 1,
  playerCount: 2,
};

const teamB: Team = {
  ...teamA,
  rosterId: 2,
  userId: "b",
  manager: "Bravo",
  username: "bravo",
  teamName: "Bravo Team",
  wins: 0,
  losses: 1,
  pointsFor: 110,
  pointsAgainst: 120,
};

const game: RivalryGame = {
  season: "2025",
  week: 1,
  postseason: false,
  managerAId: "a",
  managerBId: "b",
  managerA: "Alpha",
  managerB: "Bravo",
  teamA: "Alpha Team",
  teamB: "Bravo Team",
  pointsA: 120,
  pointsB: 110,
  winnerId: "a",
};

const season: Season = {
  leagueId: "league",
  year: "2025",
  status: "complete",
  teams: [teamA, teamB],
  champion: teamA,
  runnerUp: teamB,
  thirdPlace: null,
  draft: {
    id: "draft",
    status: "complete",
    type: "snake",
    rounds: 2,
    startTime: null,
    picks: [
      {
        pickNo: 1,
        round: 1,
        draftSlot: 1,
        rosterId: 1,
        playerId: "p1",
        playerName: "Starter One",
        position: "QB",
        nflTeam: "AAA",
        teamName: "Alpha Team",
        manager: "Alpha",
        isKeeper: false,
      },
      {
        pickNo: 2,
        round: 1,
        draftSlot: 2,
        rosterId: 2,
        playerId: "keeper",
        playerName: "Keeper",
        position: "RB",
        nflTeam: "BBB",
        teamName: "Bravo Team",
        manager: "Bravo",
        isKeeper: true,
      },
      {
        pickNo: 3,
        round: 2,
        draftSlot: 2,
        rosterId: 2,
        playerId: "p2",
        playerName: "Starter Two",
        position: "WR",
        nflTeam: "BBB",
        teamName: "Bravo Team",
        manager: "Bravo",
        isKeeper: false,
      },
    ],
  },
  settings: {
    maxKeepers: 2,
    playoffTeams: 2,
    playoffWeekStart: 15,
    waiverBudget: 100,
    tradeDeadline: 11,
    rosterPositions: ["QB", "QB", "RB", "WR", "FLEX", "BN"],
    receptionPoints: 1,
  },
};

test("optimal lineup respects duplicate QB and flex slots", () => {
  assert.equal(
    optimalLineupPoints(
      ["QB", "QB", "RB", "FLEX", "BN"],
      [
        { position: "QB", points: 25 },
        { position: "QB", points: 20 },
        { position: "RB", points: 18 },
        { position: "WR", points: 22 },
        { position: "TE", points: 4 },
      ],
    ),
    85,
  );
});

test("Elo is chronological, symmetric, and starts at 1500", () => {
  const elo = buildElo(
    [game, { ...game, week: 2, winnerId: null, pointsA: 100, pointsB: 100 }],
    new Map([
      ["a", teamA],
      ["b", teamB],
    ]),
  );
  assert.equal(elo.timeline.length, 4);
  assert.equal(elo.standings[0].userId, "a");
  assert.equal(
    Math.round(
      elo.standings.reduce((total, standing) => total + standing.rating, 0),
    ),
    3000,
  );
});

test("record book excludes unplayed zero games and tracks bench gaps", () => {
  const teamFacts: WeeklyTeamFact[] = [
    {
      season: "2025",
      week: 1,
      rosterId: 1,
      userId: "a",
      manager: "Alpha",
      teamName: "Alpha Team",
      matchupId: 1,
      opponentRosterId: 2,
      opponentId: "b",
      points: 120,
      optimalPoints: 150,
      postseason: false,
      result: "win",
    },
  ];
  const records = buildRecordBook(
    [
      game,
      { ...game, week: 2, pointsA: 0, pointsB: 0, winnerId: null },
    ],
    teamFacts,
  );
  assert.equal(
    records.find((record) => record.id === "highest-team-score")?.value,
    120,
  );
  assert.equal(
    records.find((record) => record.id === "bench-gap")?.value,
    30,
  );
});

test("Gazette copy is deterministic for the same season and week", () => {
  const elo = buildElo(
    [game],
    new Map([
      ["a", teamA],
      ["b", teamB],
    ]),
  );
  const records = buildRecordBook([game], []);
  const first = buildWeeklyRecaps([game], [], elo.timeline, records);
  const second = buildWeeklyRecaps([game], [], elo.timeline, records);
  assert.deepEqual(first, second);
  assert.match(first[0].dek, /Alpha/);
});

test("draft grades exclude keeper picks and remain transparent", () => {
  const facts: WeeklyPlayerFact[] = [
    {
      season: "2025",
      week: 1,
      rosterId: 1,
      userId: "a",
      playerId: "p1",
      playerName: "Starter One",
      position: "QB",
      nflTeam: "AAA",
      points: 25,
      starter: true,
    },
    {
      season: "2025",
      week: 1,
      rosterId: 2,
      userId: "b",
      playerId: "p2",
      playerName: "Starter Two",
      position: "WR",
      nflTeam: "BBB",
      points: 10,
      starter: true,
    },
  ];
  const reports = buildDraftReports([season], facts);
  assert.equal(reports[0].picks.length, 2);
  assert.ok(reports[0].picks.every((pick) => pick.playerId !== "keeper"));
  assert.equal(reports[0].teams[0].grade, "A+");
});

test("trade analysis supports multiple sides and close-call verdicts", () => {
  const feed: TransactionFeed = {
    season: "2025",
    counts: { all: 1, trade: 1, waiver: 0, free_agent: 0 },
    transactions: [
      {
        id: "trade",
        type: "trade",
        week: 1,
        created: 1,
        waiverBid: null,
        teams: [
          {
            rosterId: 1,
            teamName: "Alpha Team",
            manager: "Alpha",
            adds: [{ id: "p2", name: "Starter Two", position: "WR", nflTeam: "BBB" }],
            drops: [{ id: "p1", name: "Starter One", position: "QB", nflTeam: "AAA" }],
          },
          {
            rosterId: 2,
            teamName: "Bravo Team",
            manager: "Bravo",
            adds: [{ id: "p1", name: "Starter One", position: "QB", nflTeam: "AAA" }],
            drops: [{ id: "p2", name: "Starter Two", position: "WR", nflTeam: "BBB" }],
          },
        ],
        draftPicks: [],
        faabTransfers: [],
      },
    ],
  };
  const facts: WeeklyPlayerFact[] = [
    {
      season: "2025",
      week: 1,
      rosterId: 1,
      userId: "a",
      playerId: "p2",
      playerName: "Starter Two",
      position: "WR",
      nflTeam: "BBB",
      points: 20,
      starter: true,
    },
    {
      season: "2025",
      week: 1,
      rosterId: 2,
      userId: "b",
      playerId: "p1",
      playerName: "Starter One",
      position: "QB",
      nflTeam: "AAA",
      points: 17,
      starter: true,
    },
  ];
  const report = buildTradeAnalyses([season], { "2025": feed }, facts)[0];
  assert.equal(report.sides.length, 2);
  assert.equal(report.verdict, "Too close to call");
});

test("keeper candidates apply draft, waiver, and trade clocks", () => {
  const facts: WeeklyPlayerFact[] = [
    {
      season: "2025",
      week: 18,
      rosterId: 1,
      userId: "a",
      playerId: "p1",
      playerName: "Starter One",
      position: "QB",
      nflTeam: "AAA",
      points: 20,
      starter: true,
    },
  ];
  const candidates = buildKeeperCandidates([season], facts, {});
  assert.equal(candidates[0].costRound, 1);
  assert.equal(candidates[0].yearsRemaining, 2);
});

test("keeper candidates use final rosters and apply offseason trades", () => {
  const currentSeason: Season = {
    ...season,
    year: "2026",
    status: "pre_draft",
    champion: null,
    runnerUp: null,
    thirdPlace: null,
    draft: {
      id: "draft-2026",
      status: "pre_draft",
      type: "snake",
      rounds: 19,
      startTime: null,
      picks: [],
    },
  };
  const rosterFacts: WeeklyPlayerFact[] = [
    {
      season: "2025",
      week: 0,
      rosterId: 1,
      userId: "a",
      playerId: "p1",
      playerName: "Starter One",
      position: "QB",
      nflTeam: "AAA",
      points: 0,
      starter: false,
    },
    {
      season: "2025",
      week: 0,
      rosterId: 2,
      userId: "b",
      playerId: "p2",
      playerName: "Starter Two",
      position: "WR",
      nflTeam: "BBB",
      points: 0,
      starter: false,
    },
  ];
  const offseason: TransactionFeed = {
    season: "2026",
    counts: { all: 1, trade: 1, waiver: 0, free_agent: 0 },
    transactions: [
      {
        id: "offseason-trade",
        type: "trade",
        week: 0,
        created: 2,
        waiverBid: null,
        teams: [
          {
            rosterId: 1,
            teamName: "Alpha Team",
            manager: "Alpha",
            adds: [],
            drops: [
              {
                id: "p1",
                name: "Starter One",
                position: "QB",
                nflTeam: "AAA",
              },
            ],
          },
          {
            rosterId: 2,
            teamName: "Bravo Team",
            manager: "Bravo",
            adds: [
              {
                id: "p1",
                name: "Starter One",
                position: "QB",
                nflTeam: "AAA",
              },
            ],
            drops: [],
          },
        ],
        draftPicks: [],
        faabTransfers: [],
      },
    ],
  };
  const candidates = buildKeeperCandidates(
    [currentSeason, season],
    [],
    { "2026": offseason },
    rosterFacts,
    true,
  );
  const traded = candidates.find((candidate) => candidate.playerId === "p1");
  assert.equal(traded?.userId, "b");
  assert.equal(traded?.yearsRemaining, 3);
  assert.equal(traded?.acquisitionType, "trade");
  assert.equal(traded?.tradeTiming, "offseason");
});

test("keeper candidates give in-season trades two keeper years", () => {
  const inSeason: TransactionFeed = {
    season: "2025",
    counts: { all: 1, trade: 1, waiver: 0, free_agent: 0 },
    transactions: [
      {
        id: "in-season-trade",
        type: "trade",
        week: 8,
        created: 1,
        waiverBid: null,
        teams: [
          {
            rosterId: 1,
            teamName: "Alpha Team",
            manager: "Alpha",
            adds: [],
            drops: [],
          },
          {
            rosterId: 2,
            teamName: "Bravo Team",
            manager: "Bravo",
            adds: [
              {
                id: "p1",
                name: "Starter One",
                position: "QB",
                nflTeam: "AAA",
              },
            ],
            drops: [],
          },
        ],
        draftPicks: [],
        faabTransfers: [],
      },
    ],
  };
  const candidates = buildKeeperCandidates(
    [season],
    [],
    { "2025": inSeason },
  );
  const traded = candidates.find((candidate) => candidate.playerId === "p1");
  assert.equal(traded?.yearsRemaining, 2);
  assert.equal(traded?.tradeTiming, "in-season");
  assert.match(traded?.source ?? "", /In-season trade/);
});

test("keeper history keeps trade cost lineage but applies the correct timer", () => {
  const previous: KeeperRecord = {
    season: "2025",
    rosterId: 1,
    slot: 1,
    managerName: "Alpha",
    teamName: "Alpha Team",
    playerName: "Starter One",
    position: "QB",
    nflTeam: "AAA",
    costRound: 6,
    yearsRemaining: 1,
    acquisitionType: "draft",
    notes: "",
  };
  const baseCandidate = {
    userId: "a",
    rosterId: 1,
    playerId: "p1",
    playerName: "Starter One",
    position: "QB",
    nflTeam: "AAA",
    acquisitionType: "trade" as const,
    costRound: 1,
    yearsRemaining: 2,
    source: "",
  };
  const inSeason = projectKeeperCandidate(
    { ...baseCandidate, tradeTiming: "in-season" },
    [previous],
    "2025",
  );
  const offseason = projectKeeperCandidate(
    { ...baseCandidate, tradeTiming: "offseason" },
    [previous],
    "2025",
  );

  assert.equal(inSeason.costRound, 5);
  assert.equal(inSeason.yearsRemaining, 2);
  assert.equal(offseason.costRound, 5);
  assert.equal(offseason.yearsRemaining, 3);
});

test("two first-round keepers cannot coexist", () => {
  assert.equal(hasFirstRoundKeeperConflict(1, 1), true);
  assert.equal(hasFirstRoundKeeperConflict(1, 2), false);
  assert.equal(hasFirstRoundKeeperConflict(2, 1), false);
  assert.equal(hasFirstRoundKeeperConflict(undefined, 1), false);
});
