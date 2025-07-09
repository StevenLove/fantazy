#!/usr/bin/env python3
"""
Add team data from ESPN scraper to league data using name and position matching
"""

import json
import re
from difflib import SequenceMatcher

def normalize_name(name):
    """Normalize player name for better matching"""
    # Remove common suffixes
    name = re.sub(r'\s+(Jr|Sr|II|III|IV)\.?$', '', name, flags=re.IGNORECASE)
    
    # Remove extra whitespace and convert to title case
    name = ' '.join(name.split()).title()
    
    # Handle common name variations
    name_variations = {
        "D'": "D'",  # Ensure apostrophes are consistent
        "'": "'",    # Handle different apostrophe types
    }
    
    for old, new in name_variations.items():
        name = name.replace(old, new)
    
    return name

def calculate_similarity(name1, name2):
    """Calculate similarity between two names"""
    # Direct match
    if name1.lower() == name2.lower():
        return 1.0
    
    # Normalize both names
    norm1 = normalize_name(name1)
    norm2 = normalize_name(name2)
    
    if norm1.lower() == norm2.lower():
        return 0.95
    
    # Use sequence matcher for fuzzy matching
    return SequenceMatcher(None, norm1.lower(), norm2.lower()).ratio()

def add_teams():
    """Add ESPN team data to league players using name and position matching"""
    
    # Load ESPN team data
    try:
        with open('espn_players_all.json', 'r', encoding='utf-8') as f:
            espn_data = json.load(f)
        print(f"Loaded {len(espn_data)} players from ESPN data")
    except FileNotFoundError:
        print("Error: espn_players_all.json not found. Run the ESPN scraper first.")
        return
    
    # Load league data
    try:
        with open('my_league_data.json', 'r', encoding='utf-8') as f:
            league_data = json.load(f)
        print(f"Loaded {len(league_data['players'])} players from league data")
    except FileNotFoundError:
        print("Error: my_league_data.json not found.")
        return
    
    # Match players using both name and position
    matches = []
    unmatched_league = []
    
    for player in league_data['players']:
        league_name = player['name']
        league_position = player['position']
        best_match = None
        best_score = 0.0
        
        # Try to find the best match in ESPN data with same position
        for espn_player in espn_data:
            espn_name = espn_player['name']
            espn_position = espn_player['position']
            espn_team = espn_player['team']
            
            # Only consider players with matching position
            if espn_position == league_position:
                similarity = calculate_similarity(league_name, espn_name)
                
                if similarity > best_score:
                    best_score = similarity
                    best_match = (espn_name, espn_team, espn_position)
        
        # Consider it a match if similarity is high enough
        if best_score >= 0.8:  # 80% similarity threshold
            matches.append({
                'league_name': league_name,
                'espn_name': best_match[0],
                'team': best_match[1],
                'position': league_position,
                'similarity': best_score
            })
        else:
            unmatched_league.append({
                'name': league_name,
                'position': league_position,
                'best_match': best_match[0] if best_match else None,
                'best_score': best_score
            })
    
    # Print results
    print(f"\n✓ Found {len(matches)} matches out of {len(league_data['players'])} league players")
    print(f"✓ Match rate: {len(matches)/len(league_data['players'])*100:.1f}%")
    
    # Show some example matches
    print("\nExample matches:")
    for i, match in enumerate(matches[:10]):
        print(f"  {match['league_name']} ({match['position']}) → {match['espn_name']} ({match['team']}) - {match['similarity']:.2f}")
    
    # Show unmatched players
    if unmatched_league:
        print(f"\nUnmatched league players ({len(unmatched_league)}):")
        for player in unmatched_league[:10]:
            best_info = f" (best: {player['best_match']} - {player['best_score']:.2f})" if player['best_match'] else ""
            print(f"  {player['name']} ({player['position']}){best_info}")
        if len(unmatched_league) > 10:
            print(f"  ... and {len(unmatched_league) - 10} more")
    
    # Update league data with teams
    updated_count = 0
    for player in league_data['players']:
        # Find matching team data
        for match in matches:
            if match['league_name'] == player['name'] and match['position'] == player['position']:
                player['team'] = match['team']
                updated_count += 1
                break
    
    # Save updated league data
    with open('my_league_data.json', 'w', encoding='utf-8') as f:
        json.dump(league_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Updated {updated_count} players with team data in my_league_data.json")
    
    # Summary by position
    position_stats = {}
    for match in matches:
        pos = match['position']
        if pos not in position_stats:
            position_stats[pos] = 0
        position_stats[pos] += 1
    
    print("\nMatches by position:")
    for pos, count in sorted(position_stats.items()):
        total_pos = len([p for p in league_data['players'] if p['position'] == pos])
        print(f"  {pos}: {count}/{total_pos} ({count/total_pos*100:.1f}%)")

if __name__ == "__main__":
    add_teams()