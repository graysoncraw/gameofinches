export type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  status: string;
  previous_league_id: string | null;
  total_rosters: number;
  avatar: string | null;
  settings: Record<string, number>;
  scoring_settings: Record<string, number>;
  roster_positions: string[];
};

export type SleeperNFLState = {
  season: string;
  season_type: string;
  week: number;
  leg: number;
  display_week?: number;
};

export type SleeperUser = {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar: string | null;
  is_owner?: boolean;
  metadata?: { team_name?: string };
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  players: string[] | null;
  settings: Record<string, number>;
};

export type SleeperDraft = {
  draft_id: string;
  status: string;
  type: string;
  season: string;
  start_time: number | null;
  settings: Record<string, number>;
};

export type SleeperPick = {
  pick_no: number;
  round: number;
  draft_slot: number;
  roster_id: number;
  player_id: string;
  is_keeper: boolean | number | null;
  metadata?: {
    first_name?: string;
    last_name?: string;
    position?: string;
    team?: string;
  };
};

export type BracketMatch = {
  r: number;
  m: number;
  p?: number;
  t1?: number | Record<string, number> | null;
  t2?: number | Record<string, number> | null;
  w?: number | null;
  l?: number | null;
};

export type SleeperMatchup = {
  roster_id: number;
  matchup_id: number | null;
  points: number | null;
  custom_points: number | null;
  starters: string[] | null;
  players: string[] | null;
  players_points?: Record<string, number>;
};

export type SleeperTransaction = {
  type: "trade" | "waiver" | "free_agent";
  transaction_id: string;
  status: string;
  leg: number;
  created: number;
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  settings: { waiver_bid?: number } | null;
  draft_picks: Array<{
    season: string;
    round: number;
    roster_id: number;
    previous_owner_id: number;
    owner_id: number;
  }>;
  waiver_budget: Array<{
    sender: number;
    receiver: number;
    amount: number;
  }>;
};

export type PlayerLabel = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
};
