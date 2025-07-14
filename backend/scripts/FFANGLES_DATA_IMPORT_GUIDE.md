# FFAngles Data Import Guide

## Overview

FFAngles uses **nfl_data_py** as the single source of truth for all NFL data, providing official statistics directly from the NFL. This eliminates external API dependencies and ensures 100% data coverage for fantasy-relevant players.

## Data Sources

- **nfl_data_py**: Official NFL data for players, teams, games, and advanced statistics
- **The-Odds-API**: Player props betting data (optional)

## Prerequisites

### Environment Setup
1. PostgreSQL database named `ff_angles`
2. Environment variables in `.env` file:
   ```
   DB_HOST=localhost
   DB_NAME=ff_angles
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_PORT=5432
   ODDS_API_KEY=your_odds_api_key (optional)
   ODDS_API_KEY_2=your_backup_odds_key (optional)
   ```

### Dependencies
- **Python 3**: For nfl_data_py data collection
- **Python packages**: `nfl_data_py`, `psycopg2`, `pandas`, `python-dotenv`
- **Node.js**: Only for betting props (optional)

## Complete Import Process

### Phase 1: Initial Setup (One-time)

```bash
# 1. Migrate to nfl_data_py data structure
python migrate-to-nfl-data-py.py

# 2. Finalize table structure  
psql -d ff_angles -f finalize-table-migration.sql

# 3. Update foreign key relationships
python update-foreign-keys-to-new-players.py
```

### Phase 2: Data Import

```bash
# 1. Import advanced player statistics
python import-nfl-seasonal-stats-fixed.py

# 2. Import Next-Gen Stats (passing, receiving, rushing)  
python import-nfl-ngs-stats-fixed.py

# 3. Import weekly player statistics
python import-nfl-weekly-stats.py

# 4. (Optional) Import betting props
node import-player-props.js
```

## Data Architecture

### Core Tables
- **`players`** - 1,049 fantasy players (QB/RB/WR/TE/K) with 100% GSIS ID coverage
- **`teams`** - 32 current NFL teams with logos, colors, divisions
- **`games`** - 285 games (2024 season) with scores, betting lines, weather

### Advanced Statistics Tables  
- **`player_seasonal_stats`** - Season-long advanced metrics (607 players)
- **`player_ngs_passing`** - Next-Gen Stats for quarterbacks (~150 players)
- **`player_ngs_receiving`** - Next-Gen Stats for receivers (~500 players)
- **`player_ngs_rushing`** - Next-Gen Stats for running backs (~200 players)
- **`player_weekly_stats`** - Weekly performance trends (~15,000 records)

### Optional Tables
- **`player_props`** - Daily betting lines and odds

### Foreign Key Relationships
All tables link to `players.id` as the primary key:
- Statistical tables use `gsis_id` columns mapped to `players.gsis_id`
- Each table has `player_id` foreign key referencing `players.id`

## Expected Data Volumes (2024 Season)

| Data Source | Records | Description |
|-------------|---------|-------------|
| Players | 1,049 | Fantasy-relevant players only |
| Teams | 32 | Current NFL teams |
| Games | 285 | Complete 2024 season schedule |
| Seasonal Stats | 607 | Advanced season metrics |
| NGS Passing | ~150 | Quarterback advanced metrics |
| NGS Receiving | ~500 | Receiver advanced metrics |
| NGS Rushing | ~200 | Running back advanced metrics |
| Weekly Stats | ~15,000 | Week-by-week player performance |
| Player Props | ~1,000/day | Daily betting lines (optional) |

## Cross-Platform ID Coverage

Each player includes comprehensive platform IDs:
- **GSIS ID**: NFL official identifier (100% coverage)
- **ESPN ID**: ESPN platform identifier
- **Yahoo ID**: Yahoo Fantasy identifier  
- **Sleeper ID**: Sleeper app identifier
- **PFF ID**: Pro Football Focus identifier
- **FantasyData ID**: FantasyData platform identifier
- **Rotowire ID**: Rotowire platform identifier

