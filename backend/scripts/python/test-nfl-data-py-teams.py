#!/usr/bin/env python3
"""
Test if nfl_data_py has comprehensive teams data
"""

import nfl_data_py as nfl
import pandas as pd

def test_team_functions():
    """Test what team-related functions are available"""
    print("Testing nfl_data_py for teams data...")
    
    # Test team functions
    team_functions = [
        'import_team_desc',
        'import_teams',
        'import_schedules'
    ]
    
    for func_name in team_functions:
        if hasattr(nfl, func_name):
            print(f"\n[YES] {func_name} - Available")
            try:
                if func_name == 'import_team_desc':
                    # This one doesn't take years parameter
                    data = getattr(nfl, func_name)()
                else:
                    # Try with years parameter
                    data = getattr(nfl, func_name)(years=[2024])
                    
                print(f"  - Data: {len(data)} records")
                if len(data) > 0:
                    print(f"  - Columns: {list(data.columns)}")
                    print(f"  - Sample record: {data.iloc[0].to_dict()}")
                    
                    # Save sample for review
                    data.head(3).to_json(f'./data/{func_name}_sample.json', orient='records', indent=2)
                    print(f"  - Sample saved: ./data/{func_name}_sample.json")
                    
            except Exception as e:
                print(f"  - Error: {e}")
        else:
            print(f"[NO] {func_name} - Not available")

def test_rosters_positions():
    """Test what positions are available in rosters"""
    print("\n" + "="*50)
    print("Testing roster positions...")
    
    try:
        rosters = nfl.import_seasonal_rosters(years=[2024])
        
        # Check unique positions
        positions = rosters['position'].value_counts()
        print(f"\nPositions in 2024 rosters:")
        for pos, count in positions.items():
            print(f"  {pos}: {count} players")
            
        # Filter for fantasy positions
        fantasy_positions = ['QB', 'RB', 'WR', 'TE', 'K']
        fantasy_players = rosters[rosters['position'].isin(fantasy_positions)]
        
        print(f"\nFantasy-relevant players: {len(fantasy_players)}/{len(rosters)} total")
        fantasy_pos_counts = fantasy_players['position'].value_counts()
        for pos, count in fantasy_pos_counts.items():
            print(f"  {pos}: {count} players")
            
        # Check for GSIS IDs in this data
        gsis_count = fantasy_players['player_id'].notna().sum()
        print(f"\nPlayers with GSIS IDs: {gsis_count}/{len(fantasy_players)} ({gsis_count/len(fantasy_players)*100:.1f}%)")
        
        # Show sample fantasy players
        sample_fantasy = fantasy_players.head(5)[['player_name', 'position', 'team', 'player_id', 'espn_id', 'sleeper_id']]
        print(f"\nSample fantasy players:")
        print(sample_fantasy.to_string(index=False))
        
    except Exception as e:
        print(f"Error testing rosters: {e}")

if __name__ == "__main__":
    test_team_functions()
    test_rosters_positions()