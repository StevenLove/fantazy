#!/usr/bin/env python3
"""
Test if nfl_data_py has a players endpoint/function
"""

import nfl_data_py as nfl
import pandas as pd

def test_player_functions():
    """Test what player-related functions are available"""
    print("Testing nfl_data_py for player endpoints...")
    
    # Check all available functions
    all_functions = [func for func in dir(nfl) if func.startswith('import_')]
    print(f"\nAll import functions: {all_functions}")
    
    # Test specific player-related functions
    player_functions = [
        'import_players',
        'import_rosters', 
        'import_player_ids',
        'import_ids',
        'import_seasonal_rosters',
        'import_weekly_rosters'
    ]
    
    for func_name in player_functions:
        if hasattr(nfl, func_name):
            print(f"\n[YES] {func_name} - Available")
            try:
                # Test with 2024 data
                data = getattr(nfl, func_name)(years=[2024])
                print(f"  - 2024 data: {len(data)} records")
                if len(data) > 0:
                    print(f"  - Columns: {list(data.columns)}")
                    print(f"  - Sample record: {data.iloc[0].to_dict()}")
            except Exception as e:
                print(f"  - Error: {e}")
        else:
            print(f"[NO] {func_name} - Not available")

if __name__ == "__main__":
    test_player_functions()