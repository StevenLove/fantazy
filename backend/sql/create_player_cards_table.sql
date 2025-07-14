-- Create player_cards table for storing custom player card configurations
CREATE TABLE IF NOT EXISTS player_cards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('data_display', 'graph')),
    timeframe VARCHAR(50) NOT NULL CHECK (timeframe IN ('weekly', 'cumulative')),
    position_qb BOOLEAN DEFAULT FALSE,
    position_rb BOOLEAN DEFAULT FALSE,
    position_wr BOOLEAN DEFAULT FALSE,
    position_te BOOLEAN DEFAULT FALSE,
    position_k BOOLEAN DEFAULT FALSE,
    graph_config JSONB, -- JSON config for graph settings (x_axis, y_axis, line, chart_type)
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_default BOOLEAN DEFAULT FALSE
);

-- Create player_card_fields table for storing the fields associated with each player card
CREATE TABLE IF NOT EXISTS player_card_fields (
    id SERIAL PRIMARY KEY,
    player_card_id INTEGER NOT NULL REFERENCES player_cards(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for player_cards table
CREATE INDEX IF NOT EXISTS idx_player_cards_created_by ON player_cards(created_by);
CREATE INDEX IF NOT EXISTS idx_player_cards_timeframe ON player_cards(timeframe);
CREATE INDEX IF NOT EXISTS idx_player_cards_type ON player_cards(type);
CREATE INDEX IF NOT EXISTS idx_player_cards_position_qb ON player_cards(position_qb);
CREATE INDEX IF NOT EXISTS idx_player_cards_position_rb ON player_cards(position_rb);
CREATE INDEX IF NOT EXISTS idx_player_cards_position_wr ON player_cards(position_wr);
CREATE INDEX IF NOT EXISTS idx_player_cards_position_te ON player_cards(position_te);
CREATE INDEX IF NOT EXISTS idx_player_cards_position_k ON player_cards(position_k);

-- Create indexes for player_card_fields table
CREATE INDEX IF NOT EXISTS idx_player_card_fields_player_card_id ON player_card_fields(player_card_id);
CREATE INDEX IF NOT EXISTS idx_player_card_fields_field_name ON player_card_fields(field_name);
CREATE INDEX IF NOT EXISTS idx_player_card_fields_display_order ON player_card_fields(player_card_id, display_order);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_player_cards_updated_at 
    BEFORE UPDATE ON player_cards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default player cards
INSERT INTO player_cards (
    name, description, type, timeframe, 
    position_qb, position_rb, position_wr, position_te, position_k,
    created_by, is_default
) VALUES
(
    'Game Info',
    'Weekly game information and player stats',
    'data_display',
    'weekly',
    TRUE, TRUE, TRUE, TRUE, TRUE,
    'system',
    TRUE
),
(
    'Season Totals',
    'Cumulative season statistics',
    'data_display',
    'cumulative',
    TRUE, TRUE, TRUE, TRUE, TRUE,
    'system',
    TRUE
)
ON CONFLICT DO NOTHING;

-- Insert fields for Game Info card
INSERT INTO player_card_fields (player_card_id, field_name, display_order)
SELECT 
    pc.id,
    field_name,
    display_order
FROM player_cards pc
CROSS JOIN (
    VALUES 
        ('completions', 1),
        ('attempts', 2),
        ('passing_yards', 3),
        ('passing_tds', 4),
        ('interceptions', 5),
        ('carries', 6),
        ('rushing_yards', 7),
        ('rushing_tds', 8),
        ('receptions', 9),
        ('targets', 10),
        ('receiving_yards', 11),
        ('receiving_tds', 12),
        ('fumbles_lost', 13),
        ('fantasy_points', 14),
        ('fantasy_points_ppr', 15),
        ('opponent', 16),
        ('home_away', 17),
        ('game_result', 18)
) AS fields(field_name, display_order)
WHERE pc.name = 'Game Info' AND pc.timeframe = 'weekly'
ON CONFLICT DO NOTHING;

-- Insert fields for Season Totals card
INSERT INTO player_card_fields (player_card_id, field_name, display_order)
SELECT 
    pc.id,
    field_name,
    display_order
FROM player_cards pc
CROSS JOIN (
    VALUES 
        ('games_played', 1),
        ('completions', 2),
        ('attempts', 3),
        ('passing_yards', 4),
        ('passing_tds', 5),
        ('interceptions', 6),
        ('carries', 7),
        ('rushing_yards', 8),
        ('rushing_tds', 9),
        ('receptions', 10),
        ('targets', 11),
        ('receiving_yards', 12),
        ('receiving_tds', 13),
        ('fumbles_lost', 14),
        ('fantasy_points', 15),
        ('fantasy_points_ppr', 16),
        ('target_share', 17),
        ('air_yards_share', 18)
) AS fields(field_name, display_order)
WHERE pc.name = 'Season Totals' AND pc.timeframe = 'cumulative'
ON CONFLICT DO NOTHING;