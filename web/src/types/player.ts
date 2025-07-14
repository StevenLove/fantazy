export interface GameLog {
  Week: number | string;
  Matchup: string;
  Score: string;
  "Spread Result": string;
  "Prop Line": number | string;
  "": string;
  QBR?: number;
  "PASS YDS"?: number;
  "PASS TDS"?: number;
  "PASS CMPS"?: number;
  "PASS ATTS"?: number;
  INTS?: number;
  "RUSH TD"?: number;
  "Rush YDS"?: number;
  "Rush ATTS"?: number;
  "TDS SCORED"?: number;
  REC?: number;
  "REC YDS"?: number;
  "REC TD"?: number;
  "Y/R"?: number;
  TAR?: number;
  ATT?: number;
  [key: string]: any;
}

export interface SeasonAverages {
  "Prop Line"?: number;
  QBR?: number;
  "PASS YDS"?: number;
  "PASS TDS"?: number;
  "PASS CMPS"?: number;
  "PASS ATTS"?: number;
  INTS?: number;
  "RUSH TD"?: number;
  "Rush YDS"?: number;
  "Rush ATTS"?: number;
  "TDS SCORED"?: number;
  "REC YDS"?: number;
  REC?: number;
  "REC TD"?: number;
  "Y/R"?: number;
  TAR?: number;
  ATT?: number;
  [key: string]: any;
}

export interface Player {
  name: string;
  slug: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'PK';
  team: string;
  espn_headshot?: string;
  game_log: GameLog[];
  season_averages: SeasonAverages;
  total_games: number;
  scrape_timestamp: string;
  has_data?: boolean; // Optional flag to indicate if player has game log data
}

export interface LeagueData {
  league_name: string;
  scrape_date: string;
  season: string;
  players: Player[];
}