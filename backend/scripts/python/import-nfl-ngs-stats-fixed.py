#!/usr/bin/env python3
"""
Import NFL NGS stats from nfl_data_py with proper foreign key relationships
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

def import_ngs_passing(years=[2024]):
    """Import NGS passing stats with foreign key relationships"""
    print(f"Importing NGS passing stats for {years}")
    
    try:
        # Get data from nfl_data_py
        print("Fetching NGS passing data...")
        ngs_data = nfl.import_ngs_data(stat_type='passing', years=years)
        
        print(f"Retrieved {len(ngs_data)} passing records")
        
        if len(ngs_data) == 0:
            return True
        
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert SQL with proper foreign key
        insert_sql = """
        INSERT INTO player_ngs_passing (
            gsis_id, player_id, season, season_type, week, player_display_name, player_position, team_abbr,
            avg_time_to_throw, avg_completed_air_yards, avg_intended_air_yards, avg_air_yards_differential,
            aggressiveness, max_completed_air_distance, avg_air_yards_to_sticks, attempts,
            pass_yards, pass_touchdowns, interceptions, passer_rating, completion_percentage,
            expected_completion_percentage, completion_percentage_above_expectation, avg_air_distance
        ) VALUES (
            %(player_gsis_id)s,
            (SELECT id FROM players WHERE gsis_id = %(player_gsis_id)s LIMIT 1),
            %(season)s, %(season_type)s, %(week)s, %(player_display_name)s, %(player_position)s, %(team_abbr)s,
            %(avg_time_to_throw)s, %(avg_completed_air_yards)s, %(avg_intended_air_yards)s, %(avg_air_yards_differential)s,
            %(aggressiveness)s, %(max_completed_air_distance)s, %(avg_air_yards_to_sticks)s, %(attempts)s,
            %(pass_yards)s, %(pass_touchdowns)s, %(interceptions)s, %(passer_rating)s, %(completion_percentage)s,
            %(expected_completion_percentage)s, %(completion_percentage_above_expectation)s, %(avg_air_distance)s
        )
        ON CONFLICT (gsis_id, season, season_type, week) 
        DO UPDATE SET
            player_id = (SELECT id FROM players WHERE gsis_id = EXCLUDED.gsis_id LIMIT 1),
            player_display_name = EXCLUDED.player_display_name,
            player_position = EXCLUDED.player_position,
            team_abbr = EXCLUDED.team_abbr,
            avg_time_to_throw = EXCLUDED.avg_time_to_throw,
            avg_completed_air_yards = EXCLUDED.avg_completed_air_yards,
            avg_intended_air_yards = EXCLUDED.avg_intended_air_yards,
            avg_air_yards_differential = EXCLUDED.avg_air_yards_differential,
            aggressiveness = EXCLUDED.aggressiveness,
            max_completed_air_distance = EXCLUDED.max_completed_air_distance,
            avg_air_yards_to_sticks = EXCLUDED.avg_air_yards_to_sticks,
            attempts = EXCLUDED.attempts,
            pass_yards = EXCLUDED.pass_yards,
            pass_touchdowns = EXCLUDED.pass_touchdowns,
            interceptions = EXCLUDED.interceptions,
            passer_rating = EXCLUDED.passer_rating,
            completion_percentage = EXCLUDED.completion_percentage,
            expected_completion_percentage = EXCLUDED.expected_completion_percentage,
            completion_percentage_above_expectation = EXCLUDED.completion_percentage_above_expectation,
            avg_air_distance = EXCLUDED.avg_air_distance
        """
        
        inserted_count = 0
        
        for index, row in ngs_data.iterrows():
            try:
                # Prepare row data, handling NaN values
                row_data = {
                    'player_gsis_id': row.get('player_gsis_id'),
                    'season': row.get('season'),
                    'season_type': row.get('season_type', 'REG'),
                    'week': row.get('week', 0),
                    'player_display_name': row.get('player_display_name'),
                    'player_position': row.get('player_position'),
                    'team_abbr': row.get('team_abbr'),
                    'avg_time_to_throw': None if pd.isna(row.get('avg_time_to_throw')) else row.get('avg_time_to_throw'),
                    'avg_completed_air_yards': None if pd.isna(row.get('avg_completed_air_yards')) else row.get('avg_completed_air_yards'),
                    'avg_intended_air_yards': None if pd.isna(row.get('avg_intended_air_yards')) else row.get('avg_intended_air_yards'),
                    'avg_air_yards_differential': None if pd.isna(row.get('avg_air_yards_differential')) else row.get('avg_air_yards_differential'),
                    'aggressiveness': None if pd.isna(row.get('aggressiveness')) else row.get('aggressiveness'),
                    'max_completed_air_distance': None if pd.isna(row.get('max_completed_air_distance')) else row.get('max_completed_air_distance'),
                    'avg_air_yards_to_sticks': None if pd.isna(row.get('avg_air_yards_to_sticks')) else row.get('avg_air_yards_to_sticks'),
                    'attempts': None if pd.isna(row.get('attempts')) else row.get('attempts'),
                    'pass_yards': None if pd.isna(row.get('pass_yards')) else row.get('pass_yards'),
                    'pass_touchdowns': None if pd.isna(row.get('pass_touchdowns')) else row.get('pass_touchdowns'),
                    'interceptions': None if pd.isna(row.get('interceptions')) else row.get('interceptions'),
                    'passer_rating': None if pd.isna(row.get('passer_rating')) else row.get('passer_rating'),
                    'completion_percentage': None if pd.isna(row.get('completion_percentage')) else row.get('completion_percentage'),
                    'expected_completion_percentage': None if pd.isna(row.get('expected_completion_percentage')) else row.get('expected_completion_percentage'),
                    'completion_percentage_above_expectation': None if pd.isna(row.get('completion_percentage_above_expectation')) else row.get('completion_percentage_above_expectation'),
                    'avg_air_distance': None if pd.isna(row.get('avg_air_distance')) else row.get('avg_air_distance')
                }
                
                # Execute insert
                cursor.execute(insert_sql, row_data)
                inserted_count += 1
                
                if index % 1000 == 0:
                    print(f"  Processed {index} passing records...")
                    
            except Exception as e:
                print(f"Error inserting NGS passing row {index}: {e}")
                continue
        
        # Commit transaction
        conn.commit()
        print(f"Imported {inserted_count} NGS passing records")
        
        # Show mapping success rate
        cursor.execute("""
            SELECT 
                COUNT(*) as total_records,
                COUNT(player_id) as mapped_records,
                ROUND(COUNT(player_id) * 100.0 / COUNT(*), 1) as mapping_percentage
            FROM player_ngs_passing 
            WHERE season = 2024
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"NGS Passing mapping: {result[1]}/{result[0]} records mapped ({result[2]}%)")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error importing NGS passing stats: {e}")
        return False

