export type KeeperSeed = {
  season: string;
  rosterId: number;
  slot: number;
  managerName: string;
  teamName: string;
  playerName: string;
  position: string;
  nflTeam: string;
  costRound: number;
  yearsRemaining: number;
  acquisitionType: "draft" | "waiver" | "trade";
  notes: string;
};

type SeedRow = Omit<KeeperSeed, "slot" | "position" | "nflTeam" | "notes">;

const rawKeepers: SeedRow[] = [
  // 2024 — green on the sheet: Year 2, two eligible seasons left.
  { season: "2024", rosterId: 10, managerName: "Cam Morrison", teamName: "It's Always Sunny", playerName: "Christian McCaffrey", costRound: 1, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 10, managerName: "Cam Morrison", teamName: "It's Always Sunny", playerName: "Amon-Ra St. Brown", costRound: 2, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 5, managerName: "Jeff Crawford", teamName: "Mighty Fighting Crawfish", playerName: "Tyreek Hill", costRound: 1, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 5, managerName: "Jeff Crawford", teamName: "Mighty Fighting Crawfish", playerName: "Nico Collins", costRound: 10, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 7, managerName: "Matthew Redfield", teamName: "LambChops", playerName: "CeeDee Lamb", costRound: 1, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 7, managerName: "Matthew Redfield", teamName: "LambChops", playerName: "Trey McBride", costRound: 8, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 2, managerName: "Mason Zelinski", teamName: "Bed, Bath, and Bijan", playerName: "Bijan Robinson", costRound: 1, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 2, managerName: "Mason Zelinski", teamName: "Bed, Bath, and Bijan", playerName: "C.J. Stroud", costRound: 10, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 3, managerName: "Ben Fowler", teamName: "Arkansas Dangermen", playerName: "Jahmyr Gibbs", costRound: 3, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 3, managerName: "Ben Fowler", teamName: "Arkansas Dangermen", playerName: "Sam LaPorta", costRound: 10, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 1, managerName: "Grayson Crawford", teamName: "Turd Ferguson", playerName: "Breece Hall", costRound: 4, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 1, managerName: "Grayson Crawford", teamName: "Turd Ferguson", playerName: "Drake London", costRound: 6, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 4, managerName: "Kaiden Shuler", teamName: "Little Ladd", playerName: "DJ Moore", costRound: 5, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 4, managerName: "Kaiden Shuler", teamName: "Little Ladd", playerName: "Dalton Kincaid", costRound: 10, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 6, managerName: "Luke Lunsford", teamName: "Call me Purdy Baby", playerName: "Brock Purdy", costRound: 6, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 6, managerName: "Luke Lunsford", teamName: "Call me Purdy Baby", playerName: "Isiah Pacheco", costRound: 7, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 8, managerName: "Elliott Wessels", teamName: "The Home Deebo", playerName: "Puka Nacua", costRound: 8, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 8, managerName: "Elliott Wessels", teamName: "The Home Deebo", playerName: "De'Von Achane", costRound: 10, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 9, managerName: "Cray Cothran", teamName: "Dak Attack", playerName: "Cole Kmet", costRound: 9, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2024", rosterId: 9, managerName: "Cray Cothran", teamName: "Dak Attack", playerName: "Zay Flowers", costRound: 10, yearsRemaining: 2, acquisitionType: "draft" },

  // 2025 — green = Year 2/two left; red = Year 3/final year.
  { season: "2025", rosterId: 7, managerName: "Matt Redfield", teamName: "Here Comes McBride", playerName: "Saquon Barkley", costRound: 1, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 7, managerName: "Matt Redfield", teamName: "Here Comes McBride", playerName: "Trey McBride", costRound: 7, yearsRemaining: 1, acquisitionType: "draft" },
  { season: "2025", rosterId: 3, managerName: "Ben Fowler", teamName: "Arkansas Dangermen", playerName: "Josh Allen", costRound: 1, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 3, managerName: "Ben Fowler", teamName: "Arkansas Dangermen", playerName: "Brock Bowers", costRound: 8, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 1, managerName: "Grayson Crawford", teamName: "Treveyon My Wayward Son", playerName: "Ja'Marr Chase", costRound: 1, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 1, managerName: "Grayson Crawford", teamName: "Treveyon My Wayward Son", playerName: "Jayden Daniels", costRound: 4, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 2, managerName: "Mason Zelinski", teamName: "Nix-elodian", playerName: "Bijan Robinson", costRound: 1, yearsRemaining: 1, acquisitionType: "draft" },
  { season: "2025", rosterId: 2, managerName: "Mason Zelinski", teamName: "Nix-elodian", playerName: "Kyren Williams", costRound: 4, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 6, managerName: "Luke Lunsford", teamName: "Call me Purdy Baby", playerName: "Derrick Henry", costRound: 2, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 6, managerName: "Luke Lunsford", teamName: "Call me Purdy Baby", playerName: "George Kittle", costRound: 3, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 10, managerName: "Cam Morrison", teamName: "Nabers in Paris", playerName: "Malik Nabers", costRound: 4, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 10, managerName: "Cam Morrison", teamName: "Nabers in Paris", playerName: "George Pickens", costRound: 7, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 9, managerName: "Cray Cothran", teamName: "Dak Attack", playerName: "Drake London", costRound: 5, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 9, managerName: "Cray Cothran", teamName: "Dak Attack", playerName: "Brian Thomas Jr.", costRound: 10, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 8, managerName: "Elliott Wessels", teamName: "I Chase Brown kids", playerName: "Puka Nacua", costRound: 7, yearsRemaining: 1, acquisitionType: "draft" },
  { season: "2025", rosterId: 8, managerName: "Elliott Wessels", teamName: "I Chase Brown kids", playerName: "De'Von Achane", costRound: 9, yearsRemaining: 1, acquisitionType: "draft" },
  { season: "2025", rosterId: 4, managerName: "Kaiden Shuler", teamName: "A B CeeDee", playerName: "Bucky Irving", costRound: 8, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 4, managerName: "Kaiden Shuler", teamName: "A B CeeDee", playerName: "Chase Brown", costRound: 10, yearsRemaining: 2, acquisitionType: "draft" },
  { season: "2025", rosterId: 5, managerName: "Jeff Crawford", teamName: "Mighty Fighting Crawfish", playerName: "Nico Collins", costRound: 9, yearsRemaining: 1, acquisitionType: "draft" },
  { season: "2025", rosterId: 5, managerName: "Jeff Crawford", teamName: "Mighty Fighting Crawfish", playerName: "Jerry Jeudy", costRound: 10, yearsRemaining: 2, acquisitionType: "draft" },
];

const slotCount = new Map<string, number>();

export const HISTORICAL_KEEPERS: KeeperSeed[] = rawKeepers.map((keeper) => {
  const key = `${keeper.season}-${keeper.rosterId}`;
  const slot = (slotCount.get(key) ?? 0) + 1;
  slotCount.set(key, slot);
  return {
    ...keeper,
    slot,
    position: "",
    nflTeam: "",
    notes: "Imported from the color-coded Game of Inches Google Sheet.",
  };
});
