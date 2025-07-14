-- Create table for player card field definitions
CREATE TABLE IF NOT EXISTS player_card_field_definitions (
    id SERIAL PRIMARY KEY,
    field_key VARCHAR(100) UNIQUE NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_description TEXT,
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('number', 'string', 'boolean')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('basic', 'advanced', 'fantasy', 'efficiency', 'game_info')),
    timeframe VARCHAR(50) NOT NULL CHECK (timeframe IN ('weekly', 'cumulative', 'both')),
    format_type VARCHAR(50) CHECK (format_type IN ('percentage', 'decimal', 'integer', 'yards', 'time')),
    position_qb BOOLEAN DEFAULT FALSE,
    position_rb BOOLEAN DEFAULT FALSE,
    position_wr BOOLEAN DEFAULT FALSE,
    position_te BOOLEAN DEFAULT FALSE,
    position_k BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_field_definitions_active ON player_card_field_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_field_definitions_category ON player_card_field_definitions(category);
CREATE INDEX IF NOT EXISTS idx_field_definitions_timeframe ON player_card_field_definitions(timeframe);
CREATE INDEX IF NOT EXISTS idx_field_definitions_position_qb ON player_card_field_definitions(position_qb);
CREATE INDEX IF NOT EXISTS idx_field_definitions_position_rb ON player_card_field_definitions(position_rb);
CREATE INDEX IF NOT EXISTS idx_field_definitions_position_wr ON player_card_field_definitions(position_wr);
CREATE INDEX IF NOT EXISTS idx_field_definitions_position_te ON player_card_field_definitions(position_te);
CREATE INDEX IF NOT EXISTS idx_field_definitions_position_k ON player_card_field_definitions(position_k);
CREATE INDEX IF NOT EXISTS idx_field_definitions_sort_order ON player_card_field_definitions(sort_order);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_field_definitions_updated_at 
    BEFORE UPDATE ON player_card_field_definitions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert comprehensive field definitions
INSERT INTO player_card_field_definitions (
    field_key, field_label, field_description, data_type, category, timeframe, format_type,
    position_qb, position_rb, position_wr, position_te, position_k, sort_order
) VALUES

-- === TIME/GAME INFO FIELDS ===
('games_played', 'Games Played', 'Number of games played', 'number', 'basic', 'cumulative', 'integer', TRUE, TRUE, TRUE, TRUE, TRUE, 10),
('week', 'Week', 'NFL week number', 'number', 'game_info', 'weekly', 'integer', TRUE, TRUE, TRUE, TRUE, TRUE, 20),
('season', 'Season', 'NFL season year', 'number', 'game_info', 'both', 'integer', TRUE, TRUE, TRUE, TRUE, TRUE, 30),
('opponent', 'Opponent', 'Opponent team', 'string', 'game_info', 'weekly', NULL, TRUE, TRUE, TRUE, TRUE, TRUE, 40),
('team', 'Team', 'Player team', 'string', 'game_info', 'both', NULL, TRUE, TRUE, TRUE, TRUE, TRUE, 50),

