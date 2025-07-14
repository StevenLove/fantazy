#!/usr/bin/env python3
"""
Import historical NFL data from nfl_data_py for all available seasons
Imports: games, player_game_logs, player_ngs_passing, player_ngs_receiving, 
         player_ngs_rushing, player_seasonal_stats, and player_weekly_stats
"""

import os
import sys
import psycopg2
import psycopg2.extras
import nfl_data_py as nfl
import pandas as pd
from datetime import datetime
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

def import_games(years):
    """Import games data for all specified years"""
    print(f"Importing games data for years: {years}")
    
    try:
        # Get schedules data (includes games)
        schedules = nfl.import_schedules(years)
        print(f"Retrieved {len(schedules)} games")
        
        if len(schedules) == 0:
            print("No games data found")
            return True
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert games data
        insert_sql = """
        INSERT INTO games (
            game_id, season, game_type, week, gameday, weekday, gametime,
            away_team, home_team, away_score, home_score, location, result,
            total, overtime, old_game_id, gsis, nfl_detail_id, pfr, pff,
            espn, ftn, away_rest, home_rest, away_moneyline, home_moneyline,
            spread_line, away_spread_odds, home_spread_odds, total_line,
            under_odds, over_odds, div_game, roof, surface, temp, wind,
            away_qb_id, home_qb_id, away_qb_name, home_qb_name, away_coach,
            home_coach, referee, stadium_id, stadium
        ) VALUES (
            %(game_id)s, %(season)s, %(game_type)s, %(week)s, %(gameday)s, %(weekday)s, %(gametime)s,
            %(away_team)s, %(home_team)s, %(away_score)s, %(home_score)s, %(location)s, %(result)s,
            %(total)s, %(overtime)s, %(old_game_id)s, %(gsis)s, %(nfl_detail_id)s, %(pfr)s, %(pff)s,
            %(espn)s, %(ftn)s, %(away_rest)s, %(home_rest)s, %(away_moneyline)s, %(home_moneyline)s,
            %(spread_line)s, %(away_spread_odds)s, %(home_spread_odds)s, %(total_line)s,
            %(under_odds)s, %(over_odds)s, %(div_game)s, %(roof)s, %(surface)s, %(temp)s, %(wind)s,
            %(away_qb_id)s, %(home_qb_id)s, %(away_qb_name)s, %(home_qb_name)s, %(away_coach)s,
            %(home_coach)s, %(referee)s, %(stadium_id)s, %(stadium)s
        )
        ON CONFLICT (game_id) 
        DO UPDATE SET
            away_score = EXCLUDED.away_score,
            home_score = EXCLUDED.home_score,
            result = EXCLUDED.result,
            total = EXCLUDED.total,
            overtime = EXCLUDED.overtime
        """
        
        inserted_count = 0
        
        for index, row in schedules.iterrows():
            try:
                # Prepare row data with proper type handling
                row_data = {}
                for col in schedules.columns:
                    value = row.get(col)
                    if pd.isna(value):
                        row_data[col] = None
                    elif col in ['gsis', 'nfl_detail_id', 'pff', 'espn', 'ftn', 'old_game_id']:
                        # Handle bigint columns - convert to int or None if not numeric
                        if isinstance(value, str) and not value.isdigit():
                            row_data[col] = None
                        else:
                            try:
                                row_data[col] = int(float(value)) if value is not None else None
                            except (ValueError, TypeError):
                                row_data[col] = None
                    else:
                        row_data[col] = value
                
                cursor.execute(insert_sql, row_data)
                inserted_count += 1
                
                if index % 100 == 0:
                    print(f"  Processed {index} games...")
            except Exception as e:
                print(f"Error inserting game {index}: {e}")
                # Roll back the current transaction and continue
                conn.rollback()
                continue
        
        conn.commit()
        print(f"Imported {inserted_count} games")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error importing games: {e}")
        return False

