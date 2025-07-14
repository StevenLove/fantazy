const https = require('https');
const fs = require('fs');
require('dotenv').config();

async function makeRequest(hostname, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
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
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ statusCode: res.statusCode, rawData: data, parseError: error.message });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function showSleeperPlayerData() {
  console.log('🏈 SLEEPER API - Player Data Sample');
  console.log('=====================================');
  
  try {
    // Get all players
    const playersResponse = await makeRequest('api.sleeper.app', '/v1/players/nfl');
    
    if (playersResponse.statusCode === 200) {
      const players = playersResponse.data;
      
      // Find a few active fantasy-relevant players
      const samplePlayers = Object.entries(players)
        .filter(([id, player]) => 
          player.active && 
          player.position && 
          ['QB', 'RB', 'WR', 'TE'].includes(player.position) &&
          player.team &&
          player.full_name
        )
        .slice(0, 3);
      
      console.log(`Found ${Object.keys(players).length} total players in Sleeper`);
      console.log(`\nShowing 3 sample active fantasy players:\n`);
      
      samplePlayers.forEach(([sleeperId, player], index) => {
        console.log(`--- PLAYER ${index + 1}: ${player.full_name} ---`);
        console.log(`Sleeper ID: ${sleeperId}`);
        console.log(`Position: ${player.position}`);
        console.log(`Team: ${player.team}`);
        console.log(`Age: ${player.age}`);
        console.log(`Height: ${player.height}`);
        console.log(`Weight: ${player.weight}`);
        console.log(`College: ${player.college}`);
        console.log(`Years Experience: ${player.years_exp}`);
        console.log(`Status: ${player.status}`);
        console.log(`Injury Status: ${player.injury_status || 'Healthy'}`);
        
        // Show any additional metadata
        if (player.metadata) {
          console.log(`Metadata:`, JSON.stringify(player.metadata, null, 2));
        }
        
        console.log('');
      });
      
      // Save sample for analysis
      const sampleData = {
        totalPlayers: Object.keys(players).length,
        samplePlayers: samplePlayers.map(([id, player]) => ({ sleeperId: id, ...player }))
      };
      
      fs.writeFileSync('./data/sleeper-player-sample.json', JSON.stringify(sampleData, null, 2));
      console.log('💾 Sample saved to: ./data/sleeper-player-sample.json\n');
      
    } else {
      console.log(`❌ Failed to get Sleeper players: ${playersResponse.statusCode}`);
    }
    
  } catch (error) {
    console.log(`❌ Sleeper API error: ${error.message}`);
  }
}