-- === PASSING STATS ===
('attempts', 'Pass Attempts', 'Pass attempts', 'number', 'basic', 'both', 'integer', TRUE, FALSE, FALSE, FALSE, FALSE, 100),
('completions', 'Completions', 'Pass completions', 'number', 'basic', 'both', 'integer', TRUE, FALSE, FALSE, FALSE, FALSE, 110),
('passing_yards', 'Passing Yards', 'Passing yards', 'number', 'basic', 'both', 'yards', TRUE, FALSE, FALSE, FALSE, FALSE, 120),
('passing_tds', 'Passing TDs', 'Passing touchdowns', 'number', 'basic', 'both', 'integer', TRUE, FALSE, FALSE, FALSE, FALSE, 130),
('interceptions', 'Interceptions', 'Interceptions thrown', 'number', 'basic', 'both', 'integer', TRUE, FALSE, FALSE, FALSE, FALSE, 140),
('sacks', 'Sacks', 'Times sacked', 'number', 'basic', 'both', 'integer', TRUE, FALSE, FALSE, FALSE, FALSE, 150),
('sack_yards', 'Sack Yards', 'Yards lost on sacks', 'number', 'basic', 'both', 'yards', TRUE, FALSE, FALSE, FALSE, FALSE, 160),
('completion_percentage', 'Completion %', 'Completion percentage', 'number', 'basic', 'both', 'percentage', TRUE, FALSE, FALSE, FALSE, FALSE, 170),
('passer_rating', 'Passer Rating', 'NFL passer rating', 'number', 'basic', 'both', 'decimal', TRUE, FALSE, FALSE, FALSE, FALSE, 180),
('passing_epa', 'Passing EPA', 'Expected points added from passing', 'number', 'advanced', 'both', 'decimal', TRUE, FALSE, FALSE, FALSE, FALSE, 190),
('passing_air_yards', 'Passing Air Yards', 'Air yards on passing attempts', 'number', 'advanced', 'both', 'yards', TRUE, FALSE, FALSE, FALSE, FALSE, 200),
('passing_yards_after_catch', 'Passing YAC', 'Yards after catch on completions', 'number', 'advanced', 'both', 'yards', TRUE, FALSE, FALSE, FALSE, FALSE, 210),
('passing_first_downs', 'Passing First Downs', 'First downs via passing', 'number', 'advanced', 'both', 'integer', TRUE, FALSE, FALSE, FALSE, FALSE, 220),
('passing_2pt_conversions', 'Passing 2PT', 'Two-point conversions passing', 'number', 'advanced', 'both', 'integer', TRUE, FALSE, FALSE, FALSE, FALSE, 230),
('sack_fumbles', 'Sack Fumbles', 'Fumbles on sacks', 'number', 'advanced', 'both', 'integer', TRUE, FALSE, FALSE, FALSE, FALSE, 240),
('sack_fumbles_lost', 'Sack Fumbles Lost', 'Fumbles lost on sacks', 'number', 'advanced', 'both', 'integer', TRUE, FALSE, FALSE, FALSE, FALSE, 250),

-- === NGS PASSING STATS ===
('avg_time_to_throw', 'Avg Time to Throw', 'Average time from snap to throw', 'number', 'advanced', 'both', 'time', TRUE, FALSE, FALSE, FALSE, FALSE, 300),
('avg_completed_air_yards', 'Avg Completed Air Yards', 'Average air yards on completions', 'number', 'advanced', 'both', 'yards', TRUE, FALSE, FALSE, FALSE, FALSE, 310),
('avg_intended_air_yards', 'Avg Intended Air Yards', 'Average air yards on all attempts', 'number', 'advanced', 'both', 'yards', TRUE, FALSE, FALSE, FALSE, FALSE, 320),
('avg_air_yards_differential', 'Avg Air Yards Differential', 'Difference between intended and completed air yards', 'number', 'advanced', 'both', 'yards', TRUE, FALSE, FALSE, FALSE, FALSE, 330),
('aggressiveness', 'Aggressiveness', 'Percentage of passes into tight windows', 'number', 'advanced', 'both', 'percentage', TRUE, FALSE, FALSE, FALSE, FALSE, 340),
('max_completed_air_distance', 'Max Completed Air Distance', 'Longest completed air yards', 'number', 'advanced', 'both', 'yards', TRUE, FALSE, FALSE, FALSE, FALSE, 350),
('avg_air_yards_to_sticks', 'Avg Air Yards to Sticks', 'Average air yards relative to first down marker', 'number', 'advanced', 'both', 'yards', TRUE, FALSE, FALSE, FALSE, FALSE, 360),
('completion_percentage_above_expectation', 'Completion % Above Expected', 'Completion % above expected based on difficulty', 'number', 'advanced', 'both', 'percentage', TRUE, FALSE, FALSE, FALSE, FALSE, 370),
('expected_completion_percentage', 'Expected Completion %', 'Expected completion percentage', 'number', 'advanced', 'both', 'percentage', TRUE, FALSE, FALSE, FALSE, FALSE, 380),
('avg_air_distance', 'Avg Air Distance', 'Average air distance on all attempts', 'number', 'advanced', 'both', 'yards', TRUE, FALSE, FALSE, FALSE, FALSE, 390),
('max_air_distance', 'Max Air Distance', 'Maximum air distance attempted', 'number', 'advanced', 'both', 'yards', TRUE, FALSE, FALSE, FALSE, FALSE, 400),
('pacr', 'PACR', 'Passing Air Conversion Ratio', 'number', 'advanced', 'both', 'decimal', TRUE, FALSE, FALSE, FALSE, FALSE, 410),
('dakota', 'DAKOTA', 'Dakota (advanced QB metric)', 'number', 'advanced', 'both', 'decimal', TRUE, FALSE, FALSE, FALSE, FALSE, 420),

