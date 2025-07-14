#!/usr/bin/env python3
"""
Update players and teams tables with 2025 data while preserving primary keys
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

def update_teams_2025():
    """Update teams table with 2025 data"""
    print("Updating teams table with 2025 data...")
    
    try:
        # Get 2025 team data
        teams_2025 = nfl.import_team_desc()
        print(f"Retrieved {len(teams_2025)} teams for 2025")
        
        # Exclude old/defunct team abbreviations
        excluded_teams = ['SD', 'LA', 'STL', 'OAK']
        teams_2025 = teams_2025[~teams_2025['team_abbr'].isin(excluded_teams)]
        print(f"Filtered out old team abbreviations: {len(teams_2025)} teams")
        
        if len(teams_2025) == 0:
            print("No team data found for 2025")
            return True
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Show current team count
        cursor.execute("SELECT COUNT(*) FROM teams")
        current_count = cursor.fetchone()[0]
        print(f"Current teams in database: {current_count}")
        
        # Upsert teams (update if exists, insert if new)
        upsert_sql = """
        INSERT INTO teams (
            team_abbr, team_name, team_id, team_nick, team_conf, team_division,
            team_color, team_color2, team_color3, team_color4, team_logo_wikipedia,
            team_logo_espn, team_wordmark, team_conference_logo, team_league_logo,
            team_logo_squared
        ) VALUES (
            %(team_abbr)s, %(team_name)s, %(team_id)s, %(team_nick)s, %(team_conf)s, %(team_division)s,
            %(team_color)s, %(team_color2)s, %(team_color3)s, %(team_color4)s, %(team_logo_wikipedia)s,
            %(team_logo_espn)s, %(team_wordmark)s, %(team_conference_logo)s, %(team_league_logo)s,
            %(team_logo_squared)s
        )
        ON CONFLICT (team_abbr) 
        DO UPDATE SET
            team_name = EXCLUDED.team_name,
            team_id = EXCLUDED.team_id,
            team_nick = EXCLUDED.team_nick,
            team_conf = EXCLUDED.team_conf,
            team_division = EXCLUDED.team_division,
            team_color = EXCLUDED.team_color,
            team_color2 = EXCLUDED.team_color2,
            team_color3 = EXCLUDED.team_color3,
            team_color4 = EXCLUDED.team_color4,
            team_logo_wikipedia = EXCLUDED.team_logo_wikipedia,
            team_logo_espn = EXCLUDED.team_logo_espn,
            team_wordmark = EXCLUDED.team_wordmark,
            team_conference_logo = EXCLUDED.team_conference_logo,
            team_league_logo = EXCLUDED.team_league_logo,
            team_logo_squared = EXCLUDED.team_logo_squared
        """
        
        updated_count = 0
        
        for index, row in teams_2025.iterrows():
            try:
                # Prepare row data, handling NaN values
                row_data = {col: None if pd.isna(row.get(col)) else row.get(col) for col in teams_2025.columns}
                
                cursor.execute(upsert_sql, row_data)
                updated_count += 1
                
            except Exception as e:
                print(f"Error upserting team {index}: {e}")
                continue
        
        conn.commit()
        print(f"Updated/inserted {updated_count} teams")
        
        # Show final team count
        cursor.execute("SELECT COUNT(*) FROM teams")
        final_count = cursor.fetchone()[0]
        print(f"Final teams in database: {final_count}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error updating teams: {e}")
        return False

def update_players_2025():
    """Update players table with 2025 data"""
    print("Updating players table with 2025 data...")
    
    try:
        # Get 2025 player data
        players_2025 = nfl.import_players()
        print(f"Retrieved {len(players_2025)} players for 2025")
        
        # Get cross-platform IDs
        ids_data = nfl.import_ids()
        print(f"Retrieved {len(ids_data)} player ID records for cross-platform mapping")
        
        # Merge player data with IDs based on gsis_id
        players_2025 = players_2025.merge(
            ids_data[['gsis_id', 'espn_id', 'yahoo_id', 'sleeper_id', 'fantasy_data_id', 'rotowire_id', 'pff_id', 'pfr_id']],
            on='gsis_id', 
            how='left',
            suffixes=('', '_ids')
        )
        print(f"Merged player data with cross-platform IDs")
        
        if len(players_2025) == 0:
            print("No player data found for 2025")
            return True
        
        # Filter to fantasy positions only (QB, RB, WR, TE, K)
        fantasy_positions = ['QB', 'RB', 'WR', 'TE', 'K']
        players_2025 = players_2025[players_2025['position'].isin(fantasy_positions)]
        print(f"Filtered to fantasy positions: {len(players_2025)} players")
        
        # Exclude old/defunct team abbreviations
        excluded_teams = ['SD', 'LA', 'STL', 'OAK']
        players_2025 = players_2025[~players_2025['team_abbr'].isin(excluded_teams)]
        print(f"Filtered out old team abbreviations: {len(players_2025)} players")
        
        # Handle players without GSIS IDs (likely rookies) by creating placeholder IDs
        missing_gsis = players_2025['gsis_id'].isna() | (players_2025['gsis_id'] == '')
        missing_count = missing_gsis.sum()
        print(f"Found {missing_count} players without GSIS IDs (likely rookies/practice squad)")
        
        if missing_count > 0:
            # Create placeholder GSIS IDs for players without them
            # Format: TEMP-{esb_id} or TEMP-{first_name}-{last_name}-{team} if no esb_id
            placeholder_ids = []
            for idx, row in players_2025[missing_gsis].iterrows():
                if pd.notna(row.get('esb_id')) and row.get('esb_id') != '':
                    placeholder_id = f"TEMP-{row['esb_id']}"
                else:
                    # Fallback: use name and team
                    first = str(row.get('first_name', '')).replace(' ', '').replace("'", '')[:10]
                    last = str(row.get('last_name', '')).replace(' ', '').replace("'", '')[:10]
                    team = str(row.get('team_abbr', 'UNK'))[:3]
                    placeholder_id = f"TEMP-{first}-{last}-{team}"
                placeholder_ids.append(placeholder_id)
            
            # Update the dataframe with placeholder IDs
            players_2025.loc[missing_gsis, 'gsis_id'] = placeholder_ids
            print(f"Generated placeholder GSIS IDs for {missing_count} players")
        
        print(f"Total players to process: {len(players_2025)}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Show current player count
        cursor.execute("SELECT COUNT(*) FROM players")
        current_count = cursor.fetchone()[0]
        print(f"Current players in database: {current_count}")
        
        # Upsert players (update if exists, insert if new)
        # Now includes cross-platform IDs from nfl_data_py
        upsert_sql = """
        INSERT INTO players (
            gsis_id, player_name, first_name, last_name, football_name, position,
            team, jersey_number, height, weight, birth_date, college, years_exp,
            entry_year, rookie_year, draft_club, draft_number, status,
            esb_id, gsis_it_id, smart_id, headshot_url, status_description_abbr,
            espn_id, yahoo_id, sleeper_id, fantasy_data_id, rotowire_id, pff_id, pfr_id
        ) VALUES (
            %(gsis_id)s, %(display_name)s, %(first_name)s, %(last_name)s, %(football_name)s, %(position)s,
            %(team_abbr)s, %(jersey_number)s, %(height)s, %(weight)s, %(birth_date)s, %(college_name)s, %(years_of_experience)s,
            %(entry_year)s, %(rookie_year)s, %(draft_club)s, %(draft_number)s, %(status)s,
            %(esb_id)s, %(gsis_it_id)s, %(smart_id)s, %(headshot)s, %(status_description_abbr)s,
            %(espn_id)s, %(yahoo_id)s, %(sleeper_id)s, %(fantasy_data_id)s, %(rotowire_id)s, %(pff_id)s, %(pfr_id)s
        )
        ON CONFLICT (gsis_id) 
        DO UPDATE SET
            player_name = EXCLUDED.player_name,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            football_name = EXCLUDED.football_name,
            position = EXCLUDED.position,
            team = EXCLUDED.team,
            jersey_number = EXCLUDED.jersey_number,
            height = EXCLUDED.height,
            weight = EXCLUDED.weight,
            birth_date = EXCLUDED.birth_date,
            college = EXCLUDED.college,
            years_exp = EXCLUDED.years_exp,
            entry_year = EXCLUDED.entry_year,
            rookie_year = EXCLUDED.rookie_year,
            draft_club = EXCLUDED.draft_club,
            draft_number = EXCLUDED.draft_number,
            status = EXCLUDED.status,
            esb_id = EXCLUDED.esb_id,
            gsis_it_id = EXCLUDED.gsis_it_id,
            smart_id = EXCLUDED.smart_id,
            headshot_url = EXCLUDED.headshot_url,
            status_description_abbr = EXCLUDED.status_description_abbr,
            espn_id = EXCLUDED.espn_id,
            yahoo_id = EXCLUDED.yahoo_id,
            sleeper_id = EXCLUDED.sleeper_id,
            fantasy_data_id = EXCLUDED.fantasy_data_id,
            rotowire_id = EXCLUDED.rotowire_id,
            pff_id = EXCLUDED.pff_id,
            pfr_id = EXCLUDED.pfr_id
        """
        
        updated_count = 0
        
        for index, row in players_2025.iterrows():
            try:
                # Prepare row data, handling NaN values and type conversions
                row_data = {}
                for col in players_2025.columns:
                    value = row.get(col)
                    if pd.isna(value):
                        row_data[col] = None
                    elif col in ['jersey_number', 'weight', 'years_of_experience', 'entry_year', 'rookie_year', 'draft_number', 'espn_id', 'yahoo_id', 'sleeper_id', 'fantasy_data_id', 'rotowire_id', 'pff_id', 'pfr_id']:
                        # Handle integer columns
                        try:
                            row_data[col] = int(value) if value is not None else None
                        except (ValueError, TypeError):
                            row_data[col] = None
                    elif col in ['height']:
                        # Handle decimal columns
                        try:
                            row_data[col] = float(value) if value is not None else None
                        except (ValueError, TypeError):
                            row_data[col] = None
                    else:
                        row_data[col] = value
                
                cursor.execute(upsert_sql, row_data)
                updated_count += 1
                
                if index % 100 == 0:
                    print(f"  Processed {index} players...")
                    
            except Exception as e:
                print(f"Error upserting player {index}: {e}")
                continue
        
        conn.commit()
        print(f"Updated/inserted {updated_count} players")
        
        # Show final player count
        cursor.execute("SELECT COUNT(*) FROM players")
        final_count = cursor.fetchone()[0]
        print(f"Final players in database: {final_count}")
        
        # Show breakdown by position
        cursor.execute("""
            SELECT position, COUNT(*) as count 
            FROM players 
            GROUP BY position 
            ORDER BY count DESC
        """)
        
        position_counts = cursor.fetchall()
        print("\nPlayer breakdown by position:")
        for pos, count in position_counts:
            print(f"  {pos}: {count}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error updating players: {e}")
        return False


def main():
    """Main function to update players and teams with 2025 data"""
    print("FFAngles 2025 Players/Teams Update")
    print("=" * 40)
    
    success_count = 0
    total_updates = 2
    
    print("\n1. Updating teams table...")
    if update_teams_2025():
        success_count += 1
    
    print("\n2. Updating players table...")
    if update_players_2025():
        success_count += 1
    
    print("\n" + "=" * 40)
    print(f"2025 update completed: {success_count}/{total_updates} successful")
    
    if success_count == total_updates:
        print("All 2025 data updated successfully!")
        print("\nNext steps:")
        print("1. Later in the season, update placeholder GSIS IDs with real ones")
        print("2. Cross-platform IDs have been updated from nfl_data_py")
    else:
        print(f"Some updates failed. Check the logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()