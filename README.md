# BettingPros Fantasy Football Scraper

This tool scrapes player game log data from BettingPros.com for NFL fantasy football analysis.

## Features

- Scrapes complete game logs with all statistics for each player
- Supports all positions (QB, RB, WR, TE)
- Saves data in comprehensive JSON format
- Includes season averages and game-by-game statistics
- Efficient - only needs to scrape once per player
- Handles JavaScript-rendered content with Selenium

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Install Chrome WebDriver:
   - **macOS**: `brew install chromedriver`
   - **Windows/Linux**: Download from [ChromeDriver](https://chromedriver.chromium.org/)
   - Make sure Chrome browser is installed

## Usage

### Visualize

`python3 -m http.server 8000`
go to localhost:8000/player_stats.html

### Quick Demo

Run with demo players (8 popular fantasy players):
```bash
python efficient_scraper.py --demo
```

Run in headless mode (no browser window):
```bash
python efficient_scraper.py --demo --headless
```

### Scrape Your League

1. Edit `players_config.json` to include your league's players
2. Run the scraper:
```bash
python efficient_scraper.py --players-file players_config.json --output my_league_data
```

## Player Slug Format

Player slugs typically follow: `firstname-lastname`

Position suffix is only added when there are multiple players with the same name:
- `josh-allen-qb` (because there's also Josh Allen the linebacker)
- `jalen-hurts` (no suffix needed)
- `saquon-barkley`
- `justin-jefferson`
- `travis-kelce`

## Output Format

The scraper creates two files:

1. **league_data.json** - Complete data including:
   - Player information
   - Game-by-game statistics
   - Season averages
   - All prop types for each player

2. **league_data_summary.json** - Quick overview of what was scraped

## Prop Types by Position

- **QB**: passing-yards, passing-touchdowns, passing-completions, passing-attempts, rushing-yards, rushing-attempts
- **RB**: rushing-yards, rushing-attempts, rushing-touchdowns, receiving-yards, receptions, receiving-touchdowns
- **WR**: receiving-yards, receptions, receiving-touchdowns, rushing-yards, rushing-attempts
- **TE**: receiving-yards, receptions, receiving-touchdowns

## Customizing Players

Edit `players_config.json` to add/remove players. Each player needs:
```json
{
  "name": "Player Name",
  "slug": "player-name-position",
  "position": "QB/RB/WR/TE",
  "team": "TEAM"
}
```

## Rate Limiting

The scraper includes built-in delays to avoid overwhelming the server:
- 1.5 seconds between prop types
- 3 seconds between players

## Example Output Structure

```json
{
  "league_name": "Fantasy Football League",
  "scrape_date": "2025-01-28T12:00:00",
  "season": "2025",
  "players": [
    {
      "name": "Josh Allen",
      "player_slug": "josh-allen-qb",
      "position": "QB",
      "team": "BUF",
      "props": {
        "passing-yards": {
          "prop_type": "passing-yards",
          "games": [...],
          "averages": {...},
          "total_games": 19
        },
        ...
      }
    }
  ]
}
```