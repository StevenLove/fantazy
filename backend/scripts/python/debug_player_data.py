#!/usr/bin/env python3
"""
Debug script to check player data structure and quality in the database.
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def connect_to_db():
    """Connect to PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'ff_angles'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD')
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def check_database_structure():
    """Check what tables and columns exist in the database."""
    conn = connect_to_db()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    print("\n[DATABASE] CHECKING DATABASE STRUCTURE:")
    print("=" * 50)
    
    try:
        # Check what tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print(f"\n[TABLES] Found {len(tables)} tables:")
        for (table_name,) in tables:
            print(f"   - {table_name}")
        
        # Check columns in players table if it exists
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'players'
            ORDER BY ordinal_position
        """)
        
        player_columns = cursor.fetchall()
        if player_columns:
            print(f"\n[PLAYERS] Players table columns:")
            for col_name, data_type in player_columns:
                print(f"   - {col_name} ({data_type})")
        else:
            print(f"\n[PLAYERS] No 'players' table found")
        
        # Check columns in player_weekly_stats table if it exists
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'player_weekly_stats'
            ORDER BY ordinal_position
        """)
        
        weekly_columns = cursor.fetchall()
        if weekly_columns:
            print(f"\n[WEEKLY_STATS] Player weekly stats table columns:")
            for col_name, data_type in weekly_columns:
                print(f"   - {col_name} ({data_type})")
        else:
            print(f"\n[WEEKLY_STATS] No 'player_weekly_stats' table found")
            
    except Exception as e:
        print(f"[ERROR] Error checking database structure: {e}")
    
    finally:
        cursor.close()
        conn.close()

def check_player_data(player_name_filter="brown"):
    """Check data for players matching the filter using actual column names."""
    conn = connect_to_db()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    print(f"\n[DEBUG] PLAYER DATA FOR: '{player_name_filter.upper()}'")
    print("=" * 60)
    
    try:
        # First, find out what the actual column names are
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'players'
            ORDER BY ordinal_position
        """)
        
        columns = [row[0] for row in cursor.fetchall()]
        print(f"\n[COLUMNS] Available columns in players table: {columns}")
        
        if not columns:
            print("[ERROR] Players table not found or has no columns")
            return
        
        # Try to find a name column (could be 'name', 'player_name', 'display_name', etc.)
        name_column = None
        for col in columns:
            if 'name' in col.lower():
                name_column = col
                break
        
        if not name_column:
            print("[ERROR] No name column found in players table")
            return
        
        print(f"[INFO] Using '{name_column}' as name column")
        
        # Now try to query with the correct column name
        query = f"""
            SELECT {', '.join(columns[:5])}
            FROM players 
            WHERE LOWER({name_column}) LIKE %s
            ORDER BY {name_column}
            LIMIT 5
        """
        
        cursor.execute(query, (f'%{player_name_filter.lower()}%',))
        
        players = cursor.fetchall()
        
        if not players:
            print(f"[ERROR] No players found matching '{player_name_filter}'")
            return
        
        print(f"\n[FOUND] {len(players)} PLAYERS:")
        for i, player_data in enumerate(players, 1):
            print(f"{i}. {player_data}")
        
        # Get detailed stats for A.J. Brown specifically
        if any('A.J. Brown' in str(player) for player in players):
            aj_brown = next(player for player in players if 'A.J. Brown' in str(player))
            player_id = aj_brown[0]  # First column is ID
            
            print(f"\n[AJ_BROWN] Checking detailed stats for A.J. Brown (ID: {player_id})")
            print("=" * 50)
            
            # Check his weekly stats for 2024
            cursor.execute("""
                SELECT 
                    week, 
                    receptions, 
                    targets, 
                    receiving_yards, 
                    receiving_tds, 
                    fantasy_points_ppr,
                    opponent_team
                FROM player_weekly_stats 
                WHERE player_id = %s AND season = 2024 
                ORDER BY week DESC 
                LIMIT 10
            """, (player_id,))
            
            aj_stats = cursor.fetchall()
            
            if aj_stats:
                print(f"\n[AJ_BROWN] Last 10 games in 2024:")
                print("   Week | Rec | Tgt | Rec Yds | Rec TDs | Fantasy | Opp")
                print("   -----|-----|-----|---------|---------|---------|-----")
                for week, rec, tgt, rec_yds, rec_tds, fantasy, opp in aj_stats:
                    rec_str = str(rec) if rec is not None else "NULL"
                    tgt_str = str(tgt) if tgt is not None else "NULL"
                    rec_yds_str = str(rec_yds) if rec_yds is not None else "NULL"
                    rec_tds_str = str(rec_tds) if rec_tds is not None else "NULL"
                    fantasy_str = str(round(fantasy, 1)) if fantasy is not None else "NULL"
                    opp_str = opp if opp else "NULL"
                    
                    print(f"   {week:4} | {rec_str:3} | {tgt_str:3} | {rec_yds_str:7} | {rec_tds_str:7} | {fantasy_str:7} | {opp_str:4}")
                
                # Calculate averages manually
                total_rec = sum(rec for rec in [stat[1] for stat in aj_stats] if rec is not None)
                total_games = len([stat for stat in aj_stats if stat[1] is not None])
                avg_rec = total_rec / total_games if total_games > 0 else 0
                
                print(f"\n[AJ_BROWN] Manual calculation:")
                print(f"   Total receptions: {total_rec}")
                print(f"   Games with reception data: {total_games}")
                print(f"   Average receptions per game: {avg_rec:.2f}")
                
            else:
                print(f"[AJ_BROWN] No 2024 weekly stats found!")
                
                # Check if he has any data at all
                cursor.execute("""
                    SELECT season, COUNT(*) 
                    FROM player_weekly_stats 
                    WHERE player_id = %s 
                    GROUP BY season 
                    ORDER BY season DESC
                """, (player_id,))
                
                season_counts = cursor.fetchall()
                print(f"[AJ_BROWN] Data by season: {season_counts}")
            
    except Exception as e:
        print(f"[ERROR] Error checking player data: {e}")
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import sys
    
    # Default to checking players with "brown" in name
    player_filter = "brown"
    
    # Allow command line argument for different player filter
    if len(sys.argv) > 1:
        player_filter = sys.argv[1]
    
    print("FFAngles Player Data Debug Tool")
    print("===============================")
    
    check_database_structure()
    check_player_data(player_filter)
    
    print(f"\n[SUCCESS] Debug complete!")
    print(f"\nUsage: python debug_player_data.py [player_name_filter]")
    print(f"Example: python debug_player_data.py kupp")