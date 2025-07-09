#!/usr/bin/env python3
"""
Scrape player and team data from ESPN Fantasy Football projections
"""

import time
import json
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from datetime import datetime
import argparse

class ESPNScraper:
    def __init__(self, headless=True):
        """Initialize the scraper with Selenium WebDriver"""
        self.base_url = "https://fantasy.espn.com/football/players/projections"
        
        # Setup Chrome options
        chrome_options = webdriver.ChromeOptions()
        if headless:
            chrome_options.add_argument('--headless=new')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        service = Service('/usr/bin/chromedriver')
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        
        # Team abbreviation mapping (ESPN might use different abbreviations)
        self.team_mapping = {
            'ARI': 'ARI', 'ATL': 'ATL', 'BAL': 'BAL', 'BUF': 'BUF', 'CAR': 'CAR',
            'CHI': 'CHI', 'CIN': 'CIN', 'CLE': 'CLE', 'DAL': 'DAL', 'DEN': 'DEN',
            'DET': 'DET', 'GB': 'GB', 'HOU': 'HOU', 'IND': 'IND', 'JAX': 'JAX',
            'KC': 'KC', 'LAC': 'LAC', 'LAR': 'LAR', 'LV': 'LV', 'MIA': 'MIA',
            'MIN': 'MIN', 'NE': 'NE', 'NO': 'NO', 'NYG': 'NYG', 'NYJ': 'NYJ',
            'PHI': 'PHI', 'PIT': 'PIT', 'SEA': 'SEA', 'SF': 'SF', 'TB': 'TB',
            'TEN': 'TEN', 'WSH': 'WSH', 'WAS': 'WSH'  # ESPN might use WAS instead of WSH
        }
    
    def __del__(self):
        """Clean up the driver when done"""
        if hasattr(self, 'driver'):
            self.driver.quit()
    
    def scrape_page(self, page_num):
        """Scrape a single page of player projections"""
        if page_num == 1:
            print(f"  Loading initial page: {self.base_url}")
            self.driver.get(self.base_url)
        else:
            print(f"  Navigating to page {page_num} via pagination controls")
            # Try to find and click next page button
            try:
                # Look for ESPN-specific pagination selectors
                next_selectors = [
                    'button.Pagination__Button--next',
                    '.Pagination__Button--next',
                    'button[class*="Pagination__Button--next"]',
                    'button[aria-label="Next"]',
                    '.pagination-next',
                    '.next-page',
                    'button:contains("Next")',
                    '.btn-next',
                    '[data-testid="pagination-next"]',
                    '.Table__pagination button:last-child',
                    'button[title="Next"]'
                ]
                
                clicked = False
                for selector in next_selectors:
                    try:
                        next_button = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))
                        next_button.click()
                        clicked = True
                        print(f"    Clicked next button with selector: {selector}")
                        break
                    except:
                        continue
                
                if not clicked:
                    print(f"    Could not find next button for page {page_num}")
                    return []
                        
            except Exception as e:
                print(f"    Error navigating to page {page_num}: {e}")
                return []
        
        try:
            time.sleep(3)  # Wait for page to load
            
            players = []
            
            # Debug: Print page title and some content to understand structure
            try:
                page_title = self.driver.title
                print(f"    Page title: {page_title}")
                
                # Look for any tables on the page
                all_tables = self.driver.find_elements(By.TAG_NAME, "table")
                print(f"    Found {len(all_tables)} tables on page")
                
                # Look for any divs that might contain player data
                all_divs = self.driver.find_elements(By.TAG_NAME, "div")
                print(f"    Found {len(all_divs)} divs on page")
                
                # Print first few elements to understand structure
                body_text = self.driver.find_element(By.TAG_NAME, "body").text[:500]
                print(f"    First 500 chars of body: {body_text}")
                
            except Exception as e:
                print(f"    Debug error: {e}")
            
            # Look for player rows in the table
            # ESPN typically uses table structures for player data
            try:
                # Try different selectors for ESPN player tables
                table_selectors = [
                    'table.Table',
                    'table.table', 
                    '.Table tbody tr',
                    '.players-table tbody tr',
                    'tbody tr',
                    '.player-row',
                    'tr',  # Just try any table row
                    '.Table tr',
                    '[data-idx]',  # ESPN sometimes uses data attributes
                    '.jsx-*'  # ESPN uses React with jsx classes
                ]
                
                rows = []
                for selector in table_selectors:
                    try:
                        rows = self.driver.find_elements(By.CSS_SELECTOR, selector)
                        if rows:
                            print(f"    Found {len(rows)} rows using selector: {selector}")
                            break
                    except:
                        continue
                
                if not rows:
                    print(f"    No player rows found on page {page_num}")
                    print(f"    Page source length: {len(self.driver.page_source)}")
                    return players
                
                # Process each row
                processed_rows = 0
                skipped_rows = 0
                for i, row in enumerate(rows):
                    try:
                        # Debug: Print first few rows to understand structure
                        if i < 5:
                            row_text = row.text.strip()
                            print(f"    Row {i+1}: '{row_text[:100]}...'")
                        
                        # Extract player info from the row
                        player_data = self.extract_player_from_row(row)
                        if player_data:
                            players.append(player_data)
                            processed_rows += 1
                            
                            # Debug: Print first few players
                            if len(players) <= 3:
                                print(f"    Player {len(players)}: {player_data['name']} - {player_data['team']} - {player_data['position']}")
                        else:
                            skipped_rows += 1
                    
                    except Exception as e:
                        skipped_rows += 1
                        continue  # Skip problematic rows
                
                print(f"    Processed: {processed_rows} players, Skipped: {skipped_rows} rows")
                return players
                
            except Exception as e:
                print(f"    Error processing page {page_num}: {e}")
                return players
                
        except Exception as e:
            print(f"    Error loading page {page_num}: {e}")
            return []
    
    def extract_player_from_row(self, row):
        """Extract player information from a table row"""
        try:
            # Debug: Print row content
            row_text = row.text.strip()
            if not row_text:
                return None
            
            # Skip obvious header rows
            if ('YEAR' in row_text and 'TAR' in row_text) or ('FPTS' in row_text and 'STATISTICS' in row_text):
                return None
            
            # Check if this looks like a player row (more flexible check)
            team_names = ['Cardinals', 'Falcons', 'Ravens', 'Bills', 'Panthers', 'Bears', 'Bengals', 'Browns', 'Cowboys', 'Broncos', 'Lions', 'Packers', 'Texans', 'Colts', 'Jaguars', 'Chiefs', 'Chargers', 'Rams', 'Raiders', 'Dolphins', 'Vikings', 'Patriots', 'Saints', 'Giants', 'Jets', 'Eagles', 'Steelers', 'Seahawks', '49ers', 'Buccaneers', 'Titans', 'Commanders']
            positions = ['QB', 'RB', 'WR', 'TE']
            
            # More flexible check - look for team name AND position separately
            has_team = any(team in row_text for team in team_names)
            has_position = any(pos in row_text for pos in positions)
            
            if not (has_team and has_position):
                return None
                
            # ESPN format: "RANK PLAYER 1 Ja'Marr Chase BengalsWR..."
            # We need to extract: player name, team, and position
            
            # Look for the pattern: number followed by player name, then team+position
            lines = row_text.split('\n')
            
            # Join all lines and clean up the text
            all_text = ' '.join(lines).strip()
            
            # Remove common header text patterns
            all_text = re.sub(r'RANK\s*PLAYER\s*', '', all_text)
            all_text = re.sub(r'^\d+\s+', '', all_text)  # Remove leading rank number
            
            # Look for team+position pattern in the cleaned text
            # ESPN uses team names + positions like "BengalsWR", "FalconsRB"
            team_names = {
                'Cardinals': 'ARI', 'Falcons': 'ATL', 'Ravens': 'BAL', 'Bills': 'BUF',
                'Panthers': 'CAR', 'Bears': 'CHI', 'Bengals': 'CIN', 'Browns': 'CLE',
                'Cowboys': 'DAL', 'Broncos': 'DEN', 'Lions': 'DET', 'Packers': 'GB',
                'Texans': 'HOU', 'Colts': 'IND', 'Jaguars': 'JAX', 'Chiefs': 'KC',
                'Chargers': 'LAC', 'Rams': 'LAR', 'Raiders': 'LV', 'Dolphins': 'MIA',
                'Vikings': 'MIN', 'Patriots': 'NE', 'Saints': 'NO', 'Giants': 'NYG',
                'Jets': 'NYJ', 'Eagles': 'PHI', 'Steelers': 'PIT', 'Seahawks': 'SEA',
                '49ers': 'SF', 'Buccaneers': 'TB', 'Titans': 'TEN', 'Commanders': 'WSH'
            }
            
            player_name = ""
            team = ""
            position = ""
            
            # Find team and position
            for team_name, team_abbrev in team_names.items():
                pattern = f"{team_name}(QB|RB|WR|TE)"
                match = re.search(pattern, all_text)
                if match:
                    position = match.group(1)
                    team = team_abbrev
                    
                    # Extract player name (everything before the team name)
                    name_end = all_text.find(team_name)
                    if name_end > 0:
                        # Get the text before team name and clean it up
                        before_team = all_text[:name_end].strip()
                        
                        # Remove any remaining rank numbers
                        before_team = re.sub(r'^\d+\s+', '', before_team)
                        
                        player_name = before_team.strip()
                        break
            
            # Clean up player name
            if player_name:
                player_name = player_name.strip()
                player_name = re.sub(r'\s+(Jr|Sr|II|III|IV)\.?$', '', player_name)
                
                # Normalize team abbreviation
                if team in self.team_mapping:
                    team = self.team_mapping[team]
                
                if player_name and team and position in ['QB', 'RB', 'WR', 'TE']:
                    return {
                        'name': player_name,
                        'team': team,
                        'position': position
                    }
            
            return None
            
        except Exception as e:
            return None
    
    def infer_position(self, row, player_name):
        """Try to infer position from row context"""
        try:
            # Look for position indicators in the row
            row_text = row.text.lower()
            
            if any(word in row_text for word in ['quarterback', 'qb']):
                return 'QB'
            elif any(word in row_text for word in ['running back', 'rb']):
                return 'RB'
            elif any(word in row_text for word in ['wide receiver', 'wr']):
                return 'WR'
            elif any(word in row_text for word in ['tight end', 'te']):
                return 'TE'
            
            return ""
            
        except:
            return ""
    
    def scrape_all_pages(self, max_pages=21):
        """Scrape all pages of player projections"""
        all_players = []
        
        for page in range(1, max_pages + 1):
            print(f"\nScraping page {page}/{max_pages}...")
            
            page_players = self.scrape_page(page)
            all_players.extend(page_players)
            
            # If no players found, we might have reached the end
            if not page_players:
                print(f"  No players found on page {page}, stopping early")
                break
            
            # Small delay between pages
            time.sleep(1)
        
        return all_players
    
    def save_team_data(self, players, filename='espn_teams.json'):
        """Save player team data to JSON file"""
        
        # Create a mapping of player names to teams
        team_mapping = {}
        for player in players:
            team_mapping[player['name']] = player['team']
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(team_mapping, f, indent=2, ensure_ascii=False)
        
        print(f"\nSaved team data for {len(team_mapping)} players to {filename}")
        
        # Also save the full player data
        full_filename = 'espn_players_all.json'
        with open(full_filename, 'w', encoding='utf-8') as f:
            json.dump(players, f, indent=2, ensure_ascii=False)
        
        # Print summary by position
        position_counts = {}
        for player in players:
            pos = player['position']
            position_counts[pos] = position_counts.get(pos, 0) + 1
        
        print("\nPosition breakdown:")
        for pos, count in sorted(position_counts.items()):
            print(f"  {pos}: {count} players")

def main():
    parser = argparse.ArgumentParser(description='Scrape NFL player team data from ESPN Fantasy')
    parser.add_argument('--output', type=str, default='espn_teams', help='Output filename')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--max-pages', type=int, default=21, help='Maximum pages to scrape')
    
    args = parser.parse_args()
    
    print("ESPN Fantasy Football Scraper")
    print("=" * 50)
    print(f"Scraping up to {args.max_pages} pages...")
    
    # Initialize scraper
    scraper = ESPNScraper(headless=args.headless)
    
    try:
        # Scrape all pages
        players = scraper.scrape_all_pages(args.max_pages)
        
        if players:
            # Save team data
            scraper.save_team_data(players, f"{args.output}.json")
            print(f"\n✓ Complete! Found {len(players)} total players.")
        else:
            print("\n✗ No players found!")
            
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("\nClosing browser...")
        del scraper

if __name__ == "__main__":
    main()