-- === RUSHING STATS ===
('carries', 'Carries', 'Rushing attempts', 'number', 'basic', 'both', 'integer', TRUE, TRUE, TRUE, TRUE, FALSE, 500),
('rushing_yards', 'Rushing Yards', 'Rushing yards', 'number', 'basic', 'both', 'yards', TRUE, TRUE, TRUE, TRUE, FALSE, 510),
('rushing_tds', 'Rushing TDs', 'Rushing touchdowns', 'number', 'basic', 'both', 'integer', TRUE, TRUE, TRUE, TRUE, FALSE, 520),
('avg_rush_yards', 'Avg Rush Yards', 'Average yards per carry', 'number', 'basic', 'both', 'decimal', TRUE, TRUE, TRUE, TRUE, FALSE, 530),
('rushing_fumbles', 'Rushing Fumbles', 'Fumbles while rushing', 'number', 'basic', 'both', 'integer', TRUE, TRUE, TRUE, TRUE, FALSE, 540),
('rushing_fumbles_lost', 'Rushing Fumbles Lost', 'Fumbles lost while rushing', 'number', 'basic', 'both', 'integer', TRUE, TRUE, TRUE, TRUE, FALSE, 550),
('rushing_first_downs', 'Rushing First Downs', 'First downs via rushing', 'number', 'advanced', 'both', 'integer', TRUE, TRUE, TRUE, TRUE, FALSE, 560),
('rushing_epa', 'Rushing EPA', 'Expected points added from rushing', 'number', 'advanced', 'both', 'decimal', TRUE, TRUE, TRUE, TRUE, FALSE, 570),
('rushing_2pt_conversions', 'Rushing 2PT', 'Two-point conversions rushing', 'number', 'advanced', 'both', 'integer', TRUE, TRUE, TRUE, TRUE, FALSE, 580),

-- === NGS RUSHING STATS ===
('efficiency', 'Rushing Efficiency', 'Rushing efficiency rating', 'number', 'advanced', 'both', 'decimal', TRUE, TRUE, TRUE, TRUE, FALSE, 600),
('percent_attempts_gte_eight_defenders', '% vs 8+ Defenders', 'Percentage of attempts against 8+ defenders', 'number', 'advanced', 'both', 'percentage', TRUE, TRUE, TRUE, TRUE, FALSE, 610),
('avg_time_to_los', 'Avg Time to LOS', 'Average time to line of scrimmage', 'number', 'advanced', 'both', 'time', TRUE, TRUE, TRUE, TRUE, FALSE, 620),
('expected_rush_yards', 'Expected Rush Yards', 'Expected rushing yards based on situation', 'number', 'advanced', 'both', 'yards', TRUE, TRUE, TRUE, TRUE, FALSE, 630),
('rush_yards_over_expected', 'Rush Yards Over Expected', 'Actual yards minus expected', 'number', 'advanced', 'both', 'yards', TRUE, TRUE, TRUE, TRUE, FALSE, 640),
('rush_yards_over_expected_per_att', 'RYOE Per Attempt', 'Rush yards over expected per attempt', 'number', 'advanced', 'both', 'decimal', TRUE, TRUE, TRUE, TRUE, FALSE, 650),
('rush_pct_over_expected', 'Rush % Over Expected', 'Percentage of attempts that exceeded expected', 'number', 'advanced', 'both', 'percentage', TRUE, TRUE, TRUE, TRUE, FALSE, 660),

