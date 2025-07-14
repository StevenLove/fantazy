#!/usr/bin/env python3
"""
Import NFL weekly player stats from nfl_data_py for trends analysis
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

def import_weekly_stats(years=[2024]):
    """Import weekly player stats from nfl_data_py"""
    print(f"Importing weekly player stats for {years}")
    
    try:
        # Get data from nfl_data_py
        print("Fetching weekly player stats...")
        weekly_data = nfl.import_weekly_data(years=years)
        
        print(f"Retrieved {len(weekly_data)} weekly records")
        print(f"Available columns: {list(weekly_data.columns)}")
        
        if len(weekly_data) == 0:
            print("No weekly data found")
            return True
        
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert SQL with proper foreign key
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
        updated_count = 0
        
        for index, row in weekly_data.iterrows():
            try:
                # Prepare row data, handling NaN values
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
                
                # Execute insert/update
                cursor.execute(insert_sql, row_data)
                inserted_count += 1
                
                if index % 1000 == 0:
                    print(f"  Processed {index} records...")
                    
            except Exception as e:
                print(f"Error inserting weekly row {index}: {e}")
                continue
        
        # Commit transaction
        conn.commit()
        print(f"Imported {inserted_count} weekly stat records")
        
        # Show mapping success rate
        cursor.execute("""
            SELECT 
                COUNT(*) as total_records,
                COUNT(player_id) as mapped_records,
                ROUND(COUNT(player_id) * 100.0 / COUNT(*), 1) as mapping_percentage
            FROM player_weekly_stats 
            WHERE season = 2024
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"Weekly stats mapping: {result[1]}/{result[0]} records mapped ({result[2]}%)")
        
        # Show sample of imported data
        cursor.execute("""
            SELECT gsis_id, recent_team, week, passing_yards, rushing_yards, receiving_yards, fantasy_points_ppr
            FROM player_weekly_stats 
            WHERE season = 2024
            ORDER BY fantasy_points_ppr DESC NULLS LAST
            LIMIT 5
        """)
        
        results = cursor.fetchall()
        if results:
            print("\nTop weekly performances (by PPR fantasy points):")
            for row in results:
                print(f"  {row[0]} ({row[1]}) Week {row[2]}: {row[3] or 0} pass, {row[4] or 0} rush, {row[5] or 0} rec, {row[6] or 0} PPR pts")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error importing weekly stats: {e}")
        return False

def main():
    """Main function"""
    print("NFL Weekly Stats Import")
    print("=" * 30)
    
    success = import_weekly_stats([2024])
    
    if success:
        print("\nWeekly stats import completed successfully!")
    else:
        print("\nWeekly stats import failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()