#!/usr/bin/env python3
"""
Comprehensive nightly update script for FFAngles
Updates teams, players, games, and all player statistics

TODO for 2025 Season:
1. Add weekly fantasy projections import using cross-platform IDs
   - ESPN projections API (using espn_id)
   - Yahoo projections (using yahoo_id) 
   - Sleeper projections (using sleeper_id)
   - FantasyPros projections (using fantasy_data_id)
   - Store in player_projections table with week, season, projection_type, points

2. Add player props import from The Odds API
   - Passing props (yards, TDs, completions, etc.)
   - Rushing props (yards, TDs, attempts, etc.)
   - Receiving props (yards, TDs, receptions, etc.)
   - Store in player_props table with game_id, player_id, prop_type, line, odds
   - Update nightly during season when props are live

3. Add injury reports import
   - ESPN injury API or similar
   - Store current injury status for lineup decisions

4. Add depth chart positions
   - Track starter vs backup status
   - Useful for waiver wire and lineup decisions
"""

import os
import sys
import psycopg2
import nfl_data_py as nfl
import pandas as pd
from datetime import datetime, date
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

def update_teams():
    """Update teams table with current data"""
    print("Updating teams table...")
    
    try:
        # Get current team data
        teams_data = nfl.import_team_desc()
        print(f"Retrieved {len(teams_data)} teams")
        
        # Exclude old/defunct team abbreviations
        excluded_teams = ['SD', 'LA', 'STL', 'OAK']
        teams_data = teams_data[~teams_data['team_abbr'].isin(excluded_teams)]
        print(f"Filtered out old team abbreviations: {len(teams_data)} teams")
        
        if len(teams_data) == 0:
            print("No team data found")
            return True
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Show current team count
        cursor.execute("SELECT COUNT(*) FROM teams")
        current_count = cursor.fetchone()[0]
        print(f"Current teams in database: {current_count}")
        
        # Upsert teams
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
        
        for index, row in teams_data.iterrows():
            try:
                row_data = {col: None if pd.isna(row.get(col)) else row.get(col) for col in teams_data.columns}
                cursor.execute(upsert_sql, row_data)
                updated_count += 1
            except Exception as e:
                print(f"Error upserting team {index}: {e}")
                continue
        
        conn.commit()
        print(f"Updated/inserted {updated_count} teams")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error updating teams: {e}")
        return False

def update_players():
    """Update players table with current data and cross-platform IDs"""
    print("Updating players table...")
    
    try:
        # Get current player data
        players_data = nfl.import_players()
        print(f"Retrieved {len(players_data)} players")
        
        # Get cross-platform IDs
        ids_data = nfl.import_ids()
        print(f"Retrieved {len(ids_data)} player ID records")
        
        # Merge player data with IDs
        players_data = players_data.merge(
            ids_data[['gsis_id', 'espn_id', 'yahoo_id', 'sleeper_id', 'fantasy_data_id', 'rotowire_id', 'pff_id', 'pfr_id']],
            on='gsis_id', 
            how='left'
        )
        print(f"Merged player data with cross-platform IDs")
        
        # Filter to fantasy positions only
        fantasy_positions = ['QB', 'RB', 'WR', 'TE', 'K']
        players_data = players_data[players_data['position'].isin(fantasy_positions)]
        print(f"Filtered to fantasy positions: {len(players_data)} players")
        
        # Exclude old/defunct team abbreviations
        excluded_teams = ['SD', 'LA', 'STL', 'OAK']
        players_data = players_data[~players_data['team_abbr'].isin(excluded_teams)]
        print(f"Filtered out old team abbreviations: {len(players_data)} players")
        
        # Handle players without GSIS IDs
        missing_gsis = players_data['gsis_id'].isna() | (players_data['gsis_id'] == '')
        missing_count = missing_gsis.sum()
        print(f"Found {missing_count} players without GSIS IDs (likely rookies/practice squad)")
        
        if missing_count > 0:
            placeholder_ids = []
            for idx, row in players_data[missing_gsis].iterrows():
                if pd.notna(row.get('esb_id')) and row.get('esb_id') != '':
                    placeholder_id = f"TEMP-{row['esb_id']}"
                else:
                    first = str(row.get('first_name', '')).replace(' ', '').replace("'", '')[:10]
                    last = str(row.get('last_name', '')).replace(' ', '').replace("'", '')[:10]
                    team = str(row.get('team_abbr', 'UNK'))[:3]
                    placeholder_id = f"TEMP-{first}-{last}-{team}"
                placeholder_ids.append(placeholder_id)
            
            players_data.loc[missing_gsis, 'gsis_id'] = placeholder_ids
            print(f"Generated placeholder GSIS IDs for {missing_count} players")
        
        if len(players_data) == 0:
            print("No player data found")
            return True
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Show current player count
        cursor.execute("SELECT COUNT(*) FROM players")
        current_count = cursor.fetchone()[0]
        print(f"Current players in database: {current_count}")
        
        # Upsert players with cross-platform IDs
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
        
        for index, row in players_data.iterrows():
            try:
                # Handle data types
                row_data = {}
                for col in players_data.columns:
                    value = row.get(col)
                    if pd.isna(value):
                        row_data[col] = None
                    elif col in ['jersey_number', 'weight', 'years_of_experience', 'entry_year', 'rookie_year', 'draft_number', 'espn_id', 'yahoo_id', 'sleeper_id', 'fantasy_data_id', 'rotowire_id', 'pff_id', 'pfr_id']:
                        try:
                            row_data[col] = int(value) if value is not None else None
                        except (ValueError, TypeError):
                            row_data[col] = None
                    elif col in ['height']:
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
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error updating players: {e}")
        return False

