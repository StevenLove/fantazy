#!/usr/bin/env python3
"""
Import NFL seasonal player statistics from nfl_data_py with proper foreign key relationships
"""

import os
import sys
import psycopg2
import psycopg2.extras
import nfl_data_py as nfl
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
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

def import_seasonal_stats(years=[2024], season_type='REG'):
    """Import seasonal player statistics with proper foreign key relationships"""
    print(f"Importing seasonal stats for {years}, season type: {season_type}")
    
    try:
        # Get data from nfl_data_py
        print("Fetching seasonal data from nfl_data_py...")
        seasonal_data = nfl.import_seasonal_data(years)
        
        print(f"Retrieved {len(seasonal_data)} player records")
        print(f"Columns: {list(seasonal_data.columns)}")
        
        # Filter to regular season if specified
        if 'season_type' in seasonal_data.columns:
            seasonal_data = seasonal_data[seasonal_data['season_type'] == season_type]
            print(f"Filtered to {season_type}: {len(seasonal_data)} records")
        
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Prepare insert statement with gsis_id and player_id foreign key
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
                # Prepare row data, handling NaN values
                row_data = {
                    'player_id': row.get('player_id'),
                    'season': row.get('season'),
                    'season_type': row.get('season_type', season_type),
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
                
                # Execute insert
                cursor.execute(insert_sql, row_data)
                inserted_count += 1
                
                if index % 100 == 0:
                    print(f"  Processed {index} records...")
                    
            except Exception as e:
                print(f"Error inserting seasonal row {index}: {e}")
                continue
        
        # Commit transaction
        conn.commit()
        print(f"Imported {inserted_count} seasonal stat records")
        
        # Show mapping success rate
        cursor.execute("""
            SELECT 
                COUNT(*) as total_records,
                COUNT(player_id) as mapped_records,
                ROUND(COUNT(player_id) * 100.0 / COUNT(*), 1) as mapping_percentage
            FROM player_seasonal_stats 
            WHERE season = 2024
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"Mapping results: {result[1]}/{result[0]} records mapped ({result[2]}%)")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error importing seasonal stats: {e}")
        return False

def main():
    """Main function"""
    print("NFL Seasonal Stats Import (Fixed)")
    print("=" * 35)
    
    success = import_seasonal_stats([2024], 'REG')
    
    if success:
        print("\nSeasonal stats import completed successfully!")
    else:
        print("\nSeasonal stats import failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()