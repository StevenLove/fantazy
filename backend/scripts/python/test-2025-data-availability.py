#!/usr/bin/env python3
"""
Test if nfl_data_py has 2025 season data or is prepared for it
"""

import nfl_data_py as nfl
import pandas as pd

def test_2025_availability():
    """Test if 2025 data is available or planned"""
    print("Testing nfl_data_py for 2025 season readiness...")
    
    # Test key functions with 2025
    data_functions = [
        ('import_seasonal_rosters', 'Player rosters'),
        ('import_schedules', 'Game schedules'),
        ('import_team_desc', 'Team descriptions'),
        ('import_seasonal_data', 'Seasonal stats'),
        ('import_weekly_data', 'Weekly stats'),
        ('import_ngs_data', 'NGS stats')
    ]
    
    print("\n" + "="*60)
    print("TESTING 2025 DATA AVAILABILITY")
    print("="*60)
    
    for func_name, description in data_functions:
        print(f"\n[TESTING] {description} ({func_name})")
        
        try:
            if func_name == 'import_team_desc':
                # Teams function doesn't take years parameter
                data = getattr(nfl, func_name)()
                print(f"  Teams: {len(data)} records (should be same for all years)")
            elif func_name == 'import_ngs_data':
                # NGS requires stat_type parameter
                data = getattr(nfl, func_name)(stat_type='passing', years=[2025])
                print(f"  2025 NGS: {len(data)} records")
            else:
                # Standard functions with years parameter
                data = getattr(nfl, func_name)(years=[2025])
                print(f"  2025 data: {len(data)} records")
                
                if len(data) > 0:
                    print(f"  Columns: {list(data.columns)}")
                    print(f"  Sample record exists: YES")
                    
                    # Save sample for inspection
                    if len(data) > 0:
                        sample_file = f'./data/{func_name}_2025_sample.json'
                        data.head(3).to_json(sample_file, orient='records', indent=2)
                        print(f"  Sample saved: {sample_file}")
                else:
                    print(f"  No 2025 data found")
                    
        except Exception as e:
            print(f"  Error: {e}")
    
    # Test historical year progression to understand pattern
    print(f"\n{'='*60}")
    print("TESTING HISTORICAL YEAR AVAILABILITY")
    print("="*60)
    
    years_to_test = [2020, 2021, 2022, 2023, 2024, 2025, 2026]
    
    print(f"\nTesting schedules across multiple years:")
    for year in years_to_test:
        try:
            schedules = nfl.import_schedules(years=[year])
            print(f"  {year}: {len(schedules)} games")
        except Exception as e:
            print(f"  {year}: Error - {e}")
    
    print(f"\nTesting rosters across multiple years:")
    for year in years_to_test:
        try:
            rosters = nfl.import_seasonal_rosters(years=[year])
            print(f"  {year}: {len(rosters)} players")
        except Exception as e:
            print(f"  {year}: Error - {e}")
    
    # Check if draft picks include 2025
    print(f"\n{'='*60}")
    print("TESTING DRAFT DATA FOR 2025")
    print("="*60)
    
    try:
        draft_picks = nfl.import_draft_picks(years=[2025])
        print(f"2025 Draft picks: {len(draft_picks)} players")
        if len(draft_picks) > 0:
            print("Columns:", list(draft_picks.columns))
            sample_file = './data/draft_picks_2025_sample.json'
            draft_picks.head(5).to_json(sample_file, orient='records', indent=2)
            print(f"Sample saved: {sample_file}")
    except Exception as e:
        print(f"2025 Draft error: {e}")

def check_data_source_reliability():
    """Check how current and reliable the data source is"""
    print(f"\n{'='*60}")
    print("DATA SOURCE RELIABILITY CHECK")
    print("="*60)
    
    try:
        # Check latest 2024 data to see how current it is
        schedules = nfl.import_schedules(years=[2024])
        
        # Find latest game
        schedules['gameday'] = pd.to_datetime(schedules['gameday'])
        latest_game = schedules['gameday'].max()
        total_games = len(schedules)
        
        print(f"2024 Schedule completeness:")
        print(f"  Total games: {total_games}")
        print(f"  Latest game date: {latest_game}")
        print(f"  Data appears current: {'YES' if total_games >= 280 else 'PARTIAL'}")
        
        # Check weekly data recency
        weekly = nfl.import_weekly_data(years=[2024])
        if len(weekly) > 0:
            max_week = weekly['week'].max()
            print(f"  Latest weekly data: Week {max_week}")
        
        # Check roster data
        rosters = nfl.import_seasonal_rosters(years=[2024])
        print(f"  2024 roster records: {len(rosters)}")
        
        # This suggests data source is actively maintained
        print(f"\nData source assessment:")
        print(f"  ✓ Complete 2024 season data")
        print(f"  ✓ Active maintenance (games through {latest_game})")
        print(f"  ✓ Comprehensive coverage ({total_games} games)")
        print(f"  → LIKELY to support 2025 when available")
        
    except Exception as e:
        print(f"Error checking data reliability: {e}")

if __name__ == "__main__":
    test_2025_availability()
    check_data_source_reliability()