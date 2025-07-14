#!/usr/bin/env python3
"""
Check what all 36 teams are in nfl_data_py
"""

import nfl_data_py as nfl
import pandas as pd

def check_all_teams():
    """Check all teams in nfl_data_py"""
    teams_data = nfl.import_team_desc()
    
    print(f"Total teams: {len(teams_data)}")
    print("\nAll teams:")
    
    # Sort by team abbreviation for easier reading
    teams_sorted = teams_data.sort_values('team_abbr')
    
    for index, row in teams_sorted.iterrows():
        print(f"  {row['team_abbr']}: {row['team_name']} ({row['team_conf']} {row['team_division']})")
    
    # Check for any non-standard teams
    print(f"\nTeam abbreviations:")
    team_abbrs = sorted(teams_data['team_abbr'].tolist())
    print(team_abbrs)
    
    # Standard NFL teams (32)
    standard_nfl_teams = [
        'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 
        'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
        'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
        'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'
    ]
    
    print(f"\nStandard NFL teams: {len(standard_nfl_teams)}")
    
    # Find extra teams
    extra_teams = [team for team in team_abbrs if team not in standard_nfl_teams]
    missing_teams = [team for team in standard_nfl_teams if team not in team_abbrs]
    
    if extra_teams:
        print(f"\nExtra teams (not standard NFL): {extra_teams}")
        for extra in extra_teams:
            team_info = teams_data[teams_data['team_abbr'] == extra].iloc[0]
            print(f"  {extra}: {team_info['team_name']} - {team_info['team_conf']} {team_info['team_division']}")
    
    if missing_teams:
        print(f"\nMissing teams: {missing_teams}")
    
    # Check conferences
    conf_counts = teams_data['team_conf'].value_counts()
    print(f"\nConference distribution:")
    for conf, count in conf_counts.items():
        print(f"  {conf}: {count} teams")

if __name__ == "__main__":
    check_all_teams()