#!/usr/bin/env python3
"""
Test if nfl_data_py has player props and fantasy projections
"""

import nfl_data_py as nfl
import pandas as pd

def test_projections_and_props():
    """Test for projections and props data"""
    print("Testing nfl_data_py for projections and props...")
    
    # Get all available functions
    all_functions = [func for func in dir(nfl) if func.startswith('import_')]
    
    # Look for projection/prop related functions
    projection_keywords = ['proj', 'predict', 'forecast', 'expect']
    prop_keywords = ['prop', 'bet', 'odd', 'line', 'wager']
    fantasy_keywords = ['fantasy', 'fant', 'draft']
    
    print(f"\nAll available functions: {len(all_functions)}")
    
    # Check for projection functions
    projection_functions = []
    for func in all_functions:
        if any(keyword in func.lower() for keyword in projection_keywords):
            projection_functions.append(func)
    
    # Check for prop functions  
    prop_functions = []
    for func in all_functions:
        if any(keyword in func.lower() for keyword in prop_keywords):
            prop_functions.append(func)
            
    # Check for fantasy functions
    fantasy_functions = []
    for func in all_functions:
        if any(keyword in func.lower() for keyword in fantasy_keywords):
            fantasy_functions.append(func)
    
    print(f"\nProjection-related functions: {projection_functions}")
    print(f"Prop/betting-related functions: {prop_functions}")
    print(f"Fantasy-related functions: {fantasy_functions}")
    
    # Test some potential functions
    potential_functions = [
        'import_qbr',  # QBR might have projections
        'import_ftn_data',  # FTN might have projections
        'import_draft_picks',  # Draft data
        'import_draft_values',  # Draft values
        'import_contracts',  # Contract data
        'import_injuries'  # Injury data
    ]
    
    for func_name in potential_functions:
        if func_name in all_functions:
            print(f"\n[TESTING] {func_name}")
            try:
                data = getattr(nfl, func_name)(years=[2024])
                print(f"  Records: {len(data)}")
                print(f"  Columns: {list(data.columns)}")
                
                # Look for projection/fantasy related columns
                relevant_cols = []
                for col in data.columns:
                    if any(keyword in col.lower() for keyword in projection_keywords + fantasy_keywords + ['proj', 'exp', 'pred']):
                        relevant_cols.append(col)
                
                if relevant_cols:
                    print(f"  RELEVANT COLUMNS: {relevant_cols}")
                    
                # Save sample if it looks promising
                if len(data) > 0 and (relevant_cols or 'qbr' in func_name or 'ftn' in func_name):
                    sample_file = f'./data/{func_name}_sample.json'
                    data.head(3).to_json(sample_file, orient='records', indent=2)
                    print(f"  Sample saved: {sample_file}")
                    
            except Exception as e:
                print(f"  Error: {e}")
    
    # Check if any existing data has projection-like columns
    print(f"\n{'='*50}")
    print("Checking existing data for projection columns...")
    
    existing_data_functions = [
        ('import_seasonal_data', 'Seasonal player stats'),
        ('import_weekly_data', 'Weekly player stats'),
        ('import_qbr', 'QBR data')
    ]
    
    for func_name, description in existing_data_functions:
        try:
            print(f"\n[CHECKING] {description}")
            data = getattr(nfl, func_name)(years=[2024])
            
            # Look for fantasy/projection columns
            fantasy_cols = []
            for col in data.columns:
                if any(keyword in col.lower() for keyword in ['fantasy', 'proj', 'expect', 'pred', 'draft']):
                    fantasy_cols.append(col)
            
            if fantasy_cols:
                print(f"  FANTASY COLUMNS FOUND: {fantasy_cols}")
                
                # Show sample values
                if len(data) > 0:
                    sample = data[fantasy_cols].head(3)
                    print(f"  Sample values:")
                    print(sample.to_string(index=False))
            else:
                print(f"  No obvious fantasy/projection columns")
                
        except Exception as e:
            print(f"  Error checking {description}: {e}")

if __name__ == "__main__":
    test_projections_and_props()