-- === RECEIVING STATS ===
('receptions', 'Receptions', 'Receptions', 'number', 'basic', 'both', 'integer', FALSE, TRUE, TRUE, TRUE, FALSE, 700),
('targets', 'Targets', 'Targets', 'number', 'basic', 'both', 'integer', FALSE, TRUE, TRUE, TRUE, FALSE, 710),
('receiving_yards', 'Receiving Yards', 'Receiving yards', 'number', 'basic', 'both', 'yards', FALSE, TRUE, TRUE, TRUE, FALSE, 720),
('receiving_tds', 'Receiving TDs', 'Receiving touchdowns', 'number', 'basic', 'both', 'integer', FALSE, TRUE, TRUE, TRUE, FALSE, 730),
('catch_percentage', 'Catch %', 'Catch rate on targets', 'number', 'basic', 'both', 'percentage', FALSE, TRUE, TRUE, TRUE, FALSE, 740),
('receiving_fumbles', 'Receiving Fumbles', 'Fumbles while receiving', 'number', 'basic', 'both', 'integer', FALSE, TRUE, TRUE, TRUE, FALSE, 750),
('receiving_fumbles_lost', 'Receiving Fumbles Lost', 'Fumbles lost while receiving', 'number', 'basic', 'both', 'integer', FALSE, TRUE, TRUE, TRUE, FALSE, 760),
('receiving_air_yards', 'Receiving Air Yards', 'Air yards on targets', 'number', 'advanced', 'both', 'yards', FALSE, TRUE, TRUE, TRUE, FALSE, 770),
('receiving_yards_after_catch', 'Receiving YAC', 'Yards after catch on receptions', 'number', 'advanced', 'both', 'yards', FALSE, TRUE, TRUE, TRUE, FALSE, 780),
('receiving_first_downs', 'Receiving First Downs', 'First downs via receiving', 'number', 'advanced', 'both', 'integer', FALSE, TRUE, TRUE, TRUE, FALSE, 790),
('receiving_epa', 'Receiving EPA', 'Expected points added from receiving', 'number', 'advanced', 'both', 'decimal', FALSE, TRUE, TRUE, TRUE, FALSE, 800),
('receiving_2pt_conversions', 'Receiving 2PT', 'Two-point conversions receiving', 'number', 'advanced', 'both', 'integer', FALSE, TRUE, TRUE, TRUE, FALSE, 810),

-- === NGS RECEIVING STATS ===
('avg_cushion', 'Avg Cushion', 'Average cushion from nearest defender', 'number', 'advanced', 'both', 'yards', FALSE, TRUE, TRUE, TRUE, FALSE, 900),
('avg_separation', 'Avg Separation', 'Average separation at time of catch', 'number', 'advanced', 'both', 'yards', FALSE, TRUE, TRUE, TRUE, FALSE, 910),
('avg_intended_air_yards_rec', 'Avg Intended Air Yards', 'Average air yards on targets', 'number', 'advanced', 'both', 'yards', FALSE, TRUE, TRUE, TRUE, FALSE, 920),
('percent_share_of_intended_air_yards', '% Share of Intended Air Yards', 'Share of team intended air yards', 'number', 'advanced', 'both', 'percentage', FALSE, TRUE, TRUE, TRUE, FALSE, 930),
('avg_yac', 'Avg YAC', 'Average yards after catch', 'number', 'advanced', 'both', 'yards', FALSE, TRUE, TRUE, TRUE, FALSE, 940),
('avg_expected_yac', 'Avg Expected YAC', 'Expected YAC based on catch situation', 'number', 'advanced', 'both', 'yards', FALSE, TRUE, TRUE, TRUE, FALSE, 950),
('avg_yac_above_expectation', 'Avg YAC Above Expected', 'YAC above expected', 'number', 'advanced', 'both', 'yards', FALSE, TRUE, TRUE, TRUE, FALSE, 960),

