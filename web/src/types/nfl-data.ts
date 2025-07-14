// Updated types for nfl_data_py backend

export interface Player {
  id: number;
  gsis_id: string;
  name: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K';
  team: string;
  jersey_number?: number;
  headshot_url?: string;
  height?: number;
  weight?: number;
  college?: string;
  years_exp?: number;
  entry_year?: number;
  espn_id?: string;
  sleeper_id?: string;
  yahoo_id?: string;
}

export interface Game {
  id: number;
  game_id: string;
  season: number;
  week: number;
  gameday: string;
  weekday: string;
  away_team: string;
  home_team: string;
  away_score?: number;
  home_score?: number;
  game_type: string;
}

export interface SeasonalStats {
  player_id: number;
  season: number;
  season_type: string;
  games: number;
  
  // Passing stats
  completions?: number;
  attempts?: number;
  passing_yards?: number;
  passing_tds?: number;
  interceptions?: number;
  
  // Rushing stats
  carries?: number;
  rushing_yards?: number;
  rushing_tds?: number;
  
  // Receiving stats
  receptions?: number;
  targets?: number;
  receiving_yards?: number;
  receiving_tds?: number;
  
  // Advanced metrics
  passing_epa?: number;
  rushing_epa?: number;
  receiving_epa?: number;
  target_share?: number;
  air_yards_share?: number;
  
  // Fantasy points
  fantasy_points?: number;
  fantasy_points_ppr?: number;
}

export interface WeeklyStats {
  player_id: number;
  season: number;
  season_type: string;
  week: number;
  opponent_team?: string;
  recent_team?: string;
  
  // Game info
  gameday?: string;
  away_team?: string;
  home_team?: string;
  away_score?: number;
  home_score?: number;
  
  // Basic stats
  completions?: number;
  attempts?: number;
  passing_yards?: number;
  passing_tds?: number;
  interceptions?: number;
  carries?: number;
  rushing_yards?: number;
  rushing_tds?: number;
  receptions?: number;
  targets?: number;
  receiving_yards?: number;
  receiving_tds?: number;
  
  // Advanced weekly metrics
  passing_epa?: number;
  rushing_epa?: number;
  receiving_epa?: number;
  target_share?: number;
  air_yards_share?: number;
  
  // Fantasy points
  fantasy_points?: number;
  fantasy_points_ppr?: number;
}

export interface NGSPassingStats {
  player_id: number;
  season: number;
  week: number;
  avg_time_to_throw?: number;
  avg_completed_air_yards?: number;
  avg_intended_air_yards?: number;
  completion_percentage_above_expectation?: number;
  aggressiveness?: number;
  max_completed_air_distance?: number;
  attempts?: number;
  pass_yards?: number;
  pass_touchdowns?: number;
  interceptions?: number;
  passer_rating?: number;
}

export interface NGSReceivingStats {
  player_id: number;
  season: number;
  week: number;
  avg_cushion?: number;
  avg_separation?: number;
  avg_intended_air_yards?: number;
  avg_yac_above_expectation?: number;
  receptions?: number;
  targets?: number;
  catch_percentage?: number;
  yards?: number;
  rec_touchdowns?: number;
}

export interface NGSRushingStats {
  player_id: number;
  season: number;
  week: number;
  efficiency?: number;
  percent_attempts_gte_eight_defenders?: number;
  avg_time_to_los?: number;
  rush_attempts?: number;
  rush_yards?: number;
  rush_touchdowns?: number;
  rush_yards_over_expected?: number;
  rush_yards_over_expected_per_att?: number;
}

export interface NGSStats {
  passing?: NGSPassingStats[];
  receiving?: NGSReceivingStats[];
  rushing?: NGSRushingStats[];
}

export interface GameStats {
  game: Game;
  weekly_stats?: WeeklyStats;
  ngs_stats: {
    passing?: NGSPassingStats;
    receiving?: NGSReceivingStats;
    rushing?: NGSRushingStats;
  };
}

export interface RangeStats {
  games_played: number;
  avg_passing_yards?: number;
  avg_rushing_yards?: number;
  avg_receiving_yards?: number;
  avg_passing_tds?: number;
  avg_rushing_tds?: number;
  avg_receiving_tds?: number;
  avg_receptions?: number;
  avg_targets?: number;
  avg_carries?: number;
  avg_attempts?: number;
  avg_fantasy_points?: number;
  avg_fantasy_points_ppr?: number;
  avg_passing_epa?: number;
  avg_rushing_epa?: number;
  avg_receiving_epa?: number;
  avg_target_share?: number;
  avg_air_yards_share?: number;
}

export interface PlayerProps {
  // This will be populated when 2025 betting props become available
  player_id: number;
  game_id: string;
  market: string; // 'passing_yards', 'rushing_yards', etc.
  line: number;
  over_odds: number;
  under_odds: number;
  created_at: string;
}

// Data selection types for new user flow
export type DataViewType = 'specific-game' | 'range';
export type RangeType = 'L3' | 'L5' | 'L10' | 'SEASON';
export type GameDataType = 'game-log' | 'matchup-info' | 'advanced-stats' | 'betting-lines';
export type RangeDataType = 'props-vs-actual' | 'projected-vs-actual' | 'advanced-trends' | 'counting-trends';

export interface DataSelection {
  viewType: DataViewType;
  selectedPlayers: Player[];
  
  // For specific game view
  selectedGame?: Game;
  gameDataTypes?: GameDataType[];
  
  // For range view  
  rangeType?: RangeType;
  rangeDataTypes?: RangeDataType[];
}