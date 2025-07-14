-- Finalize migration by replacing old tables with new nfl_data_py tables

-- Step 1: Drop old tables (backup first if needed)
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS players CASCADE; 
DROP TABLE IF EXISTS games CASCADE;

-- Step 2: Rename new tables to final names
ALTER TABLE teams_new RENAME TO teams;
ALTER TABLE players_new RENAME TO players;
ALTER TABLE games_new RENAME TO games;

-- Step 3: Update index names to match new table names
ALTER INDEX idx_teams_new_abbr RENAME TO idx_teams_abbr;
ALTER INDEX idx_teams_new_conf RENAME TO idx_teams_conf;

ALTER INDEX idx_players_new_gsis RENAME TO idx_players_gsis;
ALTER INDEX idx_players_new_position RENAME TO idx_players_position;
ALTER INDEX idx_players_new_team RENAME TO idx_players_team;
ALTER INDEX idx_players_new_espn RENAME TO idx_players_espn;
ALTER INDEX idx_players_new_sleeper RENAME TO idx_players_sleeper;

ALTER INDEX idx_games_new_game_id RENAME TO idx_games_game_id;
ALTER INDEX idx_games_new_season_week RENAME TO idx_games_season_week;
ALTER INDEX idx_games_new_teams RENAME TO idx_games_teams;

-- Step 4: Show final table info
SELECT 'Teams table:' as info;
SELECT COUNT(*) as team_count FROM teams;

SELECT 'Players table:' as info;
SELECT COUNT(*) as player_count FROM players;
SELECT position, COUNT(*) as count FROM players GROUP BY position ORDER BY count DESC;

SELECT 'Games table:' as info;
SELECT COUNT(*) as game_count FROM games;

SELECT 'Migration completed - old Tank01 tables replaced with nfl_data_py tables' as final_status;