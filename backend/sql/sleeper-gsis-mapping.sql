-- Use Sleeper data to create direct GSIS ID -> player_id mapping
-- This should be much more accurate than name matching

-- First, let's see what we have in the sleeper data file
-- We'll need to import the Sleeper player data with GSIS IDs

-- Create a temporary table to hold Sleeper player data with GSIS IDs
CREATE TEMP TABLE sleeper_gsis_mapping (
    sleeper_id VARCHAR(20),
    gsis_id VARCHAR(20),
    full_name VARCHAR(100),
    team VARCHAR(5),
    position VARCHAR(5)
);

-- NOTE: You'll need to populate this table with data from the Sleeper API
-- For now, let's check what sleeper_bot_id values we have in your players table

SELECT 'Players with Sleeper IDs:' as info,
    COUNT(*) as total_players,
    COUNT(sleeper_bot_id) as with_sleeper_id,
    ROUND(COUNT(sleeper_bot_id) * 100.0 / COUNT(*), 1) as percentage_with_sleeper_id
FROM players 
WHERE position IN ('QB', 'RB', 'WR', 'TE', 'K');

-- Show sample of sleeper_bot_ids
SELECT 'Sample sleeper_bot_ids:' as info;
SELECT long_name, team, position, sleeper_bot_id 
FROM players 
WHERE sleeper_bot_id IS NOT NULL 
  AND position IN ('QB', 'RB', 'WR', 'TE', 'K')
LIMIT 10;