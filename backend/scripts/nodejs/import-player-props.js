const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

class PlayerPropsImporter {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: false
    });
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      console.log('✅ Database connection successful!');
      client.release();
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async createPlayerPropsTable() {
    console.log('🔧 Creating player_game_props table...');
    
    try {
      const sqlContent = fs.readFileSync('./create-player-props-table.sql', 'utf8');
      await this.pool.query(sqlContent);
      console.log('✅ Player props table created/verified');
    } catch (error) {
      console.log(`❌ Failed to create table: ${error.message}`);
      throw error;
    }
  }

  async loadEventsMapping() {
    console.log('📋 Loading events mapping...');
    
    try {
      // Load events data to map event IDs to game IDs
      const eventsData = JSON.parse(fs.readFileSync('./data/nfl-events.json', 'utf8'));
      const eventMapping = new Map();
      
      for (const event of eventsData) {
        // Try to find matching game in database
        const gameQuery = `
          SELECT game_id, home_team, away_team, game_date
          FROM games 
          WHERE (home_team = $1 AND away_team = $2) 
             OR (home_team = $2 AND away_team = $1)
          ORDER BY ABS(EXTRACT(EPOCH FROM (game_date::date - $3::date))) ASC
          LIMIT 1
        `;
        
        // Convert event date to date string (YYYYMMDD format expected by games table)
        const eventDate = new Date(event.commence_time).toISOString().slice(0, 10).replace(/-/g, '');
        
        try {
          const result = await this.pool.query(gameQuery, [
            event.home_team, 
            event.away_team, 
            eventDate
          ]);
          
          if (result.rows.length > 0) {
            eventMapping.set(event.id, {
              game_id: result.rows[0].game_id,
              home_team: event.home_team,
              away_team: event.away_team,
              commence_time: event.commence_time
            });
          } else {
            console.log(`⚠️  No matching game found for ${event.away_team} @ ${event.home_team}`);
          }
        } catch (dbError) {
          console.log(`❌ Database error for event ${event.id}: ${dbError.message}`);
        }
      }
      
      console.log(`📊 Mapped ${eventMapping.size} events to games`);
      return eventMapping;
      
    } catch (error) {
      console.log(`❌ Failed to load events mapping: ${error.message}`);
      return new Map();
    }
  }

  async loadPlayersMapping() {
    console.log('👥 Loading players mapping...');
    
    try {
      const playersQuery = `
        SELECT tank01_player_id, name, position, team
        FROM players 
        WHERE tank01_player_id IS NOT NULL
          AND position IN ('QB', 'RB', 'WR', 'TE', 'PK')
      `;
      
      const result = await this.pool.query(playersQuery);
      const playersMap = new Map();
      
      result.rows.forEach(player => {
        // Create multiple lookup keys for name matching
        const name = player.name.toLowerCase();
        const nameParts = name.split(' ');
        
        // Store by full name
        playersMap.set(name, player.tank01_player_id);
        
        // Store by "First Last" format
        if (nameParts.length >= 2) {
          const firstLast = `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
          playersMap.set(firstLast, player.tank01_player_id);
        }
        
        // Store by "Last, First" format
        if (nameParts.length >= 2) {
          const lastFirst = `${nameParts[nameParts.length - 1]}, ${nameParts[0]}`;
          playersMap.set(lastFirst, player.tank01_player_id);
        }
      });
      
      console.log(`📊 Loaded ${result.rows.length} fantasy players for matching`);
      return playersMap;
      
    } catch (error) {
      console.log(`❌ Failed to load players mapping: ${error.message}`);
      return new Map();
    }
  }

  findPlayerId(playerName, playersMap) {
    const normalizedName = playerName.toLowerCase().trim();
    
    // Try exact match first
    if (playersMap.has(normalizedName)) {
      return playersMap.get(normalizedName);
    }
    
    // Try various name formats
    const nameParts = normalizedName.split(' ');
    if (nameParts.length >= 2) {
      const variations = [
        `${nameParts[0]} ${nameParts[nameParts.length - 1]}`, // First Last
        `${nameParts[nameParts.length - 1]}, ${nameParts[0]}`, // Last, First
        nameParts.join(' ') // Full name
      ];
      
      for (const variation of variations) {
        if (playersMap.has(variation)) {
          return playersMap.get(variation);
        }
      }
    }
    
    return null;
  }

  extractPlayerPropsFromData(propsData, eventId, gameId, playersMap) {
    const playerProps = [];
    
    // Process each market type
    Object.entries(propsData).forEach(([marketType, marketData]) => {
      if (!marketData.bookmakers) return;
      
      marketData.bookmakers.forEach(bookmaker => {
        if (!bookmaker.markets) return;
        
        bookmaker.markets.forEach(market => {
          if (!market.outcomes) return;
          
          // Group outcomes by player (over/under pairs)
          const playerOutcomes = new Map();
          
          market.outcomes.forEach(outcome => {
            if (!outcome.description) return;
            
            const playerName = outcome.description;
            if (!playerOutcomes.has(playerName)) {
              playerOutcomes.set(playerName, {});
            }
            
            // Store the point value for this outcome
            if (outcome.name === 'Over') {
              playerOutcomes.get(playerName).over_point = outcome.point;
            } else if (outcome.name === 'Under') {
              playerOutcomes.get(playerName).under_point = outcome.point;
            }
          });
          
          // Process each player's props
          playerOutcomes.forEach((outcomes, playerName) => {
            const playerId = this.findPlayerId(playerName, playersMap);
            
            if (!playerId) {
              console.log(`⚠️  Player not found: ${playerName}`);
              return;
            }
            
            // Use the over point as the betting line (standard practice)
            const propValue = outcomes.over_point || outcomes.under_point;
            
            if (propValue !== undefined) {
              // Find existing prop record or create new one
              let existingProp = playerProps.find(p => 
                p.player_id === playerId && 
                p.game_id === gameId && 
                p.event_id === eventId &&
                p.bookmaker === bookmaker.key
              );
              
              if (!existingProp) {
                existingProp = {
                  player_id: playerId,
                  game_id: gameId,
                  event_id: eventId,
                  bookmaker: bookmaker.key,
                  last_update: marketData.last_update || new Date().toISOString(),
                  raw_data: {}
                };
                playerProps.push(existingProp);
              }
              
              // Map market type to database column
              const columnMapping = {
                'player_pass_yds': 'player_pass_yds',
                'player_reception_yds': 'player_reception_yds',
                'player_rush_yds': 'player_rush_yds'
              };
              
              const dbColumn = columnMapping[marketType];
              if (dbColumn) {
                existingProp[dbColumn] = propValue;
                existingProp.raw_data[marketType] = outcomes;
              }
            }
          });
        });
      });
    });
    
    return playerProps;
  }

  async importPlayerProps(playerProps) {
    if (playerProps.length === 0) {
      console.log('⚠️  No player props to import');
      return;
    }
    
    const insertQuery = `
      INSERT INTO player_game_props (
        player_id, game_id, event_id, bookmaker, last_update,
        player_pass_yds, player_reception_yds, player_rush_yds, raw_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) ON CONFLICT (player_id, game_id, event_id, bookmaker) DO UPDATE SET
        player_pass_yds = EXCLUDED.player_pass_yds,
        player_reception_yds = EXCLUDED.player_reception_yds,
        player_rush_yds = EXCLUDED.player_rush_yds,
        last_update = EXCLUDED.last_update,
        raw_data = EXCLUDED.raw_data,
        imported_at = CURRENT_TIMESTAMP
    `;
    
    let imported = 0;
    let errors = 0;
    
    for (const prop of playerProps) {
      try {
        await this.pool.query(insertQuery, [
          prop.player_id,
          prop.game_id,
          prop.event_id,
          prop.bookmaker,
          prop.last_update,
          prop.player_pass_yds || null,
          prop.player_reception_yds || null,
          prop.player_rush_yds || null,
          JSON.stringify(prop.raw_data)
        ]);
        imported++;
      } catch (error) {
        console.log(`❌ Error importing prop for ${prop.player_id}: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`   ✅ Imported: ${imported}, Errors: ${errors}`);
  }

  async processAllPlayerPropsFiles() {
    console.log('📥 Processing all player props files...');
    
    // Load mappings
    const eventMapping = await this.loadEventsMapping();
    const playersMap = await this.loadPlayersMapping();
    
    if (eventMapping.size === 0) {
      console.log('❌ No event mappings available');
      return;
    }
    
    // Find all player props files
    const dataDir = './data';
    const propsFiles = fs.readdirSync(dataDir)
      .filter(file => file.startsWith('player-props-') && file.endsWith('.json'));
    
    console.log(`📊 Found ${propsFiles.length} player props files to process`);
    
    let totalImported = 0;
    
    for (const filename of propsFiles) {
      try {
        console.log(`\n📄 Processing: ${filename}`);
        
        // Extract event ID from filename
        const eventId = filename.replace('player-props-', '').replace('.json', '').replace(/-/g, '_');
        
        // Find matching event and game
        const eventInfo = eventMapping.get(eventId);
        if (!eventInfo) {
          console.log(`   ⚠️  No matching game found for event ${eventId}`);
          continue;
        }
        
        // Load props data
        const propsData = JSON.parse(fs.readFileSync(`${dataDir}/${filename}`, 'utf8'));
        
        // Extract player props from the data
        const playerProps = this.extractPlayerPropsFromData(
          propsData, 
          eventId, 
          eventInfo.game_id, 
          playersMap
        );
        
        console.log(`   📊 Extracted ${playerProps.length} player props`);
        
        // Import to database
        await this.importPlayerProps(playerProps);
        totalImported += playerProps.length;
        
      } catch (error) {
        console.log(`   ❌ Error processing ${filename}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Total props imported: ${totalImported}`);
  }

  async displaySummary() {
    console.log('\n📊 Player Props Import Summary:');
    
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_props,
          COUNT(DISTINCT player_id) as unique_players,
          COUNT(DISTINCT game_id) as unique_games,
          COUNT(DISTINCT bookmaker) as unique_bookmakers
        FROM player_game_props
      `;
      
      const result = await this.pool.query(statsQuery);
      const stats = result.rows[0];
      
      console.log(`   Total Props: ${stats.total_props}`);
      console.log(`   Unique Players: ${stats.unique_players}`);
      console.log(`   Unique Games: ${stats.unique_games}`);
      console.log(`   Unique Bookmakers: ${stats.unique_bookmakers}`);
      
      // Show sample data
      const sampleQuery = `
        SELECT p.name, g.home_team, g.away_team, 
               pp.player_pass_yds, pp.player_rush_yds, pp.player_reception_yds
        FROM player_game_props pp
        JOIN players p ON pp.player_id = p.tank01_player_id
        JOIN games g ON pp.game_id = g.game_id
        WHERE pp.player_pass_yds IS NOT NULL OR pp.player_rush_yds IS NOT NULL OR pp.player_reception_yds IS NOT NULL
        LIMIT 5
      `;
      
      const sampleResult = await this.pool.query(sampleQuery);
      if (sampleResult.rows.length > 0) {
        console.log('\n🔍 Sample props:');
        sampleResult.rows.forEach(row => {
          console.log(`   ${row.name} (${row.away_team}@${row.home_team}): Pass ${row.player_pass_yds || 'N/A'}yds, Rush ${row.player_rush_yds || 'N/A'}yds, Rec ${row.player_reception_yds || 'N/A'}yds`);
        });
      }
      
    } catch (error) {
      console.log(`❌ Error getting summary: ${error.message}`);
    }
  }

  async run() {
    console.log('🚀 Player Props Importer');
    console.log('========================');
    
    try {
      // Test connection
      const connected = await this.testConnection();
      if (!connected) {
        console.log('❌ Cannot connect to database');
        return;
      }
      
      // Create table
      await this.createPlayerPropsTable();
      
      // Process all props files
      await this.processAllPlayerPropsFiles();
      
      // Display summary
      await this.displaySummary();
      
      console.log('\n🎉 Player props import complete!');
      
    } catch (error) {
      console.error('❌ Fatal error:', error.message);
      console.error(error.stack);
    } finally {
      await this.pool.end();
    }
  }
}

// Run the importer
const importer = new PlayerPropsImporter();
importer.run().catch(console.error);