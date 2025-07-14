#!/usr/bin/env python3
"""
Import player ID mappings from nfl_data_py to link GSIS IDs with other platforms
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

def get_nfl_player_ids():
    """Get all player IDs from nfl_data_py"""
    print("Fetching player ID data from nfl_data_py...")
    
    try:
        ids_data = nfl.import_ids()
        print(f"Retrieved {len(ids_data)} player ID records from nfl_data_py")
        
        return ids_data
        
    except Exception as e:
        print(f"Error fetching nfl_data_py IDs: {e}")
        return None

def import_player_mappings():
    """Import player ID mappings into database"""
    
    # Get Sleeper player data
    sleeper_players = get_sleeper_players()
    if not sleeper_players:
        return False
    
    # Connect to database
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Update players table with cross-platform IDs
    update_sql = """
    UPDATE players 
    SET 
        sleeper_id = %(sleeper_id)s,
        espn_id = %(espn_id)s,
        yahoo_id = %(yahoo_id)s,
        fantasy_data_id = %(fantasy_data_id)s,
        rotowire_id = %(rotowire_id)s
    WHERE gsis_id = %(gsis_id)s
    """
    
    inserted_count = 0
    updated_count = 0
    skipped_count = 0
    
    for sleeper_id, player_data in sleeper_players.items():
        try:
            # Only process NFL players with GSIS IDs
            if (player_data.get('sport') != 'nfl' or 
                not player_data.get('gsis_id') or 
                not player_data.get('active')):
                skipped_count += 1
                continue
            
            # Prepare row data
            row_data = {
                'gsis_id': player_data.get('gsis_id'),
                'sleeper_id': sleeper_id,
                'espn_id': str(player_data.get('espn_id')) if player_data.get('espn_id') else None,
                'yahoo_id': str(player_data.get('yahoo_id')) if player_data.get('yahoo_id') else None,
                'fantasy_data_id': str(player_data.get('fantasy_data_id')) if player_data.get('fantasy_data_id') else None,
                'rotowire_id': str(player_data.get('rotowire_id')) if player_data.get('rotowire_id') else None
            }
            
            # Execute update
            cursor.execute(update_sql, row_data)
            
            if cursor.rowcount > 0:
                updated_count += 1
            else:
                skipped_count += 1
                
        except Exception as e:
            print(f"Error processing player {sleeper_id}: {e}")
            continue
    
    # Commit transaction
    conn.commit()
    
    print(f"Player ID Mapping Import Results:")
    print(f"  Inserted: {inserted_count}")
    print(f"  Updated: {updated_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Total processed: {inserted_count + updated_count}")
    
    # Get summary stats
    cursor.execute("""
        SELECT 
            COUNT(*) as total_mappings,
            COUNT(CASE WHEN gsis_id IS NOT NULL THEN 1 END) as with_gsis,
            COUNT(CASE WHEN espn_id IS NOT NULL THEN 1 END) as with_espn,
            COUNT(CASE WHEN tank01_player_id IS NOT NULL THEN 1 END) as with_tank01
        FROM player_id_mapping
    """)
    
    summary = cursor.fetchone()
    if summary:
        print(f"\nDatabase Summary:")
        print(f"  Total player mappings: {summary[0]}")
        print(f"  With GSIS IDs: {summary[1]}")
        print(f"  With ESPN IDs: {summary[2]}")
        print(f"  With Tank01 IDs: {summary[3]}")
    
    cursor.close()
    conn.close()
    
    return True

def main():
    """Main function"""
    print("Player ID Mapping Importer")
    print("=" * 40)
    
    success = import_player_mappings()
    
    if success:
        print("\nImport completed successfully!")
        print("\nNext steps:")
        print("1. Run queries to link Tank01 players to GSIS IDs")
        print("2. Update advanced stats tables to reference player_id_mapping")
    else:
        print("\nImport failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()