def import_player_seasonal_stats(years):
    """Import player seasonal stats for all specified years"""
    print(f"Importing player seasonal stats for years: {years}")
    
    try:
        seasonal_data = nfl.import_seasonal_data(years)
        print(f"Retrieved {len(seasonal_data)} seasonal records")
        
        if len(seasonal_data) == 0:
            print("No seasonal data found")
            return True
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Use existing insert logic from import-nfl-seasonal-stats-fixed.py
        insert_sql = """
        INSERT INTO player_seasonal_stats (
            gsis_id, player_id, season, season_type, games, completions, attempts, 
            passing_yards, passing_tds, interceptions, sacks, sack_yards,
            sack_fumbles, sack_fumbles_lost, passing_air_yards, passing_yards_after_catch,
            passing_first_downs, passing_epa, passing_2pt_conversions, pacr, dakota,
            carries, rushing_yards, rushing_tds, rushing_fumbles, rushing_fumbles_lost,
            rushing_first_downs, rushing_epa, rushing_2pt_conversions,
            receptions, targets, receiving_yards, receiving_tds, receiving_fumbles,
            receiving_fumbles_lost, receiving_air_yards, receiving_yards_after_catch,
            receiving_first_downs, receiving_epa, receiving_2pt_conversions,
            racr, target_share, air_yards_share, wopr_x, wopr_y,
            tgt_sh, ay_sh, yac_sh, ry_sh, rtd_sh, rfd_sh, rtdfd_sh,
            dom, w8dom, yptmpa, ppr_sh, special_teams_tds, fantasy_points, fantasy_points_ppr
        ) VALUES (
            %(player_id)s, 
            (SELECT id FROM players WHERE gsis_id = %(player_id)s LIMIT 1),
            %(season)s, %(season_type)s, %(games)s, %(completions)s, %(attempts)s,
            %(passing_yards)s, %(passing_tds)s, %(interceptions)s, %(sacks)s, %(sack_yards)s,
            %(sack_fumbles)s, %(sack_fumbles_lost)s, %(passing_air_yards)s, %(passing_yards_after_catch)s,
            %(passing_first_downs)s, %(passing_epa)s, %(passing_2pt_conversions)s, %(pacr)s, %(dakota)s,
            %(carries)s, %(rushing_yards)s, %(rushing_tds)s, %(rushing_fumbles)s, %(rushing_fumbles_lost)s,
            %(rushing_first_downs)s, %(rushing_epa)s, %(rushing_2pt_conversions)s,
            %(receptions)s, %(targets)s, %(receiving_yards)s, %(receiving_tds)s, %(receiving_fumbles)s,
            %(receiving_fumbles_lost)s, %(receiving_air_yards)s, %(receiving_yards_after_catch)s,
            %(receiving_first_downs)s, %(receiving_epa)s, %(receiving_2pt_conversions)s,
            %(racr)s, %(target_share)s, %(air_yards_share)s, %(wopr_x)s, %(wopr_y)s,
            %(tgt_sh)s, %(ay_sh)s, %(yac_sh)s, %(ry_sh)s, %(rtd_sh)s, %(rfd_sh)s, %(rtdfd_sh)s,
            %(dom)s, %(w8dom)s, %(yptmpa)s, %(ppr_sh)s, %(special_teams_tds)s, %(fantasy_points)s, %(fantasy_points_ppr)s
        )
        ON CONFLICT (gsis_id, season, season_type) 
        DO UPDATE SET
            player_id = (SELECT id FROM players WHERE gsis_id = EXCLUDED.gsis_id LIMIT 1),
            games = EXCLUDED.games,
            completions = EXCLUDED.completions,
            attempts = EXCLUDED.attempts,
            passing_yards = EXCLUDED.passing_yards,
            passing_tds = EXCLUDED.passing_tds,
            interceptions = EXCLUDED.interceptions,
            sacks = EXCLUDED.sacks,
            sack_yards = EXCLUDED.sack_yards,
            sack_fumbles = EXCLUDED.sack_fumbles,
            sack_fumbles_lost = EXCLUDED.sack_fumbles_lost,
            passing_air_yards = EXCLUDED.passing_air_yards,
            passing_yards_after_catch = EXCLUDED.passing_yards_after_catch,
            passing_first_downs = EXCLUDED.passing_first_downs,
            passing_epa = EXCLUDED.passing_epa,
            passing_2pt_conversions = EXCLUDED.passing_2pt_conversions,
            pacr = EXCLUDED.pacr,
            dakota = EXCLUDED.dakota,
            carries = EXCLUDED.carries,
            rushing_yards = EXCLUDED.rushing_yards,
            rushing_tds = EXCLUDED.rushing_tds,
            rushing_fumbles = EXCLUDED.rushing_fumbles,
            rushing_fumbles_lost = EXCLUDED.rushing_fumbles_lost,
            rushing_first_downs = EXCLUDED.rushing_first_downs,
            rushing_epa = EXCLUDED.rushing_epa,
            rushing_2pt_conversions = EXCLUDED.rushing_2pt_conversions,
            receptions = EXCLUDED.receptions,
            targets = EXCLUDED.targets,
            receiving_yards = EXCLUDED.receiving_yards,
            receiving_tds = EXCLUDED.receiving_tds,
            receiving_fumbles = EXCLUDED.receiving_fumbles,
            receiving_fumbles_lost = EXCLUDED.receiving_fumbles_lost,
            receiving_air_yards = EXCLUDED.receiving_air_yards,
            receiving_yards_after_catch = EXCLUDED.receiving_yards_after_catch,
            receiving_first_downs = EXCLUDED.receiving_first_downs,
            receiving_epa = EXCLUDED.receiving_epa,
            receiving_2pt_conversions = EXCLUDED.receiving_2pt_conversions,
            racr = EXCLUDED.racr,
            target_share = EXCLUDED.target_share,
            air_yards_share = EXCLUDED.air_yards_share,
            wopr_x = EXCLUDED.wopr_x,
            wopr_y = EXCLUDED.wopr_y,
            tgt_sh = EXCLUDED.tgt_sh,
            ay_sh = EXCLUDED.ay_sh,
            yac_sh = EXCLUDED.yac_sh,
            ry_sh = EXCLUDED.ry_sh,
            rtd_sh = EXCLUDED.rtd_sh,
            rfd_sh = EXCLUDED.rfd_sh,
            rtdfd_sh = EXCLUDED.rtdfd_sh,
            dom = EXCLUDED.dom,
            w8dom = EXCLUDED.w8dom,
            yptmpa = EXCLUDED.yptmpa,
            ppr_sh = EXCLUDED.ppr_sh,
            special_teams_tds = EXCLUDED.special_teams_tds,
            fantasy_points = EXCLUDED.fantasy_points,
            fantasy_points_ppr = EXCLUDED.fantasy_points_ppr
        """
        
        inserted_count = 0
        
        for index, row in seasonal_data.iterrows():
            try:
                row_data = {
                    'player_id': row.get('player_id'),
                    'season': row.get('season'),
                    'season_type': row.get('season_type', 'REG'),
                    'games': None if pd.isna(row.get('games')) else int(row.get('games', 0)),
                    'completions': None if pd.isna(row.get('completions')) else row.get('completions'),
                    'attempts': None if pd.isna(row.get('attempts')) else row.get('attempts'),
                    'passing_yards': None if pd.isna(row.get('passing_yards')) else row.get('passing_yards'),
                    'passing_tds': None if pd.isna(row.get('passing_tds')) else row.get('passing_tds'),
                    'interceptions': None if pd.isna(row.get('interceptions')) else row.get('interceptions'),
                    'sacks': None if pd.isna(row.get('sacks')) else row.get('sacks'),
                    'sack_yards': None if pd.isna(row.get('sack_yards')) else row.get('sack_yards'),
                    'sack_fumbles': None if pd.isna(row.get('sack_fumbles')) else row.get('sack_fumbles'),
                    'sack_fumbles_lost': None if pd.isna(row.get('sack_fumbles_lost')) else row.get('sack_fumbles_lost'),
                    'passing_air_yards': None if pd.isna(row.get('passing_air_yards')) else row.get('passing_air_yards'),
                    'passing_yards_after_catch': None if pd.isna(row.get('passing_yards_after_catch')) else row.get('passing_yards_after_catch'),
                    'passing_first_downs': None if pd.isna(row.get('passing_first_downs')) else row.get('passing_first_downs'),
                    'passing_epa': None if pd.isna(row.get('passing_epa')) else row.get('passing_epa'),
                    'passing_2pt_conversions': None if pd.isna(row.get('passing_2pt_conversions')) else row.get('passing_2pt_conversions'),
                    'pacr': None if pd.isna(row.get('pacr')) else row.get('pacr'),
                    'dakota': None if pd.isna(row.get('dakota')) else row.get('dakota'),
                    'carries': None if pd.isna(row.get('carries')) else row.get('carries'),
                    'rushing_yards': None if pd.isna(row.get('rushing_yards')) else row.get('rushing_yards'),
                    'rushing_tds': None if pd.isna(row.get('rushing_tds')) else row.get('rushing_tds'),
                    'rushing_fumbles': None if pd.isna(row.get('rushing_fumbles')) else row.get('rushing_fumbles'),
                    'rushing_fumbles_lost': None if pd.isna(row.get('rushing_fumbles_lost')) else row.get('rushing_fumbles_lost'),
                    'rushing_first_downs': None if pd.isna(row.get('rushing_first_downs')) else row.get('rushing_first_downs'),
                    'rushing_epa': None if pd.isna(row.get('rushing_epa')) else row.get('rushing_epa'),
                    'rushing_2pt_conversions': None if pd.isna(row.get('rushing_2pt_conversions')) else row.get('rushing_2pt_conversions'),
                    'receptions': None if pd.isna(row.get('receptions')) else row.get('receptions'),
                    'targets': None if pd.isna(row.get('targets')) else row.get('targets'),
                    'receiving_yards': None if pd.isna(row.get('receiving_yards')) else row.get('receiving_yards'),
                    'receiving_tds': None if pd.isna(row.get('receiving_tds')) else row.get('receiving_tds'),
                    'receiving_fumbles': None if pd.isna(row.get('receiving_fumbles')) else row.get('receiving_fumbles'),
                    'receiving_fumbles_lost': None if pd.isna(row.get('receiving_fumbles_lost')) else row.get('receiving_fumbles_lost'),
                    'receiving_air_yards': None if pd.isna(row.get('receiving_air_yards')) else row.get('receiving_air_yards'),
                    'receiving_yards_after_catch': None if pd.isna(row.get('receiving_yards_after_catch')) else row.get('receiving_yards_after_catch'),
                    'receiving_first_downs': None if pd.isna(row.get('receiving_first_downs')) else row.get('receiving_first_downs'),
                    'receiving_epa': None if pd.isna(row.get('receiving_epa')) else row.get('receiving_epa'),
                    'receiving_2pt_conversions': None if pd.isna(row.get('receiving_2pt_conversions')) else row.get('receiving_2pt_conversions'),
                    'racr': None if pd.isna(row.get('racr')) else row.get('racr'),
                    'target_share': None if pd.isna(row.get('target_share')) else row.get('target_share'),
                    'air_yards_share': None if pd.isna(row.get('air_yards_share')) else row.get('air_yards_share'),
                    'wopr_x': None if pd.isna(row.get('wopr_x')) else row.get('wopr_x'),
                    'wopr_y': None if pd.isna(row.get('wopr_y')) else row.get('wopr_y'),
                    'tgt_sh': None if pd.isna(row.get('tgt_sh')) else row.get('tgt_sh'),
                    'ay_sh': None if pd.isna(row.get('ay_sh')) else row.get('ay_sh'),
                    'yac_sh': None if pd.isna(row.get('yac_sh')) else row.get('yac_sh'),
                    'ry_sh': None if pd.isna(row.get('ry_sh')) else row.get('ry_sh'),
                    'rtd_sh': None if pd.isna(row.get('rtd_sh')) else row.get('rtd_sh'),
                    'rfd_sh': None if pd.isna(row.get('rfd_sh')) else row.get('rfd_sh'),
                    'rtdfd_sh': None if pd.isna(row.get('rtdfd_sh')) else row.get('rtdfd_sh'),
                    'dom': None if pd.isna(row.get('dom')) else row.get('dom'),
                    'w8dom': None if pd.isna(row.get('w8dom')) else row.get('w8dom'),
                    'yptmpa': None if pd.isna(row.get('yptmpa')) else row.get('yptmpa'),
                    'ppr_sh': None if pd.isna(row.get('ppr_sh')) else row.get('ppr_sh'),
                    'special_teams_tds': None if pd.isna(row.get('special_teams_tds')) else row.get('special_teams_tds'),
                    'fantasy_points': None if pd.isna(row.get('fantasy_points')) else row.get('fantasy_points'),
                    'fantasy_points_ppr': None if pd.isna(row.get('fantasy_points_ppr')) else row.get('fantasy_points_ppr')
                }
                
                cursor.execute(insert_sql, row_data)
                inserted_count += 1
                
                if index % 500 == 0:
                    print(f"  Processed {index} seasonal records...")
                    
            except Exception as e:
                print(f"Error inserting seasonal row {index}: {e}")
                continue
        
        conn.commit()
        print(f"Imported {inserted_count} seasonal stat records")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error importing seasonal stats: {e}")
        return False

