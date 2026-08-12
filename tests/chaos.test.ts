import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDraftReports,
  buildElo,
  buildFranchises,
  buildFranchiseRosterHistory,
  buildKeeperCandidates,
  buildRecordBook,
  buildSuperlatives,
  optimalLineupPoints,
  type WeeklyPlayerFact,
  type WeeklyTeamFact,
} from "../app/lib/chaos.ts";
import {
  hasFirstRoundKeeperConflict,
  projectKeeperCandidate,
} from "../app/lib/keeper-rules.ts";
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

test("roster history compares Week 1 with the exact final roster", () => {
  const fact = (
    playerId: string,
    playerName: string,
    week: number,
    position: string,
  ): WeeklyPlayerFact => ({
    season: "2025",
    week,
    rosterId: 1,
    userId: "a",
    playerId,
    playerName,
    position,
    nflTeam: "AAA",
    points: 0,
    starter: false,
  });
  const weeklyFacts = [
    fact("qb", "Opening Quarterback", 1, "QB"),
    fact("gone", "Departed Receiver", 1, "WR"),
    fact("qb", "Opening Quarterback", 17, "QB"),
  ];
  const finalRoster = [
    fact("qb", "Opening Quarterback", 0, "QB"),
    fact("new", "Late Running Back", 0, "RB"),
  ];

  const history = buildFranchiseRosterHistory(
    [season],
    weeklyFacts,
    finalRoster,
    "a",
  );

  assert.equal(history.length, 1);
  assert.equal(history[0].season, "2025");
  assert.equal(history[0].finalWeek, 17);
  assert.deepEqual(
    history[0].weekOne.map((player) => player.playerId),
    ["qb", "gone"],
  );
  assert.deepEqual(
    history[0].finalRoster.map((player) => player.playerId),
    ["qb", "new"],
  );
});

test("roster history falls back to the final recorded matchup roster", () => {
  const facts: WeeklyPlayerFact[] = [
    {
      season: "2025",
      week: 1,
      rosterId: 1,
      userId: "a",
      playerId: "opening",
      playerName: "Opening Player",
      position: "WR",
      nflTeam: "AAA",
      points: 10,
      starter: true,
    },
    {
      season: "2025",
      week: 16,
      rosterId: 1,
      userId: "a",
      playerId: "closing",
      playerName: "Closing Player",
      position: "RB",
      nflTeam: "BBB",
      points: 12,
      starter: true,
    },
  ];

  const history = buildFranchiseRosterHistory([season], facts, [], "a");

  assert.equal(history[0].finalWeek, 16);
  assert.deepEqual(
    history[0].finalRoster.map((player) => player.playerId),
    ["closing"],
  );
});