def update_games(current_season=2025):
    """Update games table with current season data"""
    print(f"Updating games table for {current_season} season...")
    
    try:
        # Get current season schedule
        schedules = nfl.import_schedules([current_season])
        print(f"Retrieved {len(schedules)} games")
        
        if len(schedules) == 0:
            print("No games data found")
            return True
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Show current game count
        cursor.execute("SELECT COUNT(*) FROM games WHERE season = %s", (current_season,))
        current_count = cursor.fetchone()[0]
        print(f"Current games in database for {current_season}: {current_count}")
        
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
            overtime = EXCLUDED.overtime,
            away_moneyline = EXCLUDED.away_moneyline,
            home_moneyline = EXCLUDED.home_moneyline,
            spread_line = EXCLUDED.spread_line,
            away_spread_odds = EXCLUDED.away_spread_odds,
            home_spread_odds = EXCLUDED.home_spread_odds,
            total_line = EXCLUDED.total_line,
            under_odds = EXCLUDED.under_odds,
            over_odds = EXCLUDED.over_odds
        """
        
        inserted_count = 0
        
        for index, row in schedules.iterrows():
            try:
                # Handle data types
                row_data = {}
                for col in schedules.columns:
                    value = row.get(col)
                    if pd.isna(value):
                        row_data[col] = None
                    elif col in ['gsis', 'nfl_detail_id', 'pff', 'espn', 'ftn', 'old_game_id']:
                        # Handle bigint columns
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
                conn.rollback()
                continue
        
        conn.commit()
        print(f"Imported {inserted_count} games")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error updating games: {e}")
        return False

def update_player_stats(current_season=2025):
    """Update all player statistics tables"""
    print(f"Updating player statistics for {current_season} season...")
    
    success_count = 0
    
    # Update seasonal stats
    if update_seasonal_stats(current_season):
        success_count += 1
    
    # Update weekly stats
    if update_weekly_stats(current_season):
        success_count += 1
    
    # Update NGS stats
    if update_ngs_stats(current_season, 'passing'):
        success_count += 1
    
    if update_ngs_stats(current_season, 'receiving'):
        success_count += 1
    
    if update_ngs_stats(current_season, 'rushing'):
        success_count += 1
    
    print(f"Player stats update completed: {success_count}/5 successful")
    return success_count >= 4  # Allow 1 failure

def update_seasonal_stats(current_season):
    """Update seasonal player statistics"""
    print(f"  Updating seasonal stats for {current_season}...")
    
    try:
        seasonal_data = nfl.import_seasonal_data([current_season])
        print(f"  Retrieved {len(seasonal_data)} seasonal records")
        
        if len(seasonal_data) == 0:
            return True
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Use existing seasonal stats insert logic
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
                # Handle data types
                row_data = {}
                for col in seasonal_data.columns:
                    value = row.get(col)
                    if pd.isna(value):
                        row_data[col] = None
                    elif col == 'games':
                        try:
                            row_data[col] = int(value) if value is not None else None
                        except (ValueError, TypeError):
                            row_data[col] = None
                    else:
                        row_data[col] = value
                
                cursor.execute(insert_sql, row_data)
                inserted_count += 1
                
            except Exception as e:
                print(f"    Error inserting seasonal row {index}: {e}")
                continue
        
        conn.commit()
        print(f"  Imported {inserted_count} seasonal stat records")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"  Error updating seasonal stats: {e}")
        return False

def update_weekly_stats(current_season):
    """Update weekly player statistics"""
    print(f"  Updating weekly stats for {current_season}...")
    
    try:
        weekly_data = nfl.import_weekly_data(years=[current_season])
        print(f"  Retrieved {len(weekly_data)} weekly records")
        
        if len(weekly_data) == 0:
            return True
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Use existing weekly stats insert logic
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
                # Handle data types
                row_data = {}
                for col in weekly_data.columns:
                    value = row.get(col)
                    if pd.isna(value):
                        row_data[col] = None
                    else:
                        row_data[col] = value
                
                cursor.execute(insert_sql, row_data)
                inserted_count += 1
                
            except Exception as e:
                print(f"    Error inserting weekly row {index}: {e}")
                continue
        
        conn.commit()
        print(f"  Imported {inserted_count} weekly stat records")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"  Error updating weekly stats: {e}")
        return False

def update_ngs_stats(current_season, stat_type):
    """Update NGS statistics for specified stat type"""
    print(f"  Updating NGS {stat_type} stats for {current_season}...")
    
    try:
        ngs_data = nfl.import_ngs_data(years=[current_season], stat_type=stat_type)
        print(f"  Retrieved {len(ngs_data)} NGS {stat_type} records")
        
        if len(ngs_data) == 0:
            return True
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Use existing NGS insert logic based on stat type
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
                
            except Exception as e:
                print(f"    Error inserting NGS {stat_type} row {index}: {e}")
                continue
        
        conn.commit()
        print(f"  Imported {inserted_count} NGS {stat_type} records")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"  Error updating NGS {stat_type} stats: {e}")
        return False

def update_fantasy_projections(current_season):
    """
    TODO: Add fantasy projections import for 2025 season
    This function should:
    1. Fetch projections from multiple sources using cross-platform IDs
    2. Store in player_projections table
    3. Update weekly during season
    """
    print(f"  Updating fantasy projections for {current_season}...")
    print("  TODO: Implement fantasy projections import using cross-platform IDs")
    print("  - ESPN API (espn_id)")
    print("  - Yahoo API (yahoo_id)")
    print("  - Sleeper API (sleeper_id)")
    print("  - FantasyPros API (fantasy_data_id)")
    return True

def update_player_props(current_season):
    """
    TODO: Add player props import from The Odds API for 2025 season
    This function should:
    1. Fetch player props from The Odds API
    2. Store in player_props table
    3. Update multiple times daily during season
    """
    print(f"  Updating player props for {current_season}...")
    print("  TODO: Implement player props import from The Odds API")
    print("  - Passing props (yards, TDs, completions)")
    print("  - Rushing props (yards, TDs, attempts)")
    print("  - Receiving props (yards, TDs, receptions)")
    return True

def update_injury_reports(current_season):
    """
    TODO: Add injury reports import for 2025 season
    This function should:
    1. Fetch current injury reports
    2. Store in player_injuries table
    3. Update daily during season
    """
    print(f"  Updating injury reports for {current_season}...")
    print("  TODO: Implement injury reports import")
    print("  - ESPN injury API or similar")
    print("  - Store current injury status")
    return True

def main():
    """Main function for nightly update"""
    print("FFAngles Nightly Update Script")
    print("=" * 50)
    print(f"Update started at: {datetime.now()}")
    
    # Get current season (you can make this configurable)
    current_season = 2025
    
    success_count = 0
    total_updates = 4  # Will be 7 when TODO items are implemented
    
    print(f"\nUpdating data for {current_season} season...")
    
    print("\n1. Updating teams...")
    if update_teams():
        success_count += 1
    
    print("\n2. Updating players...")
    if update_players():
        success_count += 1
    
    print(f"\n3. Updating games for {current_season}...")
    if update_games(current_season):
        success_count += 1
    
    print(f"\n4. Updating player statistics for {current_season}...")
    if update_player_stats(current_season):
        success_count += 1
    
    # TODO: Uncomment these when implemented for 2025 season
    # print(f"\n5. Updating fantasy projections for {current_season}...")
    # if update_fantasy_projections(current_season):
    #     success_count += 1
    
    # print(f"\n6. Updating player props for {current_season}...")
    # if update_player_props(current_season):
    #     success_count += 1
    
    # print(f"\n7. Updating injury reports for {current_season}...")
    # if update_injury_reports(current_season):
    #     success_count += 1
    
    print("\n" + "=" * 50)
    print(f"Nightly update completed: {success_count}/{total_updates} successful")
    print(f"Update finished at: {datetime.now()}")
    
    if success_count == total_updates:
        print("All updates completed successfully!")
        print("\nTODO for 2025 season:")
        print("- Implement fantasy projections import using cross-platform IDs")
        print("- Implement player props import from The Odds API")
        print("- Implement injury reports import")
        print("- Add depth chart positions tracking")
    else:
        print(f"Some updates failed. Check the logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()