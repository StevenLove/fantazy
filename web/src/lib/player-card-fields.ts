import { PlayerCardField, FieldMetadata } from '@/types/custom-player-cards';

// Comprehensive list of all available fields from NFL data tables
export const PLAYER_CARD_FIELDS: PlayerCardField[] = [
  // === TIME/GAME INFO FIELDS ===
  {
    key: 'games_played',
    label: 'Games Played',
    description: 'Number of games played',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'basic',
    timeframe: 'cumulative',
    format: 'integer'
  },
  {
    key: 'week',
    label: 'Week',
    description: 'NFL week number',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'game_info',
    timeframe: 'weekly',
    format: 'integer'
  },
  {
    key: 'season',
    label: 'Season',
    description: 'NFL season year',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'game_info',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'opponent',
    label: 'Opponent',
    description: 'Opponent team',
    dataType: 'string',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'game_info',
    timeframe: 'weekly',
  },
  {
    key: 'team',
    label: 'Team',
    description: 'Player team',
    dataType: 'string',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'game_info',
    timeframe: 'both',
  },

  // === PASSING STATS ===
  {
    key: 'attempts',
    label: 'Pass Attempts',
    description: 'Pass attempts',
    dataType: 'number',
    positions: ['QB'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'completions',
    label: 'Completions',
    description: 'Pass completions',
    dataType: 'number',
    positions: ['QB'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'passing_yards',
    label: 'Passing Yards',
    description: 'Passing yards',
    dataType: 'number',
    positions: ['QB'],
    category: 'basic',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'passing_tds',
    label: 'Passing TDs',
    description: 'Passing touchdowns',
    dataType: 'number',
    positions: ['QB'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'interceptions',
    label: 'Interceptions',
    description: 'Interceptions thrown',
    dataType: 'number',
    positions: ['QB'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'sacks',
    label: 'Sacks',
    description: 'Times sacked',
    dataType: 'number',
    positions: ['QB'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'sack_yards',
    label: 'Sack Yards',
    description: 'Yards lost on sacks',
    dataType: 'number',
    positions: ['QB'],
    category: 'basic',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'completion_percentage',
    label: 'Completion %',
    description: 'Completion percentage',
    dataType: 'number',
    positions: ['QB'],
    category: 'basic',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'passer_rating',
    label: 'Passer Rating',
    description: 'NFL passer rating',
    dataType: 'number',
    positions: ['QB'],
    category: 'basic',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'passing_epa',
    label: 'Passing EPA',
    description: 'Expected points added from passing',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'passing_air_yards',
    label: 'Passing Air Yards',
    description: 'Air yards on passing attempts',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'passing_yards_after_catch',
    label: 'Passing YAC',
    description: 'Yards after catch on completions',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'passing_first_downs',
    label: 'Passing First Downs',
    description: 'First downs via passing',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'passing_2pt_conversions',
    label: 'Passing 2PT',
    description: 'Two-point conversions passing',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'sack_fumbles',
    label: 'Sack Fumbles',
    description: 'Fumbles on sacks',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'sack_fumbles_lost',
    label: 'Sack Fumbles Lost',
    description: 'Fumbles lost on sacks',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'integer'
  },

  // === NGS PASSING STATS ===
  {
    key: 'avg_time_to_throw',
    label: 'Avg Time to Throw',
    description: 'Average time from snap to throw',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'time'
  },
  {
    key: 'avg_completed_air_yards',
    label: 'Avg Completed Air Yards',
    description: 'Average air yards on completions',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'avg_intended_air_yards',
    label: 'Avg Intended Air Yards',
    description: 'Average air yards on all attempts',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'avg_air_yards_differential',
    label: 'Avg Air Yards Differential',
    description: 'Difference between intended and completed air yards',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'aggressiveness',
    label: 'Aggressiveness',
    description: 'Percentage of passes into tight windows',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'max_completed_air_distance',
    label: 'Max Completed Air Distance',
    description: 'Longest completed air yards',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'avg_air_yards_to_sticks',
    label: 'Avg Air Yards to Sticks',
    description: 'Average air yards relative to first down marker',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'completion_percentage_above_expectation',
    label: 'Completion % Above Expected',
    description: 'Completion % above expected based on difficulty',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'expected_completion_percentage',
    label: 'Expected Completion %',
    description: 'Expected completion percentage',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'avg_air_distance',
    label: 'Avg Air Distance',
    description: 'Average air distance on all attempts',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'max_air_distance',
    label: 'Max Air Distance',
    description: 'Maximum air distance attempted',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'pacr',
    label: 'PACR',
    description: 'Passing Air Conversion Ratio',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'dakota',
    label: 'DAKOTA',
    description: 'Dakota (advanced QB metric)',
    dataType: 'number',
    positions: ['QB'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },

  // === RUSHING STATS ===
  {
    key: 'carries',
    label: 'Carries',
    description: 'Rushing attempts',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'rushing_yards',
    label: 'Rushing Yards',
    description: 'Rushing yards',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'rushing_tds',
    label: 'Rushing TDs',
    description: 'Rushing touchdowns',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'avg_rush_yards',
    label: 'Avg Rush Yards',
    description: 'Average yards per carry',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'rushing_fumbles',
    label: 'Rushing Fumbles',
    description: 'Fumbles while rushing',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'rushing_fumbles_lost',
    label: 'Rushing Fumbles Lost',
    description: 'Fumbles lost while rushing',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'rushing_first_downs',
    label: 'Rushing First Downs',
    description: 'First downs via rushing',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'rushing_epa',
    label: 'Rushing EPA',
    description: 'Expected points added from rushing',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'rushing_2pt_conversions',
    label: 'Rushing 2PT',
    description: 'Two-point conversions rushing',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'integer'
  },

  // === NGS RUSHING STATS ===
  {
    key: 'efficiency',
    label: 'Rushing Efficiency',
    description: 'Rushing efficiency rating',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'percent_attempts_gte_eight_defenders',
    label: '% vs 8+ Defenders',
    description: 'Percentage of attempts against 8+ defenders',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'avg_time_to_los',
    label: 'Avg Time to LOS',
    description: 'Average time to line of scrimmage',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'time'
  },
  {
    key: 'expected_rush_yards',
    label: 'Expected Rush Yards',
    description: 'Expected rushing yards based on situation',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'rush_yards_over_expected',
    label: 'Rush Yards Over Expected',
    description: 'Actual yards minus expected',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'rush_yards_over_expected_per_att',
    label: 'RYOE Per Attempt',
    description: 'Rush yards over expected per attempt',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'rush_pct_over_expected',
    label: 'Rush % Over Expected',
    description: 'Percentage of attempts that exceeded expected',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'percentage'
  },

  // === RECEIVING STATS ===
  {
    key: 'receptions',
    label: 'Receptions',
    description: 'Receptions',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'targets',
    label: 'Targets',
    description: 'Targets',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'receiving_yards',
    label: 'Receiving Yards',
    description: 'Receiving yards',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'receiving_tds',
    label: 'Receiving TDs',
    description: 'Receiving touchdowns',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'catch_percentage',
    label: 'Catch %',
    description: 'Catch rate on targets',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'receiving_fumbles',
    label: 'Receiving Fumbles',
    description: 'Fumbles while receiving',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'receiving_fumbles_lost',
    label: 'Receiving Fumbles Lost',
    description: 'Fumbles lost while receiving',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'receiving_air_yards',
    label: 'Receiving Air Yards',
    description: 'Air yards on targets',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'receiving_yards_after_catch',
    label: 'Receiving YAC',
    description: 'Yards after catch on receptions',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'receiving_first_downs',
    label: 'Receiving First Downs',
    description: 'First downs via receiving',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'receiving_epa',
    label: 'Receiving EPA',
    description: 'Expected points added from receiving',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'receiving_2pt_conversions',
    label: 'Receiving 2PT',
    description: 'Two-point conversions receiving',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'integer'
  },

  // === NGS RECEIVING STATS ===
  {
    key: 'avg_cushion',
    label: 'Avg Cushion',
    description: 'Average cushion from nearest defender',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'avg_separation',
    label: 'Avg Separation',
    description: 'Average separation at time of catch',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'avg_intended_air_yards_rec',
    label: 'Avg Intended Air Yards',
    description: 'Average air yards on targets',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'percent_share_of_intended_air_yards',
    label: '% Share of Intended Air Yards',
    description: 'Share of team intended air yards',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'avg_yac',
    label: 'Avg YAC',
    description: 'Average yards after catch',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'avg_expected_yac',
    label: 'Avg Expected YAC',
    description: 'Expected YAC based on catch situation',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },
  {
    key: 'avg_yac_above_expectation',
    label: 'Avg YAC Above Expected',
    description: 'YAC above expected',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'yards'
  },

  // === ADVANCED ANALYTICS ===
  {
    key: 'target_share',
    label: 'Target Share',
    description: 'Percentage of team targets',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'efficiency',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'air_yards_share',
    label: 'Air Yards Share',
    description: 'Percentage of team air yards',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'efficiency',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'wopr_x',
    label: 'WOPR X',
    description: 'Weighted Opportunity Rating X component',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'wopr_y',
    label: 'WOPR Y',
    description: 'Weighted Opportunity Rating Y component',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'racr',
    label: 'RACR',
    description: 'Receiving Air Conversion Ratio',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'tgt_sh',
    label: 'Target Share',
    description: 'Team target share',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'efficiency',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'ay_sh',
    label: 'Air Yards Share',
    description: 'Team air yards share',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'efficiency',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'yac_sh',
    label: 'YAC Share',
    description: 'Team YAC share',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'efficiency',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'ry_sh',
    label: 'Rush Yards Share',
    description: 'Team rush yards share',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'efficiency',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'rtd_sh',
    label: 'Rush TD Share',
    description: 'Team rush TD share',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'efficiency',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'rfd_sh',
    label: 'Rush First Down Share',
    description: 'Team rush first down share',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'efficiency',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'rtdfd_sh',
    label: 'Rush TD/FD Share',
    description: 'Team rush TD and first down share',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'efficiency',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'dom',
    label: 'Dominator',
    description: 'Dominator rating',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'w8dom',
    label: 'W8 Dominator',
    description: 'Weighted 8-game dominator rating',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'yptmpa',
    label: 'YPTMPA',
    description: 'Yards per team pass attempt',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'advanced',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'ppr_sh',
    label: 'PPR Share',
    description: 'PPR fantasy points share',
    dataType: 'number',
    positions: ['RB', 'WR', 'TE'],
    category: 'fantasy',
    timeframe: 'both',
    format: 'percentage'
  },

  // === FANTASY STATS ===
  {
    key: 'fantasy_points',
    label: 'Fantasy Points',
    description: 'Standard fantasy points scored',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'fantasy',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'fantasy_points_ppr',
    label: 'Fantasy Points (PPR)',
    description: 'PPR fantasy points scored',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'fantasy',
    timeframe: 'both',
    format: 'decimal'
  },
  {
    key: 'special_teams_tds',
    label: 'Special Teams TDs',
    description: 'Special teams touchdowns',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'fantasy',
    timeframe: 'both',
    format: 'integer'
  },

  // === KICKING STATS ===
  {
    key: 'fg_made',
    label: 'FG Made',
    description: 'Field goals made',
    dataType: 'number',
    positions: ['K'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'fg_att',
    label: 'FG Attempts',
    description: 'Field goal attempts',
    dataType: 'number',
    positions: ['K'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'fg_pct',
    label: 'FG %',
    description: 'Field goal percentage',
    dataType: 'number',
    positions: ['K'],
    category: 'basic',
    timeframe: 'both',
    format: 'percentage'
  },
  {
    key: 'xp_made',
    label: 'XP Made',
    description: 'Extra points made',
    dataType: 'number',
    positions: ['K'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'xp_att',
    label: 'XP Attempts',
    description: 'Extra point attempts',
    dataType: 'number',
    positions: ['K'],
    category: 'basic',
    timeframe: 'both',
    format: 'integer'
  },
  {
    key: 'xp_pct',
    label: 'XP %',
    description: 'Extra point percentage',
    dataType: 'number',
    positions: ['K'],
    category: 'basic',
    timeframe: 'both',
    format: 'percentage'
  },

  // === GAME CONTEXT ===
  {
    key: 'gameday',
    label: 'Game Date',
    description: 'Date of the game',
    dataType: 'string',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'game_info',
    timeframe: 'weekly',
  },
  {
    key: 'home_away',
    label: 'Home/Away',
    description: 'Home or away game',
    dataType: 'string',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'game_info',
    timeframe: 'weekly',
  },
  {
    key: 'game_result',
    label: 'Game Result',
    description: 'Win/Loss result',
    dataType: 'string',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'game_info',
    timeframe: 'weekly',
  },
  {
    key: 'weather',
    label: 'Weather',
    description: 'Weather conditions',
    dataType: 'string',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'game_info',
    timeframe: 'weekly',
  },
  {
    key: 'temperature',
    label: 'Temperature',
    description: 'Game temperature',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'game_info',
    timeframe: 'weekly',
    format: 'integer'
  },
  {
    key: 'wind',
    label: 'Wind Speed',
    description: 'Wind speed (mph)',
    dataType: 'number',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'game_info',
    timeframe: 'weekly',
    format: 'integer'
  },
  {
    key: 'roof',
    label: 'Roof Type',
    description: 'Stadium roof type',
    dataType: 'string',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'game_info',
    timeframe: 'weekly',
  },
  {
    key: 'surface',
    label: 'Surface',
    description: 'Field surface type',
    dataType: 'string',
    positions: ['QB', 'RB', 'WR', 'TE', 'K'],
    category: 'game_info',
    timeframe: 'weekly',
  }
];

// Helper function to get fields for a specific position
export function getFieldsForPosition(position: string): PlayerCardField[] {
  return PLAYER_CARD_FIELDS.filter(field => field.positions.includes(position));
}

// Helper function to get fields for a specific timeframe
export function getFieldsForTimeframe(timeframe: 'weekly' | 'cumulative'): PlayerCardField[] {
  return PLAYER_CARD_FIELDS.filter(field => 
    field.timeframe === timeframe || field.timeframe === 'both'
  );
}

// Helper function to get fields for a specific category
export function getFieldsForCategory(category: string): PlayerCardField[] {
  return PLAYER_CARD_FIELDS.filter(field => field.category === category);
}

// Generate field metadata organized by position
export function generateFieldMetadata(): FieldMetadata {
  const metadata: FieldMetadata = {};
  const positions = ['QB', 'RB', 'WR', 'TE', 'K'];
  
  positions.forEach(position => {
    metadata[position] = getFieldsForPosition(position);
  });
  
  return metadata;
}