def import_player_weekly_stats(years):
    """Import player weekly stats for all specified years"""
    print(f"Importing player weekly stats for years: {years}")
    
    try:
        weekly_data = nfl.import_weekly_data(years=years)
        print(f"Retrieved {len(weekly_data)} weekly records")
        
        if len(weekly_data) == 0:
            print("No weekly data found")
            return True
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Use existing insert logic from import-nfl-weekly-stats.py
        insert_sql = """
        INSERT INTO player_weekly_stats (
            gsis_id, player_id, season, season_type, week, opponent_team, recent_team,
            completions, attempts, passing_yards, passing_tds, interceptions, 
            sacks, sack_yards, carries, rushing_yards, rushing_tds, 
            rushing_fumbles, rushing_fumbles_lost, receptions, targets, 
            receiving_yards, receiving_tds, receiving_fumbles, receiving_fumbles_lost,
            passing_epa, rushing_epa, receiving_epa, racr, target_share, 
            air_yards_share, wopr, fantasy_points, fantasy_points_ppr
        ) VALUES (
            %(player_id)s, 
            (SELECT id FROM players WHERE gsis_id = %(player_id)s LIMIT 1),
            %(season)s, %(season_type)s, %(week)s, %(opponent_team)s, %(recent_team)s,
            %(completions)s, %(attempts)s, %(passing_yards)s, %(passing_tds)s, %(interceptions)s,
            %(sacks)s, %(sack_yards)s, %(carries)s, %(rushing_yards)s, %(rushing_tds)s,
            %(rushing_fumbles)s, %(rushing_fumbles_lost)s, %(receptions)s, %(targets)s,
            %(receiving_yards)s, %(receiving_tds)s, %(receiving_fumbles)s, %(receiving_fumbles_lost)s,
            %(passing_epa)s, %(rushing_epa)s, %(receiving_epa)s, %(racr)s, %(target_share)s,
            %(air_yards_share)s, %(wopr)s, %(fantasy_points)s, %(fantasy_points_ppr)s
        )
        ON CONFLICT (gsis_id, season, season_type, week) 
        DO UPDATE SET
            player_id = (SELECT id FROM players WHERE gsis_id = EXCLUDED.gsis_id LIMIT 1),
            opponent_team = EXCLUDED.opponent_team,
            recent_team = EXCLUDED.recent_team,
            completions = EXCLUDED.completions,
            attempts = EXCLUDED.attempts,
            passing_yards = EXCLUDED.passing_yards,
            passing_tds = EXCLUDED.passing_tds,
            interceptions = EXCLUDED.interceptions,
            sacks = EXCLUDED.sacks,
            sack_yards = EXCLUDED.sack_yards,
            carries = EXCLUDED.carries,
            rushing_yards = EXCLUDED.rushing_yards,
            rushing_tds = EXCLUDED.rushing_tds,
            rushing_fumbles = EXCLUDED.rushing_fumbles,
            rushing_fumbles_lost = EXCLUDED.rushing_fumbles_lost,
            receptions = EXCLUDED.receptions,
            targets = EXCLUDED.targets,
            receiving_yards = EXCLUDED.receiving_yards,
            receiving_tds = EXCLUDED.receiving_tds,
            receiving_fumbles = EXCLUDED.receiving_fumbles,
            receiving_fumbles_lost = EXCLUDED.receiving_fumbles_lost,
            passing_epa = EXCLUDED.passing_epa,
            rushing_epa = EXCLUDED.rushing_epa,
            receiving_epa = EXCLUDED.receiving_epa,
            racr = EXCLUDED.racr,
            target_share = EXCLUDED.target_share,
            air_yards_share = EXCLUDED.air_yards_share,
            wopr = EXCLUDED.wopr,
            fantasy_points = EXCLUDED.fantasy_points,
            fantasy_points_ppr = EXCLUDED.fantasy_points_ppr
        """
        
        inserted_count = 0
        
        for index, row in weekly_data.iterrows():
            try:
                row_data = {
                    'player_id': row.get('player_id'),
                    'season': row.get('season'),
                    'season_type': row.get('season_type', 'REG'),
                    'week': row.get('week'),
                    'opponent_team': row.get('opponent_team'),
                    'recent_team': row.get('recent_team'),
                    'completions': None if pd.isna(row.get('completions')) else row.get('completions'),
                    'attempts': None if pd.isna(row.get('attempts')) else row.get('attempts'),
                    'passing_yards': None if pd.isna(row.get('passing_yards')) else row.get('passing_yards'),
                    'passing_tds': None if pd.isna(row.get('passing_tds')) else row.get('passing_tds'),
                    'interceptions': None if pd.isna(row.get('interceptions')) else row.get('interceptions'),
                    'sacks': None if pd.isna(row.get('sacks')) else row.get('sacks'),
                    'sack_yards': None if pd.isna(row.get('sack_yards')) else row.get('sack_yards'),
                    'carries': None if pd.isna(row.get('carries')) else row.get('carries'),
                    'rushing_yards': None if pd.isna(row.get('rushing_yards')) else row.get('rushing_yards'),
                    'rushing_tds': None if pd.isna(row.get('rushing_tds')) else row.get('rushing_tds'),
                    'rushing_fumbles': None if pd.isna(row.get('rushing_fumbles')) else row.get('rushing_fumbles'),
                    'rushing_fumbles_lost': None if pd.isna(row.get('rushing_fumbles_lost')) else row.get('rushing_fumbles_lost'),
                    'receptions': None if pd.isna(row.get('receptions')) else row.get('receptions'),
                    'targets': None if pd.isna(row.get('targets')) else row.get('targets'),
                    'receiving_yards': None if pd.isna(row.get('receiving_yards')) else row.get('receiving_yards'),
                    'receiving_tds': None if pd.isna(row.get('receiving_tds')) else row.get('receiving_tds'),
                    'receiving_fumbles': None if pd.isna(row.get('receiving_fumbles')) else row.get('receiving_fumbles'),
                    'receiving_fumbles_lost': None if pd.isna(row.get('receiving_fumbles_lost')) else row.get('receiving_fumbles_lost'),
                    'passing_epa': None if pd.isna(row.get('passing_epa')) else row.get('passing_epa'),
                    'rushing_epa': None if pd.isna(row.get('rushing_epa')) else row.get('rushing_epa'),
                    'receiving_epa': None if pd.isna(row.get('receiving_epa')) else row.get('receiving_epa'),
                    'racr': None if pd.isna(row.get('racr')) else row.get('racr'),
                    'target_share': None if pd.isna(row.get('target_share')) else row.get('target_share'),
                    'air_yards_share': None if pd.isna(row.get('air_yards_share')) else row.get('air_yards_share'),
                    'wopr': None if pd.isna(row.get('wopr')) else row.get('wopr'),
                    'fantasy_points': None if pd.isna(row.get('fantasy_points')) else row.get('fantasy_points'),
                    'fantasy_points_ppr': None if pd.isna(row.get('fantasy_points_ppr')) else row.get('fantasy_points_ppr')
                }
                
                cursor.execute(insert_sql, row_data)
                inserted_count += 1
                
                if index % 1000 == 0:
                    print(f"  Processed {index} weekly records...")
                    
            except Exception as e:
                print(f"Error inserting weekly row {index}: {e}")
                continue
        
        conn.commit()
        print(f"Imported {inserted_count} weekly stat records")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error importing weekly stats: {e}")
        return False

