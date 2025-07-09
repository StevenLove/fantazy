import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from datetime import datetime
import argparse
import os

class EfficientBettingProsScraper:
    def __init__(self, headless=True):
        """Initialize the scraper with Selenium WebDriver"""
        self.base_url = "https://www.bettingpros.com"
        
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
        
        from selenium.webdriver.chrome.service import Service
        service = Service('/usr/bin/chromedriver')
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 20)
    
    def __del__(self):
        """Clean up the driver when done"""
        if hasattr(self, 'driver'):
            self.driver.quit()
    
    def get_player_game_log(self, player_slug: str, position: str) -> dict:
        """Scrape player game log data"""
        # Choose a prop type based on position
        prop_types = {
            'QB': 'passing-yards',
            'RB': 'rushing-yards',
            'WR': 'receiving-yards',
            'TE': 'receiving-yards'
        }
        
        prop_type = prop_types.get(position.upper(), 'passing-yards')
        url = f"{self.base_url}/nfl/props/{player_slug}/{prop_type}/"
        
        try:
            print(f"  Loading {url}...")
            self.driver.get(url)
            
            # Try to extract team information from the page
            team = ""
            try:
                # Wait for page content to load
                time.sleep(2)
                
                # Try to find team info in the page source using broader search
                page_source = self.driver.page_source
                
                # Look for common team abbreviations in the page source
                import re
                nfl_teams = ['ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 
                            'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LAC', 'LAR', 'LV', 'MIA', 
                            'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WSH']
                
                # Try to find team in various contexts
                for nfl_team in nfl_teams:
                    # Look for team abbreviation in various patterns
                    patterns = [
                        rf'{nfl_team}\b',  # Team abbreviation as word boundary
                        rf'team.*{nfl_team}',  # "team" followed by abbreviation
                        rf'{nfl_team}.*player',  # abbreviation followed by "player"
                    ]
                    
                    for pattern in patterns:
                        if re.search(pattern, page_source, re.IGNORECASE):
                            team = nfl_team
                            break
                    
                    if team:
                        break
                
                print(f"  Found team: {team}")
                
            except Exception as e:
                print(f"  Could not extract team: {e}")
            
            # Wait for game log table to appear
            print("  Waiting for game log table...")
            try:
                # Wait up to 20 seconds for the player game log card
                game_log_card = self.wait.until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".player-game-log-card"))
                )
                
                # Wait a bit for the table to populate
                time.sleep(1)
                
                # Find the table within the card
                game_table = game_log_card.find_element(By.TAG_NAME, "table")
                print(f"  Found game log table")
                
            except TimeoutException:
                print(f"  Game log card not found after 20 seconds")
                return None
            except NoSuchElementException:
                print(f"  No table found within game log card")
                return None
            
            # Extract headers
            headers = []
            header_elements = game_table.find_elements(By.CSS_SELECTOR, "thead th")
            for th in header_elements:
                headers.append(th.text.strip())
            
            print(f"  Headers: {headers[:8]}...")
            
            # Extract data rows
            games = []
            tbody = game_table.find_element(By.TAG_NAME, "tbody")
            rows = tbody.find_elements(By.TAG_NAME, "tr")
            
            print(f"  Processing {len(rows)} rows...")
            
            for row in rows:
                game_data = {}
                cells = row.find_elements(By.TAG_NAME, "td")
                
                for i, td in enumerate(cells):
                    if i < len(headers):
                        header = headers[i]
                        value = td.text.strip()
                        
                        # Clean up the header name
                        header = header.replace('\n', ' ').strip()
                        
                        # Try to convert numeric values
                        if value and value not in ['-', 'NL', '', 'N/A']:
                            try:
                                if '.' in value:
                                    game_data[header] = float(value)
                                elif value.lstrip('-').isdigit():
                                    game_data[header] = int(value)
                                else:
                                    game_data[header] = value
                            except:
                                game_data[header] = value
                        else:
                            game_data[header] = value
                
                if game_data:
                    games.append(game_data)
            
            print(f"  Extracted {len(games)} games")
            
            # Extract averages from footer
            averages = {}
            try:
                tfoot = game_table.find_element(By.TAG_NAME, "tfoot")
                avg_row = tfoot.find_element(By.TAG_NAME, "tr")
                avg_cells = avg_row.find_elements(By.TAG_NAME, "td")
                
                for i, td in enumerate(avg_cells):
                    if i > 0 and i < len(headers):
                        value = td.text.strip()
                        if value and value not in ['-', '']:
                            try:
                                averages[headers[i]] = float(value)
                            except:
                                averages[headers[i]] = value
            except:
                pass
            
            return {
                'games': games,
                'averages': averages,
                'total_games': len(games),
                'headers': headers,
                'url': url,
                'team': team
            }
            
        except Exception as e:
            print(f"  Error scraping {player_slug}: {str(e)}")
            return None
    
    def scrape_league_players(self, players_list: list) -> dict:
        """Scrape data for all players in a league"""
        league_data = {
            'league_name': 'Fantasy Football League',
            'scrape_date': datetime.now().isoformat(),
            'season': '2025',
            'players': []
        }
        
        for i, player in enumerate(players_list, 1):
            print(f"\n[{i}/{len(players_list)}] {player['name']} ({player['position']})")
            print("-" * 40)
            
            game_log_data = self.get_player_game_log(player['slug'], player['position'])
            
            if game_log_data:
                player_data = {
                    'name': player['name'],
                    'slug': player['slug'],
                    'position': player['position'],
                    'team': game_log_data.get('team', player.get('team', '')),
                    'game_log': game_log_data['games'],
                    'season_averages': game_log_data['averages'],
                    'total_games': game_log_data['total_games'],
                    'scrape_timestamp': datetime.now().isoformat()
                }
                league_data['players'].append(player_data)
                print(f"  ✓ Success")
            else:
                print(f"  ✗ Failed")
            
            # Rate limiting between players
            if i < len(players_list):
                time.sleep(3)
        
        return league_data
    
    def save_league_data(self, league_data: dict, filename: str = 'league_data'):
        """Save league data to JSON file"""
        output_file = f"{filename}.json"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(league_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n{'='*60}")
        print(f"Data saved to: {output_file}")
        print(f"\nSummary:")
        print(f"- Total players: {len(league_data['players'])}")
        print(f"- Successful scrapes: {len([p for p in league_data['players'] if p.get('game_log')])}")
        
        for player in league_data['players']:
            games = len(player.get('game_log', []))
            print(f"- {player['name']} ({player['position']}): {games} games")
        
        print(f"{'='*60}")

def load_players_from_file(filename: str) -> list:
    """Load player list from JSON file"""
    with open(filename, 'r') as f:
        return json.load(f)

def main():
    parser = argparse.ArgumentParser(description='Efficiently scrape NFL player prop data')
    parser.add_argument('--players-file', type=str, help='JSON file with player list')
    parser.add_argument('--output', type=str, default='fantasy_league_data', help='Output filename')
    parser.add_argument('--demo', action='store_true', help='Run with demo player list')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    
    args = parser.parse_args()
    
    # Initialize scraper
    print("Initializing scraper...")
    scraper = EfficientBettingProsScraper(headless=args.headless)
    
    try:
        if args.players_file and os.path.exists(args.players_file):
            players = load_players_from_file(args.players_file)
        elif args.demo:
            # Demo player list
            players = [
                {'name': 'Josh Allen', 'slug': 'josh-allen-qb', 'position': 'QB', 'team': 'BUF'},
                {'name': 'Jalen Hurts', 'slug': 'jalen-hurts', 'position': 'QB', 'team': 'PHI'},
                {'name': 'Lamar Jackson', 'slug': 'lamar-jackson', 'position': 'QB', 'team': 'BAL'},
                {'name': 'Saquon Barkley', 'slug': 'saquon-barkley', 'position': 'RB', 'team': 'PHI'},
                {'name': 'Derrick Henry', 'slug': 'derrick-henry', 'position': 'RB', 'team': 'BAL'},
                {'name': 'Justin Jefferson', 'slug': 'justin-jefferson', 'position': 'WR', 'team': 'MIN'},
                {'name': 'CeeDee Lamb', 'slug': 'ceedee-lamb', 'position': 'WR', 'team': 'DAL'},
                {'name': 'Travis Kelce', 'slug': 'travis-kelce', 'position': 'TE', 'team': 'KC'},
            ]
        else:
            print("Use --demo or --players-file")
            return
        
        print(f"\nStarting scrape for {len(players)} players...")
        print("="*60)
        
        # Scrape all data
        league_data = scraper.scrape_league_players(players)
        
        # Save to JSON
        scraper.save_league_data(league_data, args.output)
        
        print("\nComplete!")
        
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