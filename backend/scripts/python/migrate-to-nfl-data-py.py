#!/usr/bin/env python3
"""
Complete migration from Tank01 to nfl_data_py for all core data
"""

import os
import sys
import psycopg2
import nfl_data_py as nfl
import pandas as pd
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'ff_angles'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password'),
    'port': os.getenv('DB_PORT', '5432')
}

def get_db_connection():
    """Create database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def create_new_tables():
    """Create new tables for nfl_data_py data"""
    print("Creating new tables for nfl_data_py data...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create new teams table
    create_teams_sql = """
    DROP TABLE IF EXISTS teams_new CASCADE;
    CREATE TABLE teams_new (
        id SERIAL PRIMARY KEY,
        team_abbr VARCHAR(5) UNIQUE NOT NULL,
        team_name VARCHAR(100) NOT NULL,
        team_id INTEGER,
        team_nick VARCHAR(50),
        team_conf VARCHAR(5),
        team_division VARCHAR(20),
        team_color VARCHAR(10),
        team_color2 VARCHAR(10),
        team_color3 VARCHAR(10),
        team_color4 VARCHAR(10),
        team_logo_wikipedia TEXT,
        team_logo_espn TEXT,
        team_wordmark TEXT,
        team_conference_logo TEXT,
        team_league_logo TEXT,
        team_logo_squared TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_teams_new_abbr ON teams_new(team_abbr);
    CREATE INDEX idx_teams_new_conf ON teams_new(team_conf);
    """
    
    # Create new players table (fantasy positions only)
    create_players_sql = """
    DROP TABLE IF EXISTS players_new CASCADE;
    CREATE TABLE players_new (
        id SERIAL PRIMARY KEY,
        gsis_id VARCHAR(20) UNIQUE NOT NULL,
        player_name VARCHAR(100) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        football_name VARCHAR(50),
        position VARCHAR(5) NOT NULL,
        team VARCHAR(5),
        jersey_number INTEGER,
        height DECIMAL(4,1),
        weight INTEGER,
        birth_date DATE,
        age DECIMAL(4,1),
        college VARCHAR(100),
        years_exp INTEGER,
        entry_year INTEGER,
        rookie_year INTEGER,
        draft_club VARCHAR(5),
        draft_number INTEGER,
        
        -- Cross-platform IDs
        espn_id VARCHAR(20),
        yahoo_id VARCHAR(20),
        sleeper_id VARCHAR(20),
        pff_id VARCHAR(20),
        pfr_id VARCHAR(20),
        fantasy_data_id VARCHAR(20),
        rotowire_id VARCHAR(20),
        sportradar_id VARCHAR(50),
        
        -- Additional IDs
        esb_id VARCHAR(20),
        gsis_it_id VARCHAR(20),
        smart_id VARCHAR(50),
        
        -- Metadata
        headshot_url TEXT,
        status VARCHAR(10),
        depth_chart_position VARCHAR(5),
        status_description_abbr VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT chk_fantasy_position CHECK (position IN ('QB', 'RB', 'WR', 'TE', 'K'))
    );
    
    CREATE INDEX idx_players_new_gsis ON players_new(gsis_id);
    CREATE INDEX idx_players_new_position ON players_new(position);
    CREATE INDEX idx_players_new_team ON players_new(team);
    CREATE INDEX idx_players_new_espn ON players_new(espn_id);
    CREATE INDEX idx_players_new_sleeper ON players_new(sleeper_id);
    """
    
    # Create new games table
    create_games_sql = """
    DROP TABLE IF EXISTS games_new CASCADE;
    CREATE TABLE games_new (
        id SERIAL PRIMARY KEY,
        game_id VARCHAR(50) UNIQUE NOT NULL,
        season INTEGER NOT NULL,
        game_type VARCHAR(10),
        week INTEGER,
        gameday DATE,
        weekday VARCHAR(10),
        gametime TIME,
        
        -- Teams and scores
        away_team VARCHAR(5),
        home_team VARCHAR(5),
        away_score INTEGER,
        home_score INTEGER,
        location VARCHAR(10),
        result INTEGER,
        total DECIMAL(4,1),
        overtime INTEGER,
        
        -- External IDs
        old_game_id BIGINT,
        gsis BIGINT,
        nfl_detail_id BIGINT,
        pfr VARCHAR(20),
        pff BIGINT,
        espn BIGINT,
        ftn BIGINT,
        
        -- Betting data
        away_moneyline DECIMAL(6,1),
        home_moneyline DECIMAL(6,1),
        spread_line DECIMAL(4,1),
        away_spread_odds DECIMAL(6,1),
        home_spread_odds DECIMAL(6,1),
        total_line DECIMAL(4,1),
        under_odds DECIMAL(6,1),
        over_odds DECIMAL(6,1),
        
        -- Game details
        div_game INTEGER,
        roof VARCHAR(20),
        surface VARCHAR(20),
        temp INTEGER,
        wind INTEGER,
        
        -- Personnel
        away_qb_id VARCHAR(20),
        home_qb_id VARCHAR(20),
        away_qb_name VARCHAR(100),
        home_qb_name VARCHAR(100),
        away_coach VARCHAR(100),
        home_coach VARCHAR(100),
        referee VARCHAR(100),
        stadium_id VARCHAR(20),
        stadium VARCHAR(200),
        
        -- Rest days
        away_rest INTEGER,
        home_rest INTEGER,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_games_new_game_id ON games_new(game_id);
    CREATE INDEX idx_games_new_season_week ON games_new(season, week);
    CREATE INDEX idx_games_new_teams ON games_new(away_team, home_team);
    """
    
    cursor.execute(create_teams_sql)
    cursor.execute(create_players_sql)
    cursor.execute(create_games_sql)
    
    conn.commit()
    cursor.close()
    conn.close()
    print("[SUCCESS] New tables created successfully")

def import_teams():
    """Import teams from nfl_data_py"""
    print("Importing teams from nfl_data_py...")
    
    # Get teams data
    teams_data = nfl.import_team_desc()
    print(f"Retrieved {len(teams_data)} teams (including historical)")
    
    # Filter out historical team abbreviations
    historical_teams = ['LA', 'OAK', 'SD', 'STL']
    teams_data = teams_data[~teams_data['team_abbr'].isin(historical_teams)]
    print(f"Filtered to {len(teams_data)} current teams (excluded: {historical_teams})")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    insert_sql = """
    INSERT INTO teams_new (
        team_abbr, team_name, team_id, team_nick, team_conf, team_division,
        team_color, team_color2, team_color3, team_color4,
        team_logo_wikipedia, team_logo_espn, team_wordmark,
        team_conference_logo, team_league_logo, team_logo_squared
    ) VALUES (
        %(team_abbr)s, %(team_name)s, %(team_id)s, %(team_nick)s, %(team_conf)s, %(team_division)s,
        %(team_color)s, %(team_color2)s, %(team_color3)s, %(team_color4)s,
        %(team_logo_wikipedia)s, %(team_logo_espn)s, %(team_wordmark)s,
        %(team_conference_logo)s, %(team_league_logo)s, %(team_logo_squared)s
    )
    """
    
    inserted_count = 0
    for index, row in teams_data.iterrows():
        try:
            row_data = {
                'team_abbr': row.get('team_abbr'),
                'team_name': row.get('team_name'),
                'team_id': row.get('team_id'),
                'team_nick': row.get('team_nick'),
                'team_conf': row.get('team_conf'),
                'team_division': row.get('team_division'),
                'team_color': row.get('team_color'),
                'team_color2': row.get('team_color2'),
                'team_color3': row.get('team_color3'),
                'team_color4': row.get('team_color4'),
                'team_logo_wikipedia': row.get('team_logo_wikipedia'),
                'team_logo_espn': row.get('team_logo_espn'),
                'team_wordmark': row.get('team_wordmark'),
                'team_conference_logo': row.get('team_conference_logo'),
                'team_league_logo': row.get('team_league_logo'),
                'team_logo_squared': row.get('team_logo_squared')
            }
            
            cursor.execute(insert_sql, row_data)
            inserted_count += 1
            
        except Exception as e:
            print(f"Error inserting team {row.get('team_abbr')}: {e}")
            continue
    
    conn.commit()
    cursor.close()
    conn.close()
    print(f"[SUCCESS] Imported {inserted_count} teams")

def import_fantasy_players():
    """Import fantasy-relevant players from nfl_data_py"""
    print("Importing fantasy players from nfl_data_py...")
    
    # Get roster data
    rosters_data = nfl.import_seasonal_rosters(years=[2024])
    
    # Filter for fantasy positions only
    fantasy_positions = ['QB', 'RB', 'WR', 'TE', 'K']
    fantasy_players = rosters_data[rosters_data['position'].isin(fantasy_positions)]
    
    # Filter out historical teams
    historical_teams = ['LA', 'OAK', 'SD', 'STL']
    fantasy_players = fantasy_players[~fantasy_players['team'].isin(historical_teams)]
    
    print(f"Retrieved {len(fantasy_players)} current fantasy players from {len(rosters_data)} total")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    insert_sql = """
    INSERT INTO players_new (
        gsis_id, player_name, first_name, last_name, football_name,
        position, team, jersey_number, height, weight, birth_date, age,
        college, years_exp, entry_year, rookie_year, draft_club, draft_number,
        espn_id, yahoo_id, sleeper_id, pff_id, pfr_id, fantasy_data_id,
        rotowire_id, sportradar_id, esb_id, gsis_it_id, smart_id,
        headshot_url, status, depth_chart_position, status_description_abbr
    ) VALUES (
        %(player_id)s, %(player_name)s, %(first_name)s, %(last_name)s, %(football_name)s,
        %(position)s, %(team)s, %(jersey_number)s, %(height)s, %(weight)s, %(birth_date)s, %(age)s,
        %(college)s, %(years_exp)s, %(entry_year)s, %(rookie_year)s, %(draft_club)s, %(draft_number)s,
        %(espn_id)s, %(yahoo_id)s, %(sleeper_id)s, %(pff_id)s, %(pfr_id)s, %(fantasy_data_id)s,
        %(rotowire_id)s, %(sportradar_id)s, %(esb_id)s, %(gsis_it_id)s, %(smart_id)s,
        %(headshot_url)s, %(status)s, %(depth_chart_position)s, %(status_description_abbr)s
    )
    ON CONFLICT (gsis_id) DO UPDATE SET
        player_name = EXCLUDED.player_name,
        team = EXCLUDED.team,
        status = EXCLUDED.status,
        jersey_number = EXCLUDED.jersey_number
    """
    
    inserted_count = 0
    for index, row in fantasy_players.iterrows():
        try:
            row_data = {
                'player_id': row.get('player_id'),
                'player_name': row.get('player_name'),
                'first_name': row.get('first_name'),
                'last_name': row.get('last_name'),
                'football_name': row.get('football_name'),
                'position': row.get('position'),
                'team': row.get('team'),
                'jersey_number': None if pd.isna(row.get('jersey_number')) else int(row.get('jersey_number')),
                'height': None if pd.isna(row.get('height')) else row.get('height'),
                'weight': None if pd.isna(row.get('weight')) else row.get('weight'),
                'birth_date': None if pd.isna(row.get('birth_date')) else row.get('birth_date'),
                'age': None if pd.isna(row.get('age')) else row.get('age'),
                'college': row.get('college'),
                'years_exp': None if pd.isna(row.get('years_exp')) else row.get('years_exp'),
                'entry_year': None if pd.isna(row.get('entry_year')) else row.get('entry_year'),
                'rookie_year': None if pd.isna(row.get('rookie_year')) else row.get('rookie_year'),
                'draft_club': row.get('draft_club'),
                'draft_number': None if pd.isna(row.get('draft_number')) else row.get('draft_number'),
                'espn_id': row.get('espn_id'),
                'yahoo_id': row.get('yahoo_id'),
                'sleeper_id': row.get('sleeper_id'),
                'pff_id': row.get('pff_id'),
                'pfr_id': row.get('pfr_id'),
                'fantasy_data_id': row.get('fantasy_data_id'),
                'rotowire_id': row.get('rotowire_id'),
                'sportradar_id': row.get('sportradar_id'),
                'esb_id': row.get('esb_id'),
                'gsis_it_id': row.get('gsis_it_id'),
                'smart_id': row.get('smart_id'),
                'headshot_url': row.get('headshot_url'),
                'status': row.get('status'),
                'depth_chart_position': row.get('depth_chart_position'),
                'status_description_abbr': row.get('status_description_abbr')
            }
            
            cursor.execute(insert_sql, row_data)
            inserted_count += 1
            
            if index % 100 == 0:
                print(f"  Processed {index} players...")
            
        except Exception as e:
            print(f"Error inserting player {row.get('player_name')}: {e}")
            continue
    
    conn.commit()
    cursor.close()
    conn.close()
    print(f"[SUCCESS] Imported {inserted_count} fantasy players")

def import_games():
    """Import games/schedule from nfl_data_py"""
    print("Importing games from nfl_data_py...")
    
    # Get schedule data
    schedule_data = nfl.import_schedules(years=[2024])
    print(f"Retrieved {len(schedule_data)} games")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    insert_sql = """
    INSERT INTO games_new (
        game_id, season, game_type, week, gameday, weekday, gametime,
        away_team, home_team, away_score, home_score, location, result, total, overtime,
        old_game_id, gsis, nfl_detail_id, pfr, pff, espn, ftn,
        away_moneyline, home_moneyline, spread_line, away_spread_odds, home_spread_odds,
        total_line, under_odds, over_odds, div_game, roof, surface, temp, wind,
        away_qb_id, home_qb_id, away_qb_name, home_qb_name,
        away_coach, home_coach, referee, stadium_id, stadium,
        away_rest, home_rest
    ) VALUES (
        %(game_id)s, %(season)s, %(game_type)s, %(week)s, %(gameday)s, %(weekday)s, %(gametime)s,
        %(away_team)s, %(home_team)s, %(away_score)s, %(home_score)s, %(location)s, %(result)s, %(total)s, %(overtime)s,
        %(old_game_id)s, %(gsis)s, %(nfl_detail_id)s, %(pfr)s, %(pff)s, %(espn)s, %(ftn)s,
        %(away_moneyline)s, %(home_moneyline)s, %(spread_line)s, %(away_spread_odds)s, %(home_spread_odds)s,
        %(total_line)s, %(under_odds)s, %(over_odds)s, %(div_game)s, %(roof)s, %(surface)s, %(temp)s, %(wind)s,
        %(away_qb_id)s, %(home_qb_id)s, %(away_qb_name)s, %(home_qb_name)s,
        %(away_coach)s, %(home_coach)s, %(referee)s, %(stadium_id)s, %(stadium)s,
        %(away_rest)s, %(home_rest)s
    )
    """
    
    inserted_count = 0
    for index, row in schedule_data.iterrows():
        try:
            row_data = {
                'game_id': row.get('game_id'),
                'season': row.get('season'),
                'game_type': row.get('game_type'),
                'week': None if pd.isna(row.get('week')) else row.get('week'),
                'gameday': None if pd.isna(row.get('gameday')) else row.get('gameday'),
                'weekday': row.get('weekday'),
                'gametime': None if pd.isna(row.get('gametime')) else row.get('gametime'),
                'away_team': row.get('away_team'),
                'home_team': row.get('home_team'),
                'away_score': None if pd.isna(row.get('away_score')) else row.get('away_score'),
                'home_score': None if pd.isna(row.get('home_score')) else row.get('home_score'),
                'location': row.get('location'),
                'result': None if pd.isna(row.get('result')) else row.get('result'),
                'total': None if pd.isna(row.get('total')) else row.get('total'),
                'overtime': None if pd.isna(row.get('overtime')) else row.get('overtime'),
                'old_game_id': None if pd.isna(row.get('old_game_id')) else row.get('old_game_id'),
                'gsis': None if pd.isna(row.get('gsis')) else row.get('gsis'),
                'nfl_detail_id': None if pd.isna(row.get('nfl_detail_id')) else row.get('nfl_detail_id'),
                'pfr': row.get('pfr'),
                'pff': None if pd.isna(row.get('pff')) else row.get('pff'),
                'espn': None if pd.isna(row.get('espn')) else row.get('espn'),
                'ftn': None if pd.isna(row.get('ftn')) else row.get('ftn'),
                'away_moneyline': None if pd.isna(row.get('away_moneyline')) else row.get('away_moneyline'),
                'home_moneyline': None if pd.isna(row.get('home_moneyline')) else row.get('home_moneyline'),
                'spread_line': None if pd.isna(row.get('spread_line')) else row.get('spread_line'),
                'away_spread_odds': None if pd.isna(row.get('away_spread_odds')) else row.get('away_spread_odds'),
                'home_spread_odds': None if pd.isna(row.get('home_spread_odds')) else row.get('home_spread_odds'),
                'total_line': None if pd.isna(row.get('total_line')) else row.get('total_line'),
                'under_odds': None if pd.isna(row.get('under_odds')) else row.get('under_odds'),
                'over_odds': None if pd.isna(row.get('over_odds')) else row.get('over_odds'),
                'div_game': None if pd.isna(row.get('div_game')) else row.get('div_game'),
                'roof': row.get('roof'),
                'surface': row.get('surface'),
                'temp': None if pd.isna(row.get('temp')) else row.get('temp'),
                'wind': None if pd.isna(row.get('wind')) else row.get('wind'),
                'away_qb_id': row.get('away_qb_id'),
                'home_qb_id': row.get('home_qb_id'),
                'away_qb_name': row.get('away_qb_name'),
                'home_qb_name': row.get('home_qb_name'),
                'away_coach': row.get('away_coach'),
                'home_coach': row.get('home_coach'),
                'referee': row.get('referee'),
                'stadium_id': row.get('stadium_id'),
                'stadium': row.get('stadium'),
                'away_rest': None if pd.isna(row.get('away_rest')) else row.get('away_rest'),
                'home_rest': None if pd.isna(row.get('home_rest')) else row.get('home_rest')
            }
            
            cursor.execute(insert_sql, row_data)
            inserted_count += 1
            
        except Exception as e:
            print(f"Error inserting game {row.get('game_id')}: {e}")
            continue
    
    conn.commit()
    cursor.close()
    conn.close()
    print(f"[SUCCESS] Imported {inserted_count} games")

def main():
    """Main migration function"""
    print("FFAngles Migration to nfl_data_py")
    print("=" * 40)
    print("This will create new tables with nfl_data_py data")
    print("Old tables will be preserved with '_old' suffix")
    print()
    
    try:
        # Step 1: Create new table structures
        create_new_tables()
        
        # Step 2: Import teams
        import_teams()
        
        # Step 3: Import fantasy players only
        import_fantasy_players()
        
        # Step 4: Import games/schedule
        import_games()
        
        print("\n[SUCCESS] Migration completed successfully!")
        print("\nNext steps:")
        print("1. Review the new tables: teams_new, players_new, games_new")
        print("2. Update foreign key relationships in statistical tables")
        print("3. Replace old tables with new ones")
        print("4. Remove Tank01 dependency completely")
        
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()