async function showESPNPlayerData() {
  console.log('🏈 ESPN API - Player Statistics Sample');
  console.log('======================================');
  
  // Test with a few known active players
  const testPlayers = [
    { name: "Jaxon Smith-Njigba", espnID: "4430878", position: "WR" },
    { name: "Josh Allen", espnID: "3918298", position: "QB" }, // More likely to have current data
    { name: "Christian McCaffrey", espnID: "3116365", position: "RB" }
  ];
  
  for (const testPlayer of testPlayers) {
    console.log(`\n--- ${testPlayer.name} (${testPlayer.position}) ---`);
    
    try {
      const overviewPath = `/apis/common/v3/sports/football/nfl/athletes/${testPlayer.espnID}/overview`;
      const response = await makeRequest('site.api.espn.com', overviewPath);
      
      if (response.statusCode === 200 && response.data) {
        console.log(`✅ ESPN ID: ${testPlayer.espnID}`);
        
        // Show statistics structure
        if (response.data.statistics) {
          const stats = response.data.statistics;
          console.log(`\n📊 Statistics (${stats.displayName}):`);
          
          if (stats.categories) {
            console.log(`Categories available:`);
            stats.categories.forEach(cat => {
              console.log(`  - ${cat.displayName} (${cat.count} stats)`);
            });
          }
          
          if (stats.labels && stats.displayValues) {
            console.log(`\nStatistical Data:`);
            stats.labels.forEach((label, index) => {
              if (stats.displayValues && stats.displayValues[index]) {
                console.log(`  ${label}: ${stats.displayValues[index]}`);
              }
            });
          }
        }
        
        // Show fantasy data if available
        if (response.data.fantasy) {
          console.log(`\n🎯 Fantasy Data Available:`, Object.keys(response.data.fantasy));
        }
        
        // Show news if available
        if (response.data.news && response.data.news.length > 0) {
          console.log(`\n📰 Recent News: ${response.data.news.length} items`);
          console.log(`Latest: "${response.data.news[0].headline}" (${response.data.news[0].published})`);
        }
        
        // Show next game
        if (response.data.nextGame) {
          console.log(`\n🏈 Next Game:`, response.data.nextGame);
        }
        
        // Save full response for one player
        if (testPlayer.name === "Jaxon Smith-Njigba") {
          fs.writeFileSync('./data/espn-player-sample.json', JSON.stringify(response.data, null, 2));
          console.log(`💾 Full response saved to: ./data/espn-player-sample.json`);
        }
        
      } else {
        console.log(`❌ No data for ${testPlayer.name}: Status ${response.statusCode}`);
      }
      
    } catch (error) {
      console.log(`❌ Error for ${testPlayer.name}: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function showESPNTeamData() {
  console.log('\n🏈 ESPN API - Team Statistics Sample');
  console.log('====================================');
  
  const testTeams = ['KC', 'BUF', 'SF']; // Test with a few teams
  
  for (const teamAbv of testTeams) {
    console.log(`\n--- ${teamAbv} Team Stats ---`);
    
    // Try different team endpoints
    const teamEndpoints = [
      `/apis/site/v2/sports/football/nfl/teams/${teamAbv}`,
      `/apis/site/v2/sports/football/nfl/teams/${teamAbv}/statistics`,
      `/apis/common/v3/sports/football/nfl/teams/${teamAbv}`,
      `/v2/sports/football/leagues/nfl/seasons/2024/teams/${teamAbv}/statistics`
    ];
    
    for (const endpoint of teamEndpoints) {
      try {
        console.log(`🔍 Testing: ${endpoint}`);
        const response = await makeRequest('site.api.espn.com', endpoint);
        
        if (response.statusCode === 200 && response.data && Object.keys(response.data).length > 0) {
          console.log(`✅ Success! Data keys: ${Object.keys(response.data).join(', ')}`);
          
          // Show team info
          if (response.data.team) {
            console.log(`Team: ${response.data.team.displayName || response.data.team.name}`);
          }
          
          // Show statistics
          if (response.data.statistics) {
            console.log(`Statistics available: ${response.data.statistics.length} categories`);
            response.data.statistics.slice(0, 3).forEach(stat => {
              console.log(`  - ${stat.name}: ${stat.displayValue || stat.value}`);
            });
          }
          
          // Save sample team data
          if (teamAbv === 'KC') {
            fs.writeFileSync('./data/espn-team-sample.json', JSON.stringify(response.data, null, 2));
            console.log(`💾 Full team response saved to: ./data/espn-team-sample.json`);
          }
          
          break; // Stop trying other endpoints for this team
        } else {
          console.log(`❌ Status: ${response.statusCode} or no data`);
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

async function showSleeperProjections() {
  console.log('\n🎯 SLEEPER API - Projections/Stats Sample');
  console.log('=========================================');
  
  try {
    // Get NFL state to know current season/week
    const stateResponse = await makeRequest('api.sleeper.app', '/v1/state/nfl');
    
    if (stateResponse.statusCode === 200) {
      const state = stateResponse.data;
      console.log(`Current NFL State: Season ${state.season}, Week ${state.week}`);
      
      // Try to get stats for current season
      const currentSeason = state.season;
      const statsEndpoints = [
        `/v1/stats/nfl/regular/${currentSeason}`,
        `/v1/stats/nfl/${currentSeason}`,
        `/v1/projections/nfl/regular/${currentSeason}`,
        `/v1/projections/nfl/${currentSeason}`
      ];
      
      for (const endpoint of statsEndpoints) {
        try {
          console.log(`\n🔍 Testing: ${endpoint}`);
          const response = await makeRequest('api.sleeper.app', endpoint);
          
          if (response.statusCode === 200 && response.data) {
            console.log(`✅ Success! Data type: ${typeof response.data}`);
            
            if (Array.isArray(response.data)) {
              console.log(`Got array with ${response.data.length} items`);
              if (response.data.length > 0) {
                console.log(`Sample item:`, JSON.stringify(response.data[0], null, 2));
              }
            } else if (typeof response.data === 'object') {
              const keys = Object.keys(response.data);
              console.log(`Got object with ${keys.length} keys`);
              console.log(`Sample keys: ${keys.slice(0, 5).join(', ')}`);
              
              // Show sample player stats
              const sampleKey = keys[0];
              if (sampleKey && response.data[sampleKey]) {
                console.log(`Sample stats for player ${sampleKey}:`, JSON.stringify(response.data[sampleKey], null, 2));
              }
            }
            
            // Save sample
            fs.writeFileSync(`./data/sleeper-${endpoint.replace(/\//g, '-')}.json`, JSON.stringify(response.data, null, 2));
            console.log(`💾 Saved to: ./data/sleeper-${endpoint.replace(/\//g, '-')}.json`);
            
          } else {
            console.log(`❌ Status: ${response.statusCode}`);
          }
          
        } catch (error) {
          console.log(`❌ Error: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
  } catch (error) {
    console.log(`❌ Sleeper projections error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 API Data Samples Collection');
  console.log('===============================\n');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
  }
  
  await showSleeperPlayerData();
  await showSleeperProjections();
  await showESPNPlayerData();
  await showESPNTeamData();
  
  console.log('\n🎉 Data collection complete!');
  console.log('Check the ./data directory for saved samples');
}

main().catch(console.error);