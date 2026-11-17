import type { LeagueChaos } from "./chaos";
import type { WeeklyOverview } from "./weekly-update";

export type Team = {
  rosterId: number;
  userId: string;
  manager: string;
  username: string | null;
  teamName: string;
  avatar: string | null;
  commissioner: boolean;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  potentialPoints: number;
  waiverBudgetUsed: number;
  waiverPosition: number;
  playerCount: number;
};

export type DraftPick = {
  pickNo: number;
  round: number;
  draftSlot: number;
  rosterId: number;
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string;
  teamName: string;
  manager: string;
  isKeeper: boolean;
};

export type PlayoffMatchup = {
  season: string;
  week: number;
  round: number;
  matchId: number;
  bracket: "championship" | "consolation";
  placement: number | null;
  stage: string;
  winner: {
    rosterId: number;
    userId: string;
    manager: string;
    teamName: string;
    points: number;
  };
  loser: {
    rosterId: number;
    userId: string;
    manager: string;
    teamName: string;
    points: number;
  };
};

export type Season = {
  leagueId: string;
  year: string;
  status: string;
  teams: Team[];
  champion: Team | null;
  runnerUp: Team | null;
  thirdPlace: Team | null;
  playoffs?: PlayoffMatchup[];
  draft: {
    id: string;
    status: string;
    type: string;
    rounds: number;
    startTime: number | null;
    picks: DraftPick[];
  } | null;
  settings: {
    maxKeepers: number;
    playoffTeams: number;
    playoffWeekStart: number;
    waiverBudget: number;
    tradeDeadline: number;
    rosterPositions: string[];
    receptionPoints: number;
  };
};

export type AllTimeManager = {
  userId: string;
  manager: string;
  currentTeamName: string;
  avatar: string | null;
  seasons: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  titles: number;
  titleYears: string[];
};

export type RivalryGame = {
  season: string;
  week: number;
  postseason: boolean;
  managerAId: string;
  managerBId: string;
  managerA: string;
  managerB: string;
  teamA: string;
  teamB: string;
  pointsA: number;
  pointsB: number;
  winnerId: string | null;
};

export type Rivalry = {
  id: string;
  managerA: { userId: string; manager: string; teamName: string };
  managerB: { userId: string; manager: string; teamName: string };
  winsA: number;
  winsB: number;
  ties: number;
  pointsA: number;
  pointsB: number;
  games: RivalryGame[];
};

export type PlayerPerformance = {
  playerId: string;
  playerName: string;
  position: string;
  points: number;
  season: string;
  week: number;
  postseason: boolean;
  ownerId: string;
  owner: string;
  teamName: string;
  opponent: string;
  opponentTeam: string;
};

export type FinancialManager = {
  userId: string;
  manager: string;
  teamName: string;
  buyIns: number;
  winnings: number;
  net: number;
};

export type FinancialSeason = {
  year: string;
  status: "settled" | "pending";
  buyIn: number;
  prizePool: number;
  first: number;
  second: number;
  third: number;
  winner: string | null;
  runnerUp: string | null;
  thirdPlace: string | null;
};

export type LeagueData = {
  leagueName: string;
  fetchedAt: string;
  nextSyncAt: string;
  seasons: Season[];
  allTime: AllTimeManager[];
  completedSeasonCount: number;
  distinctChampionCount: number;
  currentSeason: string;
  rivalries: Rivalry[];
  topPerformances: PlayerPerformance[];
  finances: {
    managers: FinancialManager[];
    seasons: FinancialSeason[];
  };
  chaos: LeagueChaos;
  weekly?: WeeklyOverview;
};

export type LeagueTransaction = {
  id: string;
  type: "trade" | "waiver" | "free_agent";
  source?: "sleeper" | "commissioner";
  commissionerEdited?: boolean;
  week: number;
  created: number;
  waiverBid: number | null;
  teams: Array<{
    rosterId: number;
    teamName: string;
    manager: string;
    adds: Array<{
      id: string;
      name: string;
      position: string;
      nflTeam: string;
    }>;
    drops: Array<{
      id: string;
      name: string;
      position: string;
      nflTeam: string;
    }>;
  }>;
  draftPicks: Array<{
    season: string;
    round: number;
    originalTeam?: string;
    from: string;
    to: string;
    originalRosterId: number;
    previousOwnerRosterId: number;
    ownerRosterId: number;
  }>;
  faabTransfers: Array<{
    amount: number;
    from: string;
    to: string;
    senderRosterId: number;
    receiverRosterId: number;
  }>;
};

export type TransactionFeed = {
  season: string;
  transactions: LeagueTransaction[];
  counts: {
    all: number;
    trade: number;
    waiver: number;
    free_agent: number;
  };
};