def import_ngs_receiving(years=[2024]):
    """Import NGS receiving stats with foreign key relationships"""
    print(f"Importing NGS receiving stats for {years}")
    
    try:
        # Get data from nfl_data_py
        print("Fetching NGS receiving data...")
        ngs_data = nfl.import_ngs_data(stat_type='receiving', years=years)
        
        print(f"Retrieved {len(ngs_data)} receiving records")
        
        if len(ngs_data) == 0:
            return True
        
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert SQL with proper foreign key
        insert_sql = """
        INSERT INTO player_ngs_receiving (
            gsis_id, player_id, season, season_type, week, player_display_name, player_position, team_abbr,
            avg_cushion, avg_separation, avg_intended_air_yards, percent_share_of_intended_air_yards,
            receptions, targets, catch_percentage, yards, rec_touchdowns, avg_yac, avg_expected_yac,
            avg_yac_above_expectation
        ) VALUES (
            %(player_gsis_id)s,
            (SELECT id FROM players WHERE gsis_id = %(player_gsis_id)s LIMIT 1),
            %(season)s, %(season_type)s, %(week)s, %(player_display_name)s, %(player_position)s, %(team_abbr)s,
            %(avg_cushion)s, %(avg_separation)s, %(avg_intended_air_yards)s, %(percent_share_of_intended_air_yards)s,
            %(receptions)s, %(targets)s, %(catch_percentage)s, %(yards)s, %(rec_touchdowns)s, %(avg_yac)s, %(avg_expected_yac)s,
            %(avg_yac_above_expectation)s
        )
        ON CONFLICT (gsis_id, season, season_type, week) 
        DO UPDATE SET
            player_id = (SELECT id FROM players WHERE gsis_id = EXCLUDED.gsis_id LIMIT 1),
            player_display_name = EXCLUDED.player_display_name,
            player_position = EXCLUDED.player_position,
            team_abbr = EXCLUDED.team_abbr,
            avg_cushion = EXCLUDED.avg_cushion,
            avg_separation = EXCLUDED.avg_separation,
            avg_intended_air_yards = EXCLUDED.avg_intended_air_yards,
            percent_share_of_intended_air_yards = EXCLUDED.percent_share_of_intended_air_yards,
            receptions = EXCLUDED.receptions,
            targets = EXCLUDED.targets,
            catch_percentage = EXCLUDED.catch_percentage,
            yards = EXCLUDED.yards,
            rec_touchdowns = EXCLUDED.rec_touchdowns,
            avg_yac = EXCLUDED.avg_yac,
            avg_expected_yac = EXCLUDED.avg_expected_yac,
            avg_yac_above_expectation = EXCLUDED.avg_yac_above_expectation
        """
        
        inserted_count = 0
        
        for index, row in ngs_data.iterrows():
            try:
                # Prepare row data, handling NaN values
                row_data = {
                    'player_gsis_id': row.get('player_gsis_id'),
                    'season': row.get('season'),
                    'season_type': row.get('season_type', 'REG'),
                    'week': row.get('week', 0),
                    'player_display_name': row.get('player_display_name'),
                    'player_position': row.get('player_position'),
                    'team_abbr': row.get('team_abbr'),
                    'avg_cushion': None if pd.isna(row.get('avg_cushion')) else row.get('avg_cushion'),
                    'avg_separation': None if pd.isna(row.get('avg_separation')) else row.get('avg_separation'),
                    'avg_intended_air_yards': None if pd.isna(row.get('avg_intended_air_yards')) else row.get('avg_intended_air_yards'),
                    'percent_share_of_intended_air_yards': None if pd.isna(row.get('percent_share_of_intended_air_yards')) else row.get('percent_share_of_intended_air_yards'),
                    'receptions': None if pd.isna(row.get('receptions')) else row.get('receptions'),
                    'targets': None if pd.isna(row.get('targets')) else row.get('targets'),
                    'catch_percentage': None if pd.isna(row.get('catch_percentage')) else row.get('catch_percentage'),
                    'yards': None if pd.isna(row.get('yards')) else row.get('yards'),
                    'rec_touchdowns': None if pd.isna(row.get('rec_touchdowns')) else row.get('rec_touchdowns'),
                    'avg_yac': None if pd.isna(row.get('avg_yac')) else row.get('avg_yac'),
                    'avg_expected_yac': None if pd.isna(row.get('avg_expected_yac')) else row.get('avg_expected_yac'),
                    'avg_yac_above_expectation': None if pd.isna(row.get('avg_yac_above_expectation')) else row.get('avg_yac_above_expectation')
                }
                
                # Execute insert
                cursor.execute(insert_sql, row_data)
                inserted_count += 1
                
                if index % 1000 == 0:
                    print(f"  Processed {index} receiving records...")
                    
            except Exception as e:
                print(f"Error inserting NGS receiving row {index}: {e}")
                continue
        
        # Commit transaction
        conn.commit()
        print(f"Imported {inserted_count} NGS receiving records")
        
        # Show mapping success rate
        cursor.execute("""
            SELECT 
                COUNT(*) as total_records,
                COUNT(player_id) as mapped_records,
                ROUND(COUNT(player_id) * 100.0 / COUNT(*), 1) as mapping_percentage
            FROM player_ngs_receiving 
            WHERE season = 2024
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"NGS Receiving mapping: {result[1]}/{result[0]} records mapped ({result[2]}%)")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error importing NGS receiving stats: {e}")
        return False

def import_ngs_rushing(years=[2024]):
    """Import NGS rushing stats with foreign key relationships"""
    print(f"Importing NGS rushing stats for {years}")
    
    try:
        # Get data from nfl_data_py
        print("Fetching NGS rushing data...")
        ngs_data = nfl.import_ngs_data(stat_type='rushing', years=years)
        
        print(f"Retrieved {len(ngs_data)} rushing records")
        
        if len(ngs_data) == 0:
            return True
        
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert SQL with proper foreign key and all available columns
        insert_sql = """
        INSERT INTO player_ngs_rushing (
            gsis_id, player_id, season, season_type, week, player_display_name, player_position, team_abbr,
            efficiency, percent_attempts_gte_eight_defenders, avg_time_to_los, rush_attempts,
            rush_yards, avg_rush_yards, rush_touchdowns, expected_rush_yards, rush_yards_over_expected,
            rush_yards_over_expected_per_att, rush_pct_over_expected
        ) VALUES (
            %(player_gsis_id)s,
            (SELECT id FROM players WHERE gsis_id = %(player_gsis_id)s LIMIT 1),
            %(season)s, %(season_type)s, %(week)s, %(player_display_name)s, %(player_position)s, %(team_abbr)s,
            %(efficiency)s, %(percent_attempts_gte_eight_defenders)s, %(avg_time_to_los)s, %(rush_attempts)s,
            %(rush_yards)s, %(avg_rush_yards)s, %(rush_touchdowns)s, %(expected_rush_yards)s, %(rush_yards_over_expected)s,
            %(rush_yards_over_expected_per_att)s, %(rush_pct_over_expected)s
        )
        ON CONFLICT (gsis_id, season, season_type, week) 
        DO UPDATE SET
            player_id = (SELECT id FROM players WHERE gsis_id = EXCLUDED.gsis_id LIMIT 1),
            player_display_name = EXCLUDED.player_display_name,
            player_position = EXCLUDED.player_position,
            team_abbr = EXCLUDED.team_abbr,
            efficiency = EXCLUDED.efficiency,
            percent_attempts_gte_eight_defenders = EXCLUDED.percent_attempts_gte_eight_defenders,
            avg_time_to_los = EXCLUDED.avg_time_to_los,
            rush_attempts = EXCLUDED.rush_attempts,
            rush_yards = EXCLUDED.rush_yards,
            avg_rush_yards = EXCLUDED.avg_rush_yards,
            rush_touchdowns = EXCLUDED.rush_touchdowns,
            expected_rush_yards = EXCLUDED.expected_rush_yards,
            rush_yards_over_expected = EXCLUDED.rush_yards_over_expected,
            rush_yards_over_expected_per_att = EXCLUDED.rush_yards_over_expected_per_att,
            rush_pct_over_expected = EXCLUDED.rush_pct_over_expected
        """
        
        inserted_count = 0
        
        for index, row in ngs_data.iterrows():
            try:
                # Prepare row data, handling NaN values
                row_data = {
                    'player_gsis_id': row.get('player_gsis_id'),
                    'season': row.get('season'),
                    'season_type': row.get('season_type', 'REG'),
                    'week': row.get('week', 0),
                    'player_display_name': row.get('player_display_name'),
                    'player_position': row.get('player_position'),
                    'team_abbr': row.get('team_abbr'),
                    'efficiency': None if pd.isna(row.get('efficiency')) else row.get('efficiency'),
                    'percent_attempts_gte_eight_defenders': None if pd.isna(row.get('percent_attempts_gte_eight_defenders')) else row.get('percent_attempts_gte_eight_defenders'),
                    'avg_time_to_los': None if pd.isna(row.get('avg_time_to_los')) else row.get('avg_time_to_los'),
                    'rush_attempts': None if pd.isna(row.get('rush_attempts')) else row.get('rush_attempts'),
                    'rush_yards': None if pd.isna(row.get('rush_yards')) else row.get('rush_yards'),
                    'avg_rush_yards': None if pd.isna(row.get('avg_rush_yards')) else row.get('avg_rush_yards'),
                    'rush_touchdowns': None if pd.isna(row.get('rush_touchdowns')) else row.get('rush_touchdowns'),
                    'expected_rush_yards': None if pd.isna(row.get('expected_rush_yards')) else row.get('expected_rush_yards'),
                    'rush_yards_over_expected': None if pd.isna(row.get('rush_yards_over_expected')) else row.get('rush_yards_over_expected'),
                    'rush_yards_over_expected_per_att': None if pd.isna(row.get('rush_yards_over_expected_per_att')) else row.get('rush_yards_over_expected_per_att'),
                    'rush_pct_over_expected': None if pd.isna(row.get('rush_pct_over_expected')) else row.get('rush_pct_over_expected')
                }
                
                # Execute insert
                cursor.execute(insert_sql, row_data)
                inserted_count += 1
                
                if index % 1000 == 0:
                    print(f"  Processed {index} rushing records...")
                    
            except Exception as e:
                print(f"Error inserting NGS rushing row {index}: {e}")
                continue
        
        # Commit transaction
        conn.commit()
        print(f"Imported {inserted_count} NGS rushing records")
        
        # Show mapping success rate
        cursor.execute("""
            SELECT 
                COUNT(*) as total_records,
                COUNT(player_id) as mapped_records,
                ROUND(COUNT(player_id) * 100.0 / COUNT(*), 1) as mapping_percentage
            FROM player_ngs_rushing 
            WHERE season = 2024
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"NGS Rushing mapping: {result[1]}/{result[0]} records mapped ({result[2]}%)")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error importing NGS rushing stats: {e}")
        return False

def main():
    """Main function"""
    print("NFL NGS Stats Import (Fixed)")
    print("=" * 30)
    
    # Import all three NGS stat types
    success_passing = import_ngs_passing([2024])
    success_receiving = import_ngs_receiving([2024])
    success_rushing = import_ngs_rushing([2024])
    
    if success_passing and success_receiving and success_rushing:
        print("\nAll NGS stats imported successfully!")
    else:
        print("\nSome NGS imports failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()