-- === ADVANCED ANALYTICS ===
('target_share', 'Target Share', 'Percentage of team targets', 'number', 'efficiency', 'both', 'percentage', FALSE, TRUE, TRUE, TRUE, FALSE, 1000),
('air_yards_share', 'Air Yards Share', 'Percentage of team air yards', 'number', 'efficiency', 'both', 'percentage', FALSE, TRUE, TRUE, TRUE, FALSE, 1010),
('wopr_x', 'WOPR X', 'Weighted Opportunity Rating X component', 'number', 'advanced', 'both', 'decimal', FALSE, TRUE, TRUE, TRUE, FALSE, 1020),
('wopr_y', 'WOPR Y', 'Weighted Opportunity Rating Y component', 'number', 'advanced', 'both', 'decimal', FALSE, TRUE, TRUE, TRUE, FALSE, 1030),
('racr', 'RACR', 'Receiving Air Conversion Ratio', 'number', 'advanced', 'both', 'decimal', FALSE, TRUE, TRUE, TRUE, FALSE, 1040),
('tgt_sh', 'Target Share', 'Team target share', 'number', 'efficiency', 'both', 'percentage', FALSE, TRUE, TRUE, TRUE, FALSE, 1050),
('ay_sh', 'Air Yards Share', 'Team air yards share', 'number', 'efficiency', 'both', 'percentage', FALSE, TRUE, TRUE, TRUE, FALSE, 1060),
('yac_sh', 'YAC Share', 'Team YAC share', 'number', 'efficiency', 'both', 'percentage', FALSE, TRUE, TRUE, TRUE, FALSE, 1070),
('ry_sh', 'Rush Yards Share', 'Team rush yards share', 'number', 'efficiency', 'both', 'percentage', FALSE, TRUE, TRUE, TRUE, FALSE, 1080),
('rtd_sh', 'Rush TD Share', 'Team rush TD share', 'number', 'efficiency', 'both', 'percentage', FALSE, TRUE, TRUE, TRUE, FALSE, 1090),
('rfd_sh', 'Rush First Down Share', 'Team rush first down share', 'number', 'efficiency', 'both', 'percentage', FALSE, TRUE, TRUE, TRUE, FALSE, 1100),
('rtdfd_sh', 'Rush TD/FD Share', 'Team rush TD and first down share', 'number', 'efficiency', 'both', 'percentage', FALSE, TRUE, TRUE, TRUE, FALSE, 1110),
('dom', 'Dominator', 'Dominator rating', 'number', 'advanced', 'both', 'decimal', FALSE, TRUE, TRUE, TRUE, FALSE, 1120),
('w8dom', 'W8 Dominator', 'Weighted 8-game dominator rating', 'number', 'advanced', 'both', 'decimal', FALSE, TRUE, TRUE, TRUE, FALSE, 1130),
('yptmpa', 'YPTMPA', 'Yards per team pass attempt', 'number', 'advanced', 'both', 'decimal', FALSE, TRUE, TRUE, TRUE, FALSE, 1140),
('ppr_sh', 'PPR Share', 'PPR fantasy points share', 'number', 'fantasy', 'both', 'percentage', FALSE, TRUE, TRUE, TRUE, FALSE, 1150),