def import_ngs_stats(years, stat_type):
    """Import NGS stats for specified years and stat type"""
    print(f"Importing NGS {stat_type} stats for years: {years}")
    
    try:
        ngs_data = nfl.import_ngs_data(years=years, stat_type=stat_type)
        print(f"Retrieved {len(ngs_data)} NGS {stat_type} records")
        
        if len(ngs_data) == 0:
            print(f"No NGS {stat_type} data found")
            return True
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Determine table name and columns based on stat_type
        if stat_type == 'passing':
            table_name = 'player_ngs_passing'
            insert_sql = f"""
            INSERT INTO {table_name} (
                gsis_id, player_id, season, season_type, week, player_display_name, 
                player_position, team_abbr, attempts, pass_yards, pass_touchdowns, 
                interceptions, passer_rating, completions, completion_percentage, 
                expected_completion_percentage, completion_percentage_above_expectation, 
                avg_time_to_throw, avg_completed_air_yards, avg_intended_air_yards, 
                avg_air_yards_differential, aggressiveness, max_completed_air_distance, 
                avg_air_yards_to_sticks, avg_air_distance, max_air_distance,
                player_gsis_id, player_first_name, player_last_name, player_jersey_number, player_short_name
            ) VALUES (
                %(player_gsis_id)s, 
                (SELECT id FROM players WHERE gsis_id = %(player_gsis_id)s LIMIT 1),
                %(season)s, %(season_type)s, %(week)s, %(player_display_name)s,
                %(player_position)s, %(team_abbr)s, %(attempts)s, %(pass_yards)s, %(pass_touchdowns)s,
                %(interceptions)s, %(passer_rating)s, %(completions)s, %(completion_percentage)s,
                %(expected_completion_percentage)s, %(completion_percentage_above_expectation)s,
                %(avg_time_to_throw)s, %(avg_completed_air_yards)s, %(avg_intended_air_yards)s,
                %(avg_air_yards_differential)s, %(aggressiveness)s, %(max_completed_air_distance)s,
                %(avg_air_yards_to_sticks)s, %(avg_air_distance)s, %(max_air_distance)s,
                %(player_gsis_id)s, %(player_first_name)s, %(player_last_name)s, %(player_jersey_number)s, %(player_short_name)s
            )
            ON CONFLICT (gsis_id, season, season_type, week) 
            DO UPDATE SET
                player_id = (SELECT id FROM players WHERE gsis_id = EXCLUDED.gsis_id LIMIT 1),
                player_display_name = EXCLUDED.player_display_name,
                player_position = EXCLUDED.player_position,
                team_abbr = EXCLUDED.team_abbr,
                attempts = EXCLUDED.attempts,
                pass_yards = EXCLUDED.pass_yards,
                pass_touchdowns = EXCLUDED.pass_touchdowns,
                interceptions = EXCLUDED.interceptions,
                passer_rating = EXCLUDED.passer_rating,
                completions = EXCLUDED.completions,
                completion_percentage = EXCLUDED.completion_percentage,
                expected_completion_percentage = EXCLUDED.expected_completion_percentage,
                completion_percentage_above_expectation = EXCLUDED.completion_percentage_above_expectation,
                avg_time_to_throw = EXCLUDED.avg_time_to_throw,
                avg_completed_air_yards = EXCLUDED.avg_completed_air_yards,
                avg_intended_air_yards = EXCLUDED.avg_intended_air_yards,
                avg_air_yards_differential = EXCLUDED.avg_air_yards_differential,
                aggressiveness = EXCLUDED.aggressiveness,
                max_completed_air_distance = EXCLUDED.max_completed_air_distance,
                avg_air_yards_to_sticks = EXCLUDED.avg_air_yards_to_sticks,
                avg_air_distance = EXCLUDED.avg_air_distance,
                max_air_distance = EXCLUDED.max_air_distance,
                player_gsis_id = EXCLUDED.player_gsis_id,
                player_first_name = EXCLUDED.player_first_name,
                player_last_name = EXCLUDED.player_last_name,
                player_jersey_number = EXCLUDED.player_jersey_number,
                player_short_name = EXCLUDED.player_short_name
            """
        elif stat_type == 'receiving':
            table_name = 'player_ngs_receiving'
            insert_sql = f"""
            INSERT INTO {table_name} (
                gsis_id, player_id, season, season_type, week, player_display_name, 
                player_position, team_abbr, targets, receptions, yards, rec_touchdowns, 
                avg_cushion, avg_separation, avg_intended_air_yards, percent_share_of_intended_air_yards,
                avg_yac, avg_expected_yac, avg_yac_above_expectation, catch_percentage,
                player_gsis_id, player_first_name, player_last_name, player_jersey_number, player_short_name
            ) VALUES (
                %(player_gsis_id)s, 
                (SELECT id FROM players WHERE gsis_id = %(player_gsis_id)s LIMIT 1),
                %(season)s, %(season_type)s, %(week)s, %(player_display_name)s,
                %(player_position)s, %(team_abbr)s, %(targets)s, %(receptions)s, %(yards)s, %(rec_touchdowns)s,
                %(avg_cushion)s, %(avg_separation)s, %(avg_intended_air_yards)s, %(percent_share_of_intended_air_yards)s,
                %(avg_yac)s, %(avg_expected_yac)s, %(avg_yac_above_expectation)s, %(catch_percentage)s,
                %(player_gsis_id)s, %(player_first_name)s, %(player_last_name)s, %(player_jersey_number)s, %(player_short_name)s
            )
            ON CONFLICT (gsis_id, season, season_type, week) 
            DO UPDATE SET
                player_id = (SELECT id FROM players WHERE gsis_id = EXCLUDED.gsis_id LIMIT 1),
                player_display_name = EXCLUDED.player_display_name,
                player_position = EXCLUDED.player_position,
                team_abbr = EXCLUDED.team_abbr,
                targets = EXCLUDED.targets,
                receptions = EXCLUDED.receptions,
                yards = EXCLUDED.yards,
                rec_touchdowns = EXCLUDED.rec_touchdowns,
                avg_cushion = EXCLUDED.avg_cushion,
                avg_separation = EXCLUDED.avg_separation,
                avg_intended_air_yards = EXCLUDED.avg_intended_air_yards,
                percent_share_of_intended_air_yards = EXCLUDED.percent_share_of_intended_air_yards,
                avg_yac = EXCLUDED.avg_yac,
                avg_expected_yac = EXCLUDED.avg_expected_yac,
                avg_yac_above_expectation = EXCLUDED.avg_yac_above_expectation,
                catch_percentage = EXCLUDED.catch_percentage,
                player_gsis_id = EXCLUDED.player_gsis_id,
                player_first_name = EXCLUDED.player_first_name,
                player_last_name = EXCLUDED.player_last_name,
                player_jersey_number = EXCLUDED.player_jersey_number,
                player_short_name = EXCLUDED.player_short_name
            """
        elif stat_type == 'rushing':
            table_name = 'player_ngs_rushing'
            insert_sql = f"""
            INSERT INTO {table_name} (
                gsis_id, player_id, season, season_type, week, player_display_name, 
                player_position, team_abbr, rush_attempts, rush_yards, rush_touchdowns, 
                avg_rush_yards, expected_rush_yards, rush_yards_over_expected, 
                avg_time_to_los, percent_attempts_gte_eight_defenders, efficiency,
                rush_yards_over_expected_per_att, rush_pct_over_expected,
                player_gsis_id, player_first_name, player_last_name, player_jersey_number, player_short_name
            ) VALUES (
                %(player_gsis_id)s, 
                (SELECT id FROM players WHERE gsis_id = %(player_gsis_id)s LIMIT 1),
                %(season)s, %(season_type)s, %(week)s, %(player_display_name)s,
                %(player_position)s, %(team_abbr)s, %(rush_attempts)s, %(rush_yards)s, %(rush_touchdowns)s,
                %(avg_rush_yards)s, %(expected_rush_yards)s, %(rush_yards_over_expected)s,
                %(avg_time_to_los)s, %(percent_attempts_gte_eight_defenders)s, %(efficiency)s,
                %(rush_yards_over_expected_per_att)s, %(rush_pct_over_expected)s,
                %(player_gsis_id)s, %(player_first_name)s, %(player_last_name)s, %(player_jersey_number)s, %(player_short_name)s
            )
            ON CONFLICT (gsis_id, season, season_type, week) 
            DO UPDATE SET
                player_id = (SELECT id FROM players WHERE gsis_id = EXCLUDED.gsis_id LIMIT 1),
                player_display_name = EXCLUDED.player_display_name,
                player_position = EXCLUDED.player_position,
                team_abbr = EXCLUDED.team_abbr,
                rush_attempts = EXCLUDED.rush_attempts,
                rush_yards = EXCLUDED.rush_yards,
                rush_touchdowns = EXCLUDED.rush_touchdowns,
                avg_rush_yards = EXCLUDED.avg_rush_yards,
                expected_rush_yards = EXCLUDED.expected_rush_yards,
                rush_yards_over_expected = EXCLUDED.rush_yards_over_expected,
                avg_time_to_los = EXCLUDED.avg_time_to_los,
                percent_attempts_gte_eight_defenders = EXCLUDED.percent_attempts_gte_eight_defenders,
                efficiency = EXCLUDED.efficiency,
                rush_yards_over_expected_per_att = EXCLUDED.rush_yards_over_expected_per_att,
                rush_pct_over_expected = EXCLUDED.rush_pct_over_expected,
                player_gsis_id = EXCLUDED.player_gsis_id,
                player_first_name = EXCLUDED.player_first_name,
                player_last_name = EXCLUDED.player_last_name,
                player_jersey_number = EXCLUDED.player_jersey_number,
                player_short_name = EXCLUDED.player_short_name
            """
        
        inserted_count = 0
        
        for index, row in ngs_data.iterrows():
            try:
                row_data = {col: None if pd.isna(row.get(col)) else row.get(col) for col in ngs_data.columns}
                cursor.execute(insert_sql, row_data)
                inserted_count += 1
                
                if index % 500 == 0:
                    print(f"  Processed {index} NGS {stat_type} records...")
                    
            except Exception as e:
                print(f"Error inserting NGS {stat_type} row {index}: {e}")
                continue
        
        conn.commit()
        print(f"Imported {inserted_count} NGS {stat_type} records")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error importing NGS {stat_type} stats: {e}")
        return False

