const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ message: 'FF Angles API is running!' });
});

app.get('/api/players', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, slug, position, team, espn_headshot
      FROM players
      ORDER BY name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

app.get('/api/players/:id/game-logs', async (req, res) => {
  try {
    const playerId = req.params.id;
    console.log('Fetching game logs for player ID:', playerId);
    
    const result = await pool.query(`
      SELECT 
        week, matchup, score, spread_result, prop_line,
        qbr, pass_yds, pass_tds, pass_cmps, pass_atts, ints,
        rush_td, rush_yds, rush_atts, recs, rec_yds, rec_tds, tds_scored,
        created_at
      FROM game_logs
      WHERE player_id = $1
      ORDER BY 
        CASE 
          WHEN week ~ '^[0-9]+$' THEN CAST(week AS INTEGER)
          ELSE 999
        END DESC
    `, [playerId]);
    
    console.log('Found', result.rows.length, 'game logs');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching game logs:', error);
    res.status(500).json({ error: 'Failed to fetch game logs' });
  }
});

// Efficient endpoint: Get all players with game logs using single query
app.get('/api/league-data', async (req, res) => {
  try {
    console.log('🏈 Fetching all players and game logs efficiently...');
    
    // Single query to get all players with their game logs using LEFT JOIN
    const result = await pool.query(`
      SELECT 
        p.id as player_id,
        p.name,
        p.slug,
        p.position,
        p.team,
        p.espn_headshot,
        gl.week,
        gl.matchup,
        gl.score,
        gl.spread_result,
        gl.prop_line,
        gl.qbr,
        gl.pass_yds,
        gl.pass_tds,
        gl.pass_cmps,
        gl.pass_atts,
        gl.ints,
        gl.rush_td,
        gl.rush_yds,
        gl.rush_atts,
        gl.recs,
        gl.rec_yds,
        gl.rec_tds,
        gl.tds_scored
      FROM players p
      LEFT JOIN game_logs gl ON p.id = gl.player_id
      ORDER BY p.name, 
        CASE 
          WHEN gl.week ~ '^[0-9]+$' THEN CAST(gl.week AS INTEGER)
          ELSE 999
        END DESC
    `);
    
    console.log(`📊 Retrieved ${result.rows.length} player-gamelog records`);
    
    // Group game logs by player
    const playersMap = new Map();
    
    result.rows.forEach(row => {
      const playerId = row.player_id;
      
      if (!playersMap.has(playerId)) {
        playersMap.set(playerId, {
          name: row.name,
          slug: row.slug,
          position: row.position,
          team: row.team,
          espn_headshot: row.espn_headshot,
          game_log: []
        });
      }
      
      // Add game log if it exists (week will be null if no game logs)
      if (row.week) {
        const gameLog = {
          Week: isNaN(parseInt(row.week)) ? row.week : parseInt(row.week),
          Matchup: row.matchup || '',
          Score: row.score || '',
          "Spread Result": row.spread_result || '',
          "Prop Line": row.prop_line || 0,
          "": '',
          QBR: row.qbr,
          "PASS YDS": row.pass_yds,
          "PASS TDS": row.pass_tds,
          "PASS CMPS": row.pass_cmps,
          "PASS ATTS": row.pass_atts,
          INTS: row.ints,
          "RUSH TD": row.rush_td,
          "Rush YDS": row.rush_yds,
          "Rush ATTS": row.rush_atts,
          "TDS SCORED": row.tds_scored,
          REC: row.recs,
          "REC YDS": row.rec_yds,
          "REC TD": row.rec_tds
        };
        
        playersMap.get(playerId).game_log.push(gameLog);
      }
    });
    
    // Convert to final format
    const players = Array.from(playersMap.values()).map(player => {
      const season_averages = calculateAverages(player.game_log);
      
      return {
        name: player.name,
        slug: player.slug,
        position: player.position,
        team: player.team,
        espn_headshot: player.espn_headshot,
        game_log: player.game_log,
        season_averages,
        total_games: player.game_log.length,
        scrape_timestamp: new Date().toISOString(),
        has_data: player.game_log.length > 0
      };
    });
    
    console.log(`✅ Processed ${players.length} players`);
    console.log(`📈 Players with game data: ${players.filter(p => p.has_data).length}`);
    console.log(`📊 Players without game data: ${players.filter(p => !p.has_data).length}`);
    
    res.json({
      league_name: "Fantasy Football League",
      scrape_date: new Date().toISOString(),
      season: "2024",
      players
    });
  } catch (error) {
    console.error('❌ Error fetching league data:', error);
    res.status(500).json({ error: 'Failed to fetch league data' });
  }
});

// Helper function to calculate averages
function calculateAverages(gameLogs) {
  if (gameLogs.length === 0) return {};
  
  const totals = {};
  const counts = {};
  
  gameLogs.forEach(log => {
    Object.keys(log).forEach(key => {
      if (typeof log[key] === 'number' && key !== 'Week') {
        totals[key] = (totals[key] || 0) + log[key];
        counts[key] = (counts[key] || 0) + 1;
      }
    });
  });
  
  const averages = {};
  Object.keys(totals).forEach(key => {
    averages[key] = totals[key] / counts[key];
  });
  
  return averages;
}


// Efficient game logs endpoint - just raw game log data
app.get('/api/game-logs/all', async (req, res) => {
  try {
    console.log('🎯 Fetching all game logs with player info...');
    
    const result = await pool.query(`
      SELECT 
        p.name as player_name,
        p.slug as player_slug,
        p.position,
        p.team,
        p.espn_headshot,
        gl.*
      FROM game_logs gl
      JOIN players p ON gl.player_id = p.id
      ORDER BY p.name, 
        CASE 
          WHEN gl.week ~ '^[0-9]+$' THEN CAST(gl.week AS INTEGER)
          ELSE 999
        END DESC
    `);
    
    console.log(`📊 Retrieved ${result.rows.length} game log records`);
    
    res.json({
      total_records: result.rows.length,
      game_logs: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching game logs:', error);
    res.status(500).json({ error: 'Failed to fetch game logs' });
  }
});

// Fantasy Teams API endpoints

// Get all fantasy teams
app.get('/api/fantasy-teams', async (req, res) => {
  try {
    const { season = '2024' } = req.query;
    
    const result = await pool.query(`
      SELECT ft.*, 
             COUNT(ftr.id) as roster_count
      FROM fantasy_teams ft
      LEFT JOIN fantasy_team_rosters ftr ON ft.id = ftr.fantasy_team_id
      WHERE ft.season = $1
      GROUP BY ft.id
      ORDER BY ft.team_name
    `, [season]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching fantasy teams:', error);
    res.status(500).json({ error: 'Failed to fetch fantasy teams' });
  }
});

// Get fantasy team roster
app.get('/api/fantasy-teams/:id/roster', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ftr.id as roster_id,
        p.id as player_id,
        p.name,
        p.slug,
        p.position,
        p.team,
        p.espn_headshot
      FROM fantasy_team_rosters ftr
      JOIN players p ON ftr.player_id = p.id
      WHERE ftr.fantasy_team_id = $1
      ORDER BY p.position, p.name
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching team roster:', error);
    res.status(500).json({ error: 'Failed to fetch team roster' });
  }
});

// Add player to fantasy team
app.post('/api/fantasy-teams/:id/roster', async (req, res) => {
  try {
    const { id } = req.params;
    const { player_id } = req.body;
    
    const result = await pool.query(`
      INSERT INTO fantasy_team_rosters (
        fantasy_team_id, player_id
      ) VALUES ($1, $2)
      RETURNING *
    `, [id, player_id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding player to roster:', error);
    res.status(500).json({ error: 'Failed to add player to roster' });
  }
});

// Remove player from fantasy team
app.delete('/api/fantasy-teams/:teamId/roster/:rosterId', async (req, res) => {
  try {
    const { teamId, rosterId } = req.params;
    
    await pool.query(`
      DELETE FROM fantasy_team_rosters 
      WHERE id = $1 AND fantasy_team_id = $2
    `, [rosterId, teamId]);
    
    res.json({ message: 'Player removed from roster' });
  } catch (error) {
    console.error('Error removing player from roster:', error);
    res.status(500).json({ error: 'Failed to remove player from roster' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});