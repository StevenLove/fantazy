import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from datetime import datetime
import re

class BettingPropsPlayerScraper:
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
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.wait = WebDriverWait(self.driver, 20)
    
    def __del__(self):
        """Clean up the driver when done"""
        if hasattr(self, 'driver'):
            self.driver.quit()
    
    
    def scrape_props_page(self):
        """Scrape the current page of the props listing"""
        # Wait for content to load
        time.sleep(5)
        
        players = []
        seen_slugs = set()
        
        # Find all links that match the player prop pattern
        all_links = self.driver.find_elements(By.TAG_NAME, "a")
        
        for link in all_links:
            href = link.get_attribute("href")
            if href and '/nfl/props/' in href and href != f"{self.base_url}/nfl/props/":
                # Extract slug and prop type from URL
                match = re.match(r'.*/nfl/props/([^/]+)/([^/]+)/?', href)
                if match:
                    slug = match.group(1)
                    prop_type = match.group(2)
                    
                    # Skip if we've already seen this player
                    if slug in seen_slugs:
                        continue
                    
                    # Determine position based on prop type
                    position = None
                    if prop_type in ['passing-yards', 'passing-attempts', 'passing-completions', 'passing-touchdowns']:
                        position = 'QB'
                    elif prop_type in ['rushing-yards', 'rushing-attempts']:
                        position = 'RB'
                    elif prop_type in ['receiving-yards', 'receptions', 'receiving-touchdowns']:
                        # Could be WR or TE, we'll need to check the slug or get more info
                        if slug.endswith('-te'):
                            position = 'TE'
                        else:
                            position = 'WR'  # Default to WR
                    
                    if position:
                        # Clean up the slug to get player name
                        name_parts = slug.replace('-qb', '').replace('-rb', '').replace('-wr', '').replace('-te', '').split('-')
                        name = ' '.join(word.capitalize() for word in name_parts)
                        
                        player_info = {
                            'name': name,
                            'slug': slug,
                            'position': position,
                            'team': '',  # Will need to get this from the player page
                            'url': href
                        }
                        
                        players.append(player_info)
                        seen_slugs.add(slug)
        
        print(f"  Found {len(players)} unique offensive players")
        return players
    
    def scrape_all_players(self, max_pages=9):
        """Scrape all players from multiple pages"""
        all_players = []
        seen_slugs = set()
        
        # Navigate to the first page
        url = f"{self.base_url}/nfl/props/"
        print(f"\nNavigating to: {url}")
        self.driver.get(url)
        
        # Handle cookie consent if present
        time.sleep(3)
        try:
            # Try to close cookie consent
            cookie_buttons = [
                "button[aria-label*='Accept']",
                "button[aria-label*='accept']",
                "button:contains('Accept')",
                "#onetrust-accept-btn-handler",
                ".accept-cookies",
                "button.ot-sdk-accept-all",
                "[class*='accept'][class*='cookie']"
            ]
            
            for selector in cookie_buttons:
                try:
                    if "contains" in selector:
                        buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Accept')]")
                    else:
                        buttons = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    
                    if buttons and buttons[0].is_displayed():
                        print("  Accepting cookie consent...")
                        buttons[0].click()
                        time.sleep(2)
                        break
                except:
                    continue
        except:
            pass
        
        for page_num in range(1, max_pages + 1):
            try:
                print(f"\nScraping page {page_num}...")
                page_players = self.scrape_props_page()
                
                # Add unique players
                for player in page_players:
                    if player['slug'] not in seen_slugs:
                        all_players.append(player)
                        seen_slugs.add(player['slug'])
                
                # Try to click next page button if not on last page
                if page_num < max_pages:
                    try:
                        # Look for common pagination button patterns
                        next_button = None
                        
                        # Try to find the next button using the specific BettingPros structure
                        try:
                            # Look for button with text "Click to go back to next page"
                            next_button = self.driver.find_element(
                                By.XPATH, 
                                "//button[contains(@class, 'landing-page-pagination__button') and .//span[contains(text(), 'next page')]]"
                            )
                        except:
                            # Try alternate selector
                            try:
                                # Find all pagination buttons and get the last one (should be next)
                                pagination_buttons = self.driver.find_elements(
                                    By.CSS_SELECTOR, 
                                    "button.landing-page-pagination__button"
                                )
                                if len(pagination_buttons) >= 2:
                                    next_button = pagination_buttons[-1]  # Last button should be "next"
                                else:
                                    next_button = None
                            except:
                                next_button = None
                        
                        if next_button and next_button.is_enabled():
                            print(f"  Clicking next page button...")
                            # Scroll to button and click using JavaScript
                            self.driver.execute_script("arguments[0].scrollIntoView(true);", next_button)
                            time.sleep(1)
                            try:
                                next_button.click()
                            except:
                                # If regular click fails, try JavaScript click
                                self.driver.execute_script("arguments[0].click();", next_button)
                            time.sleep(3)  # Wait for page to load
                        else:
                            print(f"  No next page button found or disabled. Stopping at page {page_num}")
                            break
                            
                    except Exception as e:
                        print(f"  Could not navigate to next page: {e}")
                        break
                
            except Exception as e:
                print(f"  Error on page {page_num}: {e}")
                import traceback
                traceback.print_exc()
        
        return all_players
    
    def save_players_config(self, players, filename='players_config_new.json'):
        """Save players to config file"""
        # Sort players by position and name
        players.sort(key=lambda x: (x['position'], x['name']))
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(players, f, indent=2, ensure_ascii=False)
        
        print(f"\nSaved {len(players)} players to {filename}")
        
        # Print summary
        position_counts = {}
        for player in players:
            pos = player['position']
            position_counts[pos] = position_counts.get(pos, 0) + 1
        
        print("\nPosition breakdown:")
        for pos, count in sorted(position_counts.items()):
            print(f"  {pos}: {count} players")

def main():
    print("BettingPros Player Scraper")
    print("=" * 50)
    
    scraper = BettingPropsPlayerScraper(headless=False)  # Show browser for debugging
    
    try:
        print("\nStarting player collection...")
        
        # Scrape all players
        players = scraper.scrape_all_players(max_pages=9)
        
        if players:
            # Save to file
            scraper.save_players_config(players)
            
            # Also save a backup with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"players_config_backup_{timestamp}.json"
            scraper.save_players_config(players, backup_filename)
            
            print(f"\nAlso saved backup to {backup_filename}")
        else:
            print("\nNo players found!")
        
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("\nClosing browser...")
        del scraper

if __name__ == "__main__":
    main()