def main():
    """Main function to import all historical data"""
    print("FFAngles Historical NFL Data Import")
    print("=" * 50)
    
    # Define years to import (start with recent years, expand as needed)
    # nfl_data_py typically has data from 1999 onwards, but NGS data starts around 2016
    years_full = list(range(2016, 2025))  # 2016-2024 for all data types
    years_ngs = list(range(2016, 2025))   # NGS data typically available from 2016
    
    print(f"Importing data for years: {years_full}")
    print(f"NGS data for years: {years_ngs}")
    
    # Import all data types
    success_count = 0
    total_imports = 6
    
    print("\n1. Importing games data...")
    if import_games(years_full):
        success_count += 1
    
    print("\n2. Importing player seasonal stats...")
    if import_player_seasonal_stats(years_full):
        success_count += 1
    
    print("\n3. Importing player weekly stats...")
    if import_player_weekly_stats(years_full):
        success_count += 1
    
    print("\n4. Importing NGS passing stats...")
    if import_ngs_stats(years_ngs, 'passing'):
        success_count += 1
    
    print("\n5. Importing NGS receiving stats...")
    if import_ngs_stats(years_ngs, 'receiving'):
        success_count += 1
    
    print("\n6. Importing NGS rushing stats...")
    if import_ngs_stats(years_ngs, 'rushing'):
        success_count += 1
    
    print("\n" + "=" * 50)
    print(f"Historical import completed: {success_count}/{total_imports} successful")
    
    if success_count == total_imports:
        print("All historical data imported successfully!")
    else:
        print(f"Some imports failed. Check the logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()