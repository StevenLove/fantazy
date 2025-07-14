const https = require('https');
const fs = require('fs');
require('dotenv').config();

class OddsApiCollector {
  constructor() {
    this.apiKeys = [
      process.env.ODDS_API_KEY,
      process.env.ODDS_API_KEY_2
    ].filter(key => key); // Remove any undefined keys
    this.currentKeyIndex = 0;
    this.baseUrl = 'api.the-odds-api.com';
    this.sport = 'americanfootball_nfl';
    this.regions = 'us';
    this.oddsFormat = 'american';
    
    // Player props markets to collect (focused on yards only)
    this.playerPropsMarkets = [
      'player_pass_yds',
      'player_reception_yds',
      'player_rush_yds'
    ];
  }

  getCurrentApiKey() {
    return this.apiKeys[this.currentKeyIndex];
  }

  switchToNextApiKey() {
    if (this.currentKeyIndex < this.apiKeys.length - 1) {
      this.currentKeyIndex++;
      console.log(`🔄 Switching to API key #${this.currentKeyIndex + 1}`);
      return true;
    }
    return false;
  }

  async makeRequest(endpoint, params = '') {
    return new Promise((resolve, reject) => {
      const path = endpoint + (params ? '?' + params : '');
      
      console.log(`🔍 Calling: ${endpoint} (Key #${this.currentKeyIndex + 1})`);
      if (this.apiKeys.length === 0) {
        console.log('❌ No API keys found! Add ODDS_API_KEY to your .env file');
        return reject(new Error('No API keys'));
      }
      
      const options = {
        hostname: this.baseUrl,
        path: path,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FFAngles/1.0'
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log(`📊 Status: ${res.statusCode}`);
          console.log(`📈 Requests remaining: ${res.headers['x-requests-remaining'] || 'N/A'}`);
          console.log(`💰 Requests used: ${res.headers['x-requests-used'] || 'N/A'}`);
          
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              console.log('✅ Success!');
              resolve(parsed);
            } catch (error) {
              console.log(`❌ JSON Parse Error: ${error.message}`);
              console.log(`📄 Raw response: ${data.substring(0, 500)}`);
              reject(error);
            }
          } else if (res.statusCode === 401 && data.includes('quota')) {
            // API key quota exceeded
            console.log(`⚠️  API key #${this.currentKeyIndex + 1} quota exceeded`);
            if (this.switchToNextApiKey()) {
              console.log(`🔄 Retrying with API key #${this.currentKeyIndex + 1}...`);
              // Retry the request with new API key
              this.makeRequest(endpoint, params).then(resolve).catch(reject);
            } else {
              console.log(`❌ All API keys exhausted`);
              reject(new Error(`All API keys quota exceeded: ${data}`));
            }
          } else {
            console.log(`❌ HTTP Error ${res.statusCode}`);
            console.log(`📄 Response: ${data.substring(0, 300)}`);
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        console.log(`❌ Request Error: ${error.message}`);
        reject(error);
      });
      
      req.end();
    });
  }

  async getEvents() {
    console.log('🏈 Fetching NFL events...');
    
    const params = new URLSearchParams({
      apiKey: this.getCurrentApiKey()
    });
    
    try {
      const events = await this.makeRequest(`/v4/sports/${this.sport}/events`, params.toString());
      
      console.log(`📊 Found ${events.length} NFL events`);
      
      // Save events data
      this.saveData(events, 'nfl-events');
      
      return events;
    } catch (error) {
      console.log(`❌ Failed to fetch events: ${error.message}`);
      throw error;
    }
  }

  async getPlayerPropsForEvent(eventId, eventInfo) {
    console.log(`🎯 Fetching player props for event: ${eventId}`);
    console.log(`   ${eventInfo.away_team} @ ${eventInfo.home_team}`);
    
    const allPropsData = {};
    
    for (const market of this.playerPropsMarkets) {
      try {
        console.log(`   📈 Fetching ${market}...`);
        
        const params = new URLSearchParams({
          apiKey: this.getCurrentApiKey(),
          regions: this.regions,
          markets: market,
          oddsFormat: this.oddsFormat
        });
        
        const propsData = await this.makeRequest(
          `/v4/sports/${this.sport}/events/${eventId}/odds`,
          params.toString()
        );
        
        if (propsData && propsData.bookmakers && propsData.bookmakers.length > 0) {
          allPropsData[market] = propsData;
          console.log(`   ✅ ${market}: ${this.countPlayerProps(propsData)} player props`);
        } else {
          console.log(`   ⚠️  ${market}: No data available`);
        }
        
        // Rate limiting - 1 second between calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`   ❌ Failed to fetch ${market}: ${error.message}`);
        // Continue with other markets even if one fails
      }
    }
    
    // Save combined props data for this event
    if (Object.keys(allPropsData).length > 0) {
      const filename = `player-props-${eventId.replace(/[^a-zA-Z0-9]/g, '-')}`;
      this.saveData(allPropsData, filename);
      console.log(`   💾 Saved props data for ${eventId}`);
    }
    
    return allPropsData;
  }

  countPlayerProps(propsData) {
    let count = 0;
    if (propsData.bookmakers) {
      propsData.bookmakers.forEach(bookmaker => {
        if (bookmaker.markets) {
          bookmaker.markets.forEach(market => {
            if (market.outcomes) {
              // Count unique players (outcomes come in pairs - over/under)
              const players = new Set();
              market.outcomes.forEach(outcome => {
                if (outcome.description) {
                  players.add(outcome.description);
                }
              });
              count += players.size;
            }
          });
        }
      });
    }
    return count;
  }

  async collectAllPlayerProps() {
    console.log('🚀 Starting NFL Player Props Collection');
    console.log('====================================');
    
    if (this.apiKeys.length === 0) {
      console.log('❌ Please add your ODDS_API_KEY to the .env file');
      return;
    }
    
    console.log(`🔑 Found ${this.apiKeys.length} API key(s) - starting with key #1`);
    
    try {
      // Step 1: Get all NFL events
      const events = await this.getEvents();
      
      if (!events || events.length === 0) {
        console.log('❌ No events found');
        return;
      }
      
      console.log(`\n🎯 Collecting player props for ${events.length} events...`);
      
      // Step 2: Get player props for each event
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        console.log(`\n📊 Progress: ${i + 1}/${events.length}`);
        
        try {
          await this.getPlayerPropsForEvent(event.id, event);
          successCount++;
        } catch (error) {
          console.log(`❌ Failed to collect props for ${event.id}: ${error.message}`);
          failCount++;
        }
        
        // Rate limiting between events
        if (i < events.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`\n🎉 Collection complete!`);
      console.log(`   ✅ Successful: ${successCount} events`);
      console.log(`   ❌ Failed: ${failCount} events`);
      
    } catch (error) {
      console.log(`❌ Fatal error: ${error.message}`);
    }
  }

  saveData(data, filename) {
    try {
      const filepath = `./data/${filename}.json`;
      
      // Create data directory if it doesn't exist
      if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data');
      }
      
      // Add timestamp to data
      const dataWithTimestamp = {
        ...data,
        imported_at: new Date().toISOString()
      };
      
      fs.writeFileSync(filepath, JSON.stringify(dataWithTimestamp, null, 2));
      console.log(`💾 Saved data to: ${filepath}`);
    } catch (error) {
      console.log(`❌ Failed to save data: ${error.message}`);
    }
  }

  async run() {
    console.log('🚀 The Odds API - NFL Player Props Collector');
    console.log('===========================================\n');
    
    await this.collectAllPlayerProps();
    
    console.log('\n📊 Collection Summary:');
    console.log('Check the ./data directory for:');
    console.log('  - nfl-events.json (list of all games)');
    console.log('  - player-props-*.json (props for each game)');
  }
}

// Run the collector
const collector = new OddsApiCollector();
collector.run().catch(console.error);