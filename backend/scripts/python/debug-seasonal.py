#!/usr/bin/env python3
"""
Debug script for nfl_data_py seasonal stats failure
"""

import nfl_data_py as nfl
import pandas as pd

def debug_seasonal_stats():
    """Debug what's going wrong with seasonal stats"""
    print("Debugging seasonal stats...")
    
    try:
        # Try different years to see what's available
        print("\nTesting different years:")
        
        years_to_test = [2023, 2022, 2021, 2020]
        
        for year in years_to_test:
            try:
                print(f"\nTrying year {year}...")
                seasonal_stats = nfl.import_seasonal_data([year])
                print(f"SUCCESS for {year}: {len(seasonal_stats)} records")
                print(f"Columns: {list(seasonal_stats.columns)[:10]}...")  # Just first 10 columns
                
                # Save sample for successful year
                seasonal_stats.head(5).to_json(f'./data/seasonal_{year}_sample.json', orient='records', indent=2)
                print(f"Sample saved to: ./data/seasonal_{year}_sample.json")
                break
                
            except Exception as e:
                print(f"FAILED for {year}: {e}")
        
        # Try with just 2024 again but with more debug info
        print(f"\nTrying 2024 with debug info...")
        try:
            seasonal_stats = nfl.import_seasonal_data([2024])
            print(f"SUCCESS for 2024: {len(seasonal_stats)} records")
        except Exception as e:
            print(f"2024 failed with: {type(e).__name__}: {e}")
            
            # Check if it's a data availability issue
            if "Data not available" in str(e) or "404" in str(e):
                print("Appears to be a data availability issue for 2024")
            elif "parquet" in str(e).lower():
                print("Appears to be a parquet engine issue")
            else:
                print("Unknown error type")
    
    except Exception as e:
        print(f"Overall error: {e}")

def test_what_data_exists():
    """Test what types of data are available"""
    print("\nTesting what data types are available...")
    
    # List of different data import functions
    data_functions = [
        ('import_weekly_data', 'Weekly player data'),
        ('import_pbp_data', 'Play-by-play data'),
        ('import_ngs_data', 'Next-gen stats'),
        ('import_snap_counts', 'Snap counts'),
        ('import_seasonal_rosters', 'Seasonal rosters'),
        ('import_draft_picks', 'Draft picks'),
        ('import_combine_data', 'Combine data')
    ]
    
    for func_name, description in data_functions:
        try:
            if hasattr(nfl, func_name):
                print(f"\nTesting {description}...")
                
                if func_name == 'import_ngs_data':
                    # NGS needs stat_type parameter
                    data = getattr(nfl, func_name)(stat_type='passing', years=[2023])
                else:
                    data = getattr(nfl, func_name)(years=[2023])
                    
                print(f"SUCCESS: {len(data)} records")
                
            else:
                print(f"Function {func_name} not available")
                
        except Exception as e:
            print(f"FAILED {description}: {e}")

if __name__ == "__main__":
    import os
    if not os.path.exists('./data'):
        os.makedirs('./data')
        
    debug_seasonal_stats()
    test_what_data_exists()