test("replacement managers do not inherit retired managers' transactions", () => {
  const cam: Team = {
    ...teamA,
    rosterId: 10,
    userId: "cam",
    manager: "camaustin",
    username: "camaustin",
    teamName: "Nabers in Paris",
  };
  const brina: Team = {
    ...teamA,
    rosterId: 10,
    userId: "brina",
    manager: "brinacraw",
    username: "brinacraw",
    teamName: "brinacraw's Team",
  };
  const retiredSeason: Season = {
    ...season,
    teams: [cam],
    champion: cam,
    runnerUp: null,
  };
  const currentSeason: Season = {
    ...season,
    year: "2026",
    status: "pre_draft",
    teams: [brina],
    champion: null,
    runnerUp: null,
    draft: null,
  };
  const camTransactions: TransactionFeed = {
    season: "2025",
    counts: { all: 1, trade: 1, waiver: 0, free_agent: 0 },
    transactions: [
      {
        id: "cam-trade",
        type: "trade",
        week: 8,
        created: 1,
        waiverBid: null,
        teams: [
          {
            rosterId: 10,
            teamName: cam.teamName,
            manager: cam.manager,
            adds: [],
            drops: [],
          },
        ],
        draftPicks: [],
        faabTransfers: [],
      },
    ],
  };

  const profiles = buildFranchises(
    [currentSeason, retiredSeason],
    [],
    [],
    { standings: [], timeline: [] },
    { "2025": camTransactions },
    [],
    [],
  );
  const camProfile = profiles.find((profile) => profile.userId === "cam");
  const brinaProfile = profiles.find((profile) => profile.userId === "brina");

  assert.equal(camProfile?.active, false);
  assert.equal(camProfile?.lastSeason, "2025");
  assert.equal(camProfile?.tradeCount, 1);
  assert.equal(brinaProfile?.active, true);
  assert.equal(brinaProfile?.tradeCount, 0);
  assert.equal(brinaProfile?.waiverCount, 0);
  assert.equal(brinaProfile?.faabSpent, 0);

  const inheritedKeepers = buildKeeperCandidates(
    [currentSeason, retiredSeason],
    [],
    {},
    [
      {
        season: "2025",
        week: 0,
        rosterId: 10,
        userId: "cam",
        playerId: "inherited-player",
        playerName: "Inherited Player",
        position: "WR",
        nflTeam: "AAA",
        points: 0,
        starter: false,
      },
    ],
    true,
  );
  assert.equal(inheritedKeepers[0]?.userId, "brina");
  assert.equal(inheritedKeepers[0]?.rosterId, 10);
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

test("Scoreboard Bully counts tied weekly highs and excludes zero weeks", () => {
  const weeklyFact = (
    userId: string,
    week: number,
    points: number,
    postseason = false,
  ): WeeklyTeamFact => {
    const team = userId === "a" ? teamA : teamB;
    const opponent = userId === "a" ? teamB : teamA;
    return {
      season: "2025",
      week,
      rosterId: team.rosterId,
      userId,
      manager: team.manager,
      teamName: team.teamName,
      matchupId: week,
      opponentRosterId: opponent.rosterId,
      opponentId: opponent.userId,
      points,
      optimalPoints: points,
      postseason,
      result: "win",
    };
  };
  const teamFacts = [
    weeklyFact("a", 1, 140),
    weeklyFact("b", 1, 100),
    weeklyFact("a", 2, 130),
    weeklyFact("b", 2, 130),
    weeklyFact("a", 3, 0),
    weeklyFact("b", 3, 0),
    weeklyFact("a", 4, 100, true),
    weeklyFact("b", 4, 140, true),
  ];
  const teams = new Map([
    ["a", teamA],
    ["b", teamB],
  ]);
  const tiedAward = buildSuperlatives(
    [],
    teamFacts,
    [],
    {},
    [],
    teams,
  ).find((award) => award.id === "scoreboard-bully");

  assert.equal(tiedAward?.manager, "Alpha");
  assert.equal(tiedAward?.value, "2 weekly highs");

  const pointsTiebreakAward = buildSuperlatives(
    [],
    teamFacts.map((fact) =>
      fact.userId === "a" && fact.week === 4
        ? { ...fact, points: 90, optimalPoints: 90 }
        : fact,
    ),
    [],
    {},
    [],
    teams,
  ).find((award) => award.id === "scoreboard-bully");

  assert.equal(pointsTiebreakAward?.manager, "Bravo");
});

test("Nail-Biter King counts wins by five points or fewer", () => {
  const closeGames: RivalryGame[] = [
    { ...game, week: 1, pointsA: 114, pointsB: 110, winnerId: "a" },
    { ...game, week: 2, pointsA: 107, pointsB: 110, winnerId: "b" },
    {
      ...game,
      week: 3,
      postseason: true,
      pointsA: 112,
      pointsB: 110,
      winnerId: "a",
    },
    { ...game, week: 4, pointsA: 116, pointsB: 110, winnerId: "a" },
    { ...game, week: 5, pointsA: 0, pointsB: 0, winnerId: null },
  ];
  const teams = new Map([
    ["a", teamA],
    ["b", teamB],
  ]);
  const award = buildSuperlatives(
    closeGames,
    [],
    [],
    {},
    [],
    teams,
  ).find((item) => item.id === "nail-biter-king");

  assert.equal(award?.manager, "Alpha");
  assert.equal(award?.value, "2 close wins");

  const tiebreakAward = buildSuperlatives(
    closeGames.slice(0, 2),
    [],
    [],
    {},
    [],
    teams,
  ).find((item) => item.id === "nail-biter-king");

  assert.equal(tiebreakAward?.manager, "Bravo");
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
  const expired = projectKeeperCandidate(
    {
      ...baseCandidate,
      acquisitionType: "draft",
      tradeTiming: null,
    },
    [previous],
    "2025",
  );

  assert.equal(inSeason.costRound, 5);
  assert.equal(inSeason.yearsRemaining, 2);
  assert.equal(offseason.costRound, 5);
  assert.equal(offseason.yearsRemaining, 3);
  assert.equal(expired.yearsRemaining, 0);
  assert.match(expired.source, /3 years previously/);
  assert.doesNotMatch(expired.source, /1 year previously/);
});

test("two first-round keepers cannot coexist", () => {
  assert.equal(hasFirstRoundKeeperConflict(1, 1), true);
  assert.equal(hasFirstRoundKeeperConflict(1, 2), false);
  assert.equal(hasFirstRoundKeeperConflict(2, 1), false);
  assert.equal(hasFirstRoundKeeperConflict(undefined, 1), false);
});
