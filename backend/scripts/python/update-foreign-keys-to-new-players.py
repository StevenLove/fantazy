#!/usr/bin/env python3
"""
Update all foreign key relationships to reference new players table
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

def check_existing_tables():
    """Check which statistical tables exist and their structure"""
    print("Checking existing statistical tables...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check which tables exist
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'player_%'
        ORDER BY table_name
    """)
    
    tables = [row[0] for row in cursor.fetchall()]
    
    print(f"Found {len(tables)} player tables:")
    for table in tables:
        print(f"  - {table}")
    
    # Check column structure for each table
    for table in tables:
        cursor.execute(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '{table}' 
            AND column_name IN ('player_id', 'gsis_id', 'tank01_player_id')
            ORDER BY column_name
        """)
        
        columns = cursor.fetchall()
        if columns:
            print(f"\n{table} relevant columns:")
            for col_name, col_type in columns:
                print(f"    {col_name}: {col_type}")
                
            # Show sample data to understand current state
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"    Records: {count}")
            
            # Check current player_id population (skip for players table itself)
            if table != 'players':
                cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE player_id IS NOT NULL")
                populated = cursor.fetchone()[0]
                print(f"    With player_id: {populated} ({populated/count*100:.1f}%)")
            else:
                print(f"    Primary table (has 'id' as primary key)")
    
    cursor.close()
    conn.close()
    return tables

def update_table_foreign_keys(table_name):
    """Update foreign keys for a specific table"""
    print(f"\nUpdating foreign keys for {table_name}...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if table has gsis_id column
    cursor.execute(f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '{table_name}' 
        AND column_name = 'gsis_id'
    """)
    
    has_gsis = cursor.fetchone() is not None
    
    if not has_gsis:
        print(f"  [SKIP] {table_name} - no gsis_id column")
        cursor.close()
        conn.close()
        return 0
    
    # Update player_id using gsis_id matching
    update_sql = f"""
    UPDATE {table_name} 
    SET player_id = p.id 
    FROM players p 
    WHERE {table_name}.gsis_id = p.gsis_id 
    AND {table_name}.player_id IS NULL
    """
    
    try:
        cursor.execute(update_sql)
        updated_count = cursor.rowcount
        conn.commit()
        
        print(f"  [SUCCESS] Updated {updated_count} records in {table_name}")
        
        # Show final mapping stats
        cursor.execute(f"""
            SELECT 
                COUNT(*) as total,
                COUNT(player_id) as mapped,
                ROUND(COUNT(player_id) * 100.0 / COUNT(*), 1) as percentage
            FROM {table_name}
        """)
        
        total, mapped, percentage = cursor.fetchone()
        print(f"  [STATS] {mapped}/{total} records mapped ({percentage}%)")
        
        cursor.close()
        conn.close()
        return updated_count
        
    except Exception as e:
        print(f"  [ERROR] Failed to update {table_name}: {e}")
        cursor.close()
        conn.close()
        return 0

def add_foreign_key_constraints():
    """Add proper foreign key constraints to all tables"""
    print("\nAdding foreign key constraints...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tables that should have foreign key constraints
    tables_with_fk = [
        'player_seasonal_stats',
        'player_ngs_passing', 
        'player_ngs_receiving',
        'player_ngs_rushing',
        'player_weekly_stats',
        'player_game_logs'
    ]
    
    for table in tables_with_fk:
        try:
            # Check if table exists
            cursor.execute(f"""
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = '{table}'
            """)
            
            if not cursor.fetchone():
                print(f"  [SKIP] {table} - table doesn't exist")
                continue
            
            # Drop existing foreign key constraint if it exists
            cursor.execute(f"""
                ALTER TABLE {table} 
                DROP CONSTRAINT IF EXISTS fk_{table}_player_id
            """)
            
            # Add new foreign key constraint
            cursor.execute(f"""
                ALTER TABLE {table} 
                ADD CONSTRAINT fk_{table}_player_id 
                FOREIGN KEY (player_id) 
                REFERENCES players(id) 
                ON DELETE SET NULL
            """)
            
            print(f"  [SUCCESS] Added foreign key constraint to {table}")
            
        except Exception as e:
            print(f"  [ERROR] Failed to add constraint to {table}: {e}")
            continue
    
    conn.commit()
    cursor.close()
    conn.close()

def verify_mapping_success():
    """Verify the mapping was successful"""
    print("\nVerifying mapping success...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check each table's mapping success
    tables = [
        'player_seasonal_stats',
        'player_ngs_passing',
        'player_ngs_receiving', 
        'player_ngs_rushing',
        'player_weekly_stats'
    ]
    
    total_unmapped = 0
    
    for table in tables:
        try:
            cursor.execute(f"""
                SELECT 
                    COUNT(*) as total,
                    COUNT(player_id) as mapped,
                    COUNT(*) - COUNT(player_id) as unmapped,
                    ROUND(COUNT(player_id) * 100.0 / COUNT(*), 1) as percentage
                FROM {table}
            """)
            
            result = cursor.fetchone()
            if result:
                total, mapped, unmapped, percentage = result
                print(f"  {table}: {mapped}/{total} mapped ({percentage}%) - {unmapped} unmapped")
                total_unmapped += unmapped
                
        except Exception as e:
            print(f"  [ERROR] Could not check {table}: {e}")
    
    print(f"\nTotal unmapped records across all tables: {total_unmapped}")
    
    # Show sample of successfully mapped players
    try:
        cursor.execute("""
            SELECT p.player_name, p.position, p.team, s.fantasy_points_ppr
            FROM players p
            JOIN player_seasonal_stats s ON p.id = s.player_id
            WHERE s.season = 2024
            ORDER BY s.fantasy_points_ppr DESC NULLS LAST
            LIMIT 5
        """)
        
        results = cursor.fetchall()
        if results:
            print("\nTop fantasy performers (proving foreign keys work):")
            for row in results:
                print(f"  {row[0]} ({row[1]}, {row[2]}) - {row[3] or 0} PPR pts")
                
    except Exception as e:
        print(f"  Could not verify with sample query: {e}")
    
    cursor.close()
    conn.close()

def main():
    """Main function"""
    print("Foreign Key Migration to New Players Table")
    print("=" * 45)
    
    # Step 1: Check existing tables
    tables = check_existing_tables()
    
    # Step 2: Update foreign keys for each table
    print(f"\n{'='*45}")
    print("UPDATING FOREIGN KEY RELATIONSHIPS")
    print(f"{'='*45}")
    
    total_updated = 0
    
    for table in tables:
        if table != 'players':  # Skip the players table itself
            updated = update_table_foreign_keys(table)
            total_updated += updated
    
    # Step 3: Add proper foreign key constraints
    add_foreign_key_constraints()
    
    # Step 4: Verify success
    verify_mapping_success()
    
    print(f"\n[SUCCESS] Foreign key migration completed!")
    print(f"Total records updated: {total_updated}")
    print("\nYour nfl_data_py import scripts should now work correctly!")

if __name__ == "__main__":
    main()