-- === FANTASY STATS ===
('fantasy_points', 'Fantasy Points', 'Standard fantasy points scored', 'number', 'fantasy', 'both', 'decimal', TRUE, TRUE, TRUE, TRUE, TRUE, 1200),
('fantasy_points_ppr', 'Fantasy Points (PPR)', 'PPR fantasy points scored', 'number', 'fantasy', 'both', 'decimal', TRUE, TRUE, TRUE, TRUE, TRUE, 1210),
('special_teams_tds', 'Special Teams TDs', 'Special teams touchdowns', 'number', 'fantasy', 'both', 'integer', TRUE, TRUE, TRUE, TRUE, TRUE, 1220),

-- === KICKING STATS ===
('fg_made', 'FG Made', 'Field goals made', 'number', 'basic', 'both', 'integer', FALSE, FALSE, FALSE, FALSE, TRUE, 1300),
('fg_att', 'FG Attempts', 'Field goal attempts', 'number', 'basic', 'both', 'integer', FALSE, FALSE, FALSE, FALSE, TRUE, 1310),
('fg_pct', 'FG %', 'Field goal percentage', 'number', 'basic', 'both', 'percentage', FALSE, FALSE, FALSE, FALSE, TRUE, 1320),
('xp_made', 'XP Made', 'Extra points made', 'number', 'basic', 'both', 'integer', FALSE, FALSE, FALSE, FALSE, TRUE, 1330),
('xp_att', 'XP Attempts', 'Extra point attempts', 'number', 'basic', 'both', 'integer', FALSE, FALSE, FALSE, FALSE, TRUE, 1340),
('xp_pct', 'XP %', 'Extra point percentage', 'number', 'basic', 'both', 'percentage', FALSE, FALSE, FALSE, FALSE, TRUE, 1350),

-- === GAME CONTEXT ===
('gameday', 'Game Date', 'Date of the game', 'string', 'game_info', 'weekly', NULL, TRUE, TRUE, TRUE, TRUE, TRUE, 1400),
('home_away', 'Home/Away', 'Home or away game', 'string', 'game_info', 'weekly', NULL, TRUE, TRUE, TRUE, TRUE, TRUE, 1410),
('game_result', 'Game Result', 'Win/Loss result', 'string', 'game_info', 'weekly', NULL, TRUE, TRUE, TRUE, TRUE, TRUE, 1420),
('weather', 'Weather', 'Weather conditions', 'string', 'game_info', 'weekly', NULL, TRUE, TRUE, TRUE, TRUE, TRUE, 1430),
('temperature', 'Temperature', 'Game temperature', 'number', 'game_info', 'weekly', 'integer', TRUE, TRUE, TRUE, TRUE, TRUE, 1440),
('wind', 'Wind Speed', 'Wind speed (mph)', 'number', 'game_info', 'weekly', 'integer', TRUE, TRUE, TRUE, TRUE, TRUE, 1450),
('roof', 'Roof Type', 'Stadium roof type', 'string', 'game_info', 'weekly', NULL, TRUE, TRUE, TRUE, TRUE, TRUE, 1460),
('surface', 'Surface', 'Field surface type', 'string', 'game_info', 'weekly', NULL, TRUE, TRUE, TRUE, TRUE, TRUE, 1470)

ON CONFLICT (field_key) DO UPDATE SET
    field_label = EXCLUDED.field_label,
    field_description = EXCLUDED.field_description,
    data_type = EXCLUDED.data_type,
    category = EXCLUDED.category,
    timeframe = EXCLUDED.timeframe,
    format_type = EXCLUDED.format_type,
    position_qb = EXCLUDED.position_qb,
    position_rb = EXCLUDED.position_rb,
    position_wr = EXCLUDED.position_wr,
    position_te = EXCLUDED.position_te,
    position_k = EXCLUDED.position_k,
    sort_order = EXCLUDED.sort_order,
    updated_at = CURRENT_TIMESTAMP;