## Verification Queries

After import completion, verify data with these SQL queries:

```sql
-- Check total players imported
SELECT COUNT(*) FROM players;

-- Check foreign key mapping success
SELECT 
  'seasonal_stats' as table_name,
  COUNT(*) as total_records,
  COUNT(player_id) as mapped_records,
  ROUND(COUNT(player_id) * 100.0 / COUNT(*), 1) as mapping_percentage
FROM player_seasonal_stats
UNION ALL
SELECT 
  'ngs_receiving',
  COUNT(*),
  COUNT(player_id),
  ROUND(COUNT(player_id) * 100.0 / COUNT(*), 1)
FROM player_ngs_receiving;

-- Top fantasy performers
SELECT 
  p.player_name,
  p.position,
  p.team,
  s.fantasy_points_ppr
FROM players p
JOIN player_seasonal_stats s ON p.id = s.player_id
WHERE s.season = 2024
ORDER BY s.fantasy_points_ppr DESC
LIMIT 10;

-- Check cross-platform ID coverage
SELECT 
  COUNT(*) as total_players,
  COUNT(espn_id) as espn_coverage,
  COUNT(sleeper_id) as sleeper_coverage,
  COUNT(yahoo_id) as yahoo_coverage
FROM players;
```

## Weekly Updates (During Season)

```bash
# Update weekly stats for latest games
python import-nfl-weekly-stats.py

# Update seasonal stats (as season progresses)
python import-nfl-seasonal-stats-fixed.py

# (Optional) Update betting props
node import-player-props.js
```

## Maintenance & Updates

### Season-End Updates
1. Update year parameters in scripts for next season
2. Run complete import process for final statistics
3. Archive previous season data if needed

### Adding New Seasons
1. Update year parameters: `years=[2025]` in Python scripts
2. Run migration process for new season data
3. Update foreign key relationships if needed

## Troubleshooting

### Common Issues

**Database Connection Errors:**
- Verify `.env` file has correct database credentials
- Ensure PostgreSQL is running and accessible

**Missing Foreign Key Mappings:**
- Run `python update-foreign-keys-to-new-players.py` to refresh mappings
- Some players may not have GSIS IDs (practice squad, etc.)

**Import Failures:**
- Check Python dependencies: `pip install nfl_data_py psycopg2 pandas python-dotenv`
- Verify database tables exist before running imports

**Memory Issues with Large Datasets:**
- nfl_data_py processes data efficiently in chunks
- Monitor system memory during large imports

## File Structure

```
backend/
├── migrate-to-nfl-data-py.py          # Initial migration from Tank01
├── finalize-table-migration.sql      # Finalize table structure
├── update-foreign-keys-to-new-players.py # Update foreign key relationships
├── import-nfl-seasonal-stats-fixed.py # Seasonal statistics import
├── import-nfl-ngs-stats-fixed.py     # NGS statistics import
├── import-nfl-weekly-stats.py        # Weekly statistics import
├── import-player-props.js             # Betting props import (optional)
└── FFANGLES_DATA_IMPORT_GUIDE.md     # This documentation
```

## Performance Characteristics

- **Total Import Time**: ~15-20 minutes for complete dataset
- **Database Size**: ~300MB with full dataset and indexes  
- **Update Frequency**: Weekly during season, daily for betting props
- **API Dependencies**: None (nfl_data_py downloads directly from NFL)
- **Rate Limits**: None (local data processing)

## Benefits of nfl_data_py Architecture

1. **No External API Dependencies** - All data downloaded directly from NFL
2. **100% Fantasy Player Coverage** - Every relevant player has complete statistics
3. **Official NFL Data** - Authoritative source with no third-party limitations
4. **Comprehensive Cross-Platform IDs** - Enables integration with any fantasy platform
5. **Advanced Analytics** - EPA, NGS, and cutting-edge football metrics
6. **Reliable Performance** - No rate limits, outages, or API key management

---

**FFAngles is now powered entirely by official NFL data through nfl_data_py** ⚡