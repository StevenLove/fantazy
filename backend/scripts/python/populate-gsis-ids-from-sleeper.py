#!/usr/bin/env python3
"""
Populate gsis_id column in players table using Sleeper API mapping
"""

import os
import sys
import psycopg2
import requests
import json
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

def fetch_sleeper_players():
    """Fetch all players from Sleeper API"""
    print("Fetching players from Sleeper API...")
    
    try:
        response = requests.get('https://api.sleeper.app/v1/players/nfl', timeout=30)
        response.raise_for_status()
        
        players_data = response.json()
        print(f"Fetched {len(players_data)} players from Sleeper API")
        
        return players_data
        
    except Exception as e:
        print(f"Error fetching Sleeper players: {e}")
        return None

def populate_gsis_ids():
    """Populate GSIS IDs in players table using Sleeper API data"""
    print("Populating GSIS IDs in players table...")
    
    # Fetch Sleeper data
    sleeper_players = fetch_sleeper_players()
    if not sleeper_players:
        return False
    
    # Connect to database
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create mapping of sleeper_bot_id -> gsis_id for active NFL players
    sleeper_gsis_map = {}
    for sleeper_id, player_data in sleeper_players.items():
        if (player_data.get('sport') == 'nfl' and 
            player_data.get('gsis_id') and 
            player_data.get('active')):
            sleeper_gsis_map[sleeper_id] = player_data.get('gsis_id')
    
    print(f"Found {len(sleeper_gsis_map)} active NFL players with GSIS IDs")
    
    # Update players table with GSIS IDs
    update_sql = """
    UPDATE players 
    SET gsis_id = %s 
    WHERE sleeper_bot_id = %s 
    AND gsis_id IS NULL
    """
    
    updated_count = 0
    
    for sleeper_id, gsis_id in sleeper_gsis_map.items():
        try:
            cursor.execute(update_sql, (gsis_id, sleeper_id))
            if cursor.rowcount > 0:
                updated_count += 1
        except Exception as e:
            print(f"Error updating player {sleeper_id}: {e}")
            continue
    
    # Commit transaction
    conn.commit()
    print(f"Updated {updated_count} players with GSIS IDs")
    
    # Show mapping results
    cursor.execute("""
        SELECT 
            COUNT(*) as total_players,
            COUNT(gsis_id) as players_with_gsis,
            ROUND(COUNT(gsis_id) * 100.0 / COUNT(*), 1) as percentage_mapped
        FROM players
    """)
    
    result = cursor.fetchone()
    if result:
        print(f"Players table mapping: {result[1]}/{result[0]} players have GSIS IDs ({result[2]}%)")
    
    # Show sample of updated players - first check what columns exist
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'players' 
        ORDER BY ordinal_position
    """)
    
    columns = [row[0] for row in cursor.fetchall()]
    print(f"\nAvailable columns in players table: {columns}")
    
    # Try to show sample with common column patterns
    try:
        sample_query = """
            SELECT gsis_id, sleeper_bot_id
            FROM players 
            WHERE gsis_id IS NOT NULL
            LIMIT 5
        """
        cursor.execute(sample_query)
        results = cursor.fetchall()
        
        if results:
            print(f"\nSample players with GSIS IDs ({len(results)} records):")
            for row in results:
                print(f"  GSIS: {row[0]}, Sleeper: {row[1]}")
    except Exception as e:
        print(f"Error showing sample: {e}")
    
    cursor.close()
    conn.close()
    return True

def main():
    """Main function"""
    print("GSIS ID Population from Sleeper API")
    print("=" * 40)
    
    success = populate_gsis_ids()
    
    if success:
        print("\nGSIS ID population completed successfully!")
        print("You can now run the nfl_data_py import scripts.")
    else:
        print("\nGSIS ID population failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()