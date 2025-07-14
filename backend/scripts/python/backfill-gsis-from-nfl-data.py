#!/usr/bin/env python3
"""
Backfill missing GSIS IDs in players table using data from nfl_data_py tables
"""

import os
import sys
import psycopg2
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

def backfill_gsis_ids():
    """Backfill GSIS IDs using player names from nfl_data_py tables"""
    print("Backfilling GSIS IDs from nfl_data_py tables...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get unique GSIS IDs and player names from all nfl_data_py tables
    nfl_data_tables = [
        'player_seasonal_stats',
        'player_ngs_passing', 
        'player_ngs_receiving',
        'player_ngs_rushing',
        'player_weekly_stats'
    ]
    
    gsis_player_map = {}
    
    for table in nfl_data_tables:
        try:
            # Check if table exists and has the expected columns
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '{table}'
                AND column_name IN ('gsis_id', 'player_display_name', 'player_name')
            """)
            
            available_columns = [row[0] for row in cursor.fetchall()]
            
            if 'gsis_id' not in available_columns:
                print(f"  Skipping {table} - no gsis_id column")
                continue
                
            # Determine which name column to use
            name_column = None
            if 'player_display_name' in available_columns:
                name_column = 'player_display_name'
            elif 'player_name' in available_columns:
                name_column = 'player_name'
            
            if not name_column:
                print(f"  Skipping {table} - no name column found")
                continue
                
            # Extract GSIS ID and name pairs
            cursor.execute(f"""
                SELECT DISTINCT gsis_id, {name_column}
                FROM {table}
                WHERE gsis_id IS NOT NULL 
                AND {name_column} IS NOT NULL
                AND gsis_id != ''
                AND {name_column} != ''
            """)
            
            results = cursor.fetchall()
            for gsis_id, player_name in results:
                if gsis_id and player_name:
                    # Clean up player name for better matching
                    clean_name = player_name.strip()
                    gsis_player_map[gsis_id] = clean_name
            
            print(f"  Found {len(results)} GSIS/name pairs in {table}")
            
        except Exception as e:
            print(f"  Error processing {table}: {e}")
            continue
    
    print(f"\nTotal unique GSIS IDs found: {len(gsis_player_map)}")
    
    # Now try to match these with players table using name matching
    updated_count = 0
    
    for gsis_id, nfl_name in gsis_player_map.items():
        try:
            # Try different name matching strategies
            name_variants = [
                nfl_name,  # Exact match
                nfl_name.replace('.', ''),  # Remove periods
                nfl_name.replace("'", ""),  # Remove apostrophes  
                nfl_name.replace('-', ' '),  # Replace hyphens with spaces
                nfl_name.replace(' Jr.', ''),  # Remove Jr.
                nfl_name.replace(' Sr.', ''),  # Remove Sr.
                nfl_name.replace(' III', ''),  # Remove III
                nfl_name.replace(' II', ''),   # Remove II
            ]
            
            # Try to find matching player in players table
            for name_variant in name_variants:
                cursor.execute("""
                    UPDATE players 
                    SET gsis_id = %s 
                    WHERE gsis_id IS NULL 
                    AND (
                        long_name ILIKE %s OR
                        short_name ILIKE %s OR
                        first_name || ' ' || last_name ILIKE %s
                    )
                """, (gsis_id, name_variant, name_variant, name_variant))
                
                if cursor.rowcount > 0:
                    updated_count += cursor.rowcount
                    print(f"  Matched '{nfl_name}' -> GSIS: {gsis_id}")
                    break  # Stop trying variants once we find a match
                    
        except Exception as e:
            print(f"  Error matching {nfl_name}: {e}")
            continue
    
    # Commit changes
    conn.commit()
    print(f"\nBackfilled {updated_count} additional GSIS IDs")
    
    # Show updated mapping stats
    cursor.execute("""
        SELECT 
            COUNT(*) as total_players,
            COUNT(gsis_id) as players_with_gsis,
            ROUND(COUNT(gsis_id) * 100.0 / COUNT(*), 1) as percentage_mapped
        FROM players
    """)
    
    result = cursor.fetchone()
    if result:
        print(f"Updated players table mapping: {result[1]}/{result[0]} players have GSIS IDs ({result[2]}%)")
    
    # Check for Jaxon Smith-Njigba specifically
    cursor.execute("""
        SELECT long_name, short_name, gsis_id
        FROM players 
        WHERE (long_name ILIKE '%smith-njigba%' OR short_name ILIKE '%smith-njigba%')
    """)
    
    jsn_results = cursor.fetchall()
    if jsn_results:
        print(f"\nJaxon Smith-Njigba status:")
        for row in jsn_results:
            print(f"  {row[0]} ({row[1]}) - GSIS: {row[2] or 'Not mapped'}")
    
    cursor.close()
    conn.close()
    return True

def main():
    """Main function"""
    print("GSIS ID Backfill from NFL Data Tables")
    print("=" * 40)
    
    success = backfill_gsis_ids()
    
    if success:
        print("\nGSIS ID backfill completed successfully!")
    else:
        print("\nGSIS ID backfill failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()