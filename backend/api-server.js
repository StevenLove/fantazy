const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = 3001;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ff_angles',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: false
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// API Routes

// Get all fantasy players with basic info
app.get('/api/players', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        gsis_id,
        player_name as name,
        position,
        team,
        jersey_number,
        headshot_url,
        height,
        weight,
        college,
        years_exp,
        entry_year,
        espn_id,
        sleeper_id,
        yahoo_id
      FROM players 
      WHERE position IN ('QB', 'RB', 'WR', 'TE', 'K')
        AND status = 'ACT'
      ORDER BY position, player_name
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get available games for a season
app.get('/api/games', async (req, res) => {
  try {
    const { season = 2024 } = req.query;
    
    const query = `
      SELECT 
        id,
        game_id,
        season,
        week,
        gameday,
        weekday,
        away_team,
        home_team,
        away_score,
        home_score,
        game_type
      FROM games 
      WHERE season = $1
      ORDER BY gameday, game_id
    `;
    
    const result = await pool.query(query, [season]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Get player seasonal stats
app.get('/api/players/:playerId/seasonal-stats', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season = 2024 } = req.query;
    
    const query = `
      SELECT 
        s.*,
        p.player_name,
        p.position,
        p.team
      FROM player_seasonal_stats s
      JOIN players p ON s.player_id = p.id
      WHERE s.player_id = $1 AND s.season = $2
    `;
    
    const result = await pool.query(query, [playerId, season]);
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching seasonal stats:', error);
    res.status(500).json({ error: 'Failed to fetch seasonal stats' });
  }
});

// Get player weekly stats
app.get('/api/players/:playerId/weekly-stats', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season = 2024, weeks } = req.query;
    
    let query = `
      SELECT 
        w.*,
        g.gameday,
        g.gametime,
        g.away_team,
        g.home_team,
        g.away_score,
        g.home_score,
        g.total_line,
        g.roof,
        g.temp,
        g.wind
      FROM player_weekly_stats w
      LEFT JOIN games g ON g.season = w.season 
        AND g.week = w.week 
        AND (g.away_team = w.recent_team OR g.home_team = w.recent_team)
      WHERE w.player_id = $1 AND w.season = $2
    `;
    
    const params = [playerId, season];
    
    // Add week filtering if specified
    if (weeks) {
      const weekArray = weeks.split(',').map(w => parseInt(w));
      query += ` AND w.week = ANY($3)`;
      params.push(weekArray);
    }
    
    query += ` ORDER BY w.week`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching weekly stats:', error);
    res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
});

// Get player NGS stats
app.get('/api/players/:playerId/ngs-stats', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season = 2024, type = 'all' } = req.query;
    
    const results = {};
    
    // Get NGS Passing stats
    if (type === 'all' || type === 'passing') {
      const passingQuery = `
        SELECT * FROM player_ngs_passing 
        WHERE player_id = $1 AND season = $2
        ORDER BY week
      `;
      const passingResult = await pool.query(passingQuery, [playerId, season]);
      results.passing = passingResult.rows;
    }
    
    // Get NGS Receiving stats
    if (type === 'all' || type === 'receiving') {
      const receivingQuery = `
        SELECT * FROM player_ngs_receiving 
        WHERE player_id = $1 AND season = $2
        ORDER BY week
      `;
      const receivingResult = await pool.query(receivingQuery, [playerId, season]);
      results.receiving = receivingResult.rows;
    }
    
    // Get NGS Rushing stats
    if (type === 'all' || type === 'rushing') {
      const rushingQuery = `
        SELECT * FROM player_ngs_rushing 
        WHERE player_id = $1 AND season = $2
        ORDER BY week
      `;
      const rushingResult = await pool.query(rushingQuery, [playerId, season]);
      results.rushing = rushingResult.rows;
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching NGS stats:', error);
    res.status(500).json({ error: 'Failed to fetch NGS stats' });
  }
});

// Get player stats for specific game
app.get('/api/players/:playerId/game/:gameId', async (req, res) => {
  try {
    const { playerId, gameId } = req.params;
    
    // Get game info
    const gameQuery = `
      SELECT * FROM games WHERE game_id = $1
    `;
    const gameResult = await pool.query(gameQuery, [gameId]);
    const game = gameResult.rows[0];
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Get weekly stats for this game
    const weeklyQuery = `
      SELECT * FROM player_weekly_stats 
      WHERE player_id = $1 AND season = $2 AND week = $3
    `;
    const weeklyResult = await pool.query(weeklyQuery, [playerId, game.season, game.week]);
    
    // Get NGS stats for this game
    const ngsResults = {};
    
    const ngsQueries = [
      { type: 'passing', table: 'player_ngs_passing' },
      { type: 'receiving', table: 'player_ngs_receiving' },
      { type: 'rushing', table: 'player_ngs_rushing' }
    ];
    
    for (const { type, table } of ngsQueries) {
      const ngsQuery = `
        SELECT * FROM ${table} 
        WHERE player_id = $1 AND season = $2 AND week = $3
      `;
      const ngsResult = await pool.query(ngsQuery, [playerId, game.season, game.week]);
      ngsResults[type] = ngsResult.rows[0] || null;
    }
    
    res.json({
      game: game,
      weekly_stats: weeklyResult.rows[0] || null,
      ngs_stats: ngsResults
    });
    
  } catch (error) {
    console.error('Error fetching game stats:', error);
    res.status(500).json({ error: 'Failed to fetch game stats' });
  }
});

// Get player props for a specific game (when available)
app.get('/api/players/:playerId/props/:gameId', async (req, res) => {
  try {
    const { playerId, gameId } = req.params;
    
    // This will be empty until 2025 season props become available
    const query = `
      SELECT * FROM player_props 
      WHERE player_id = $1 AND game_id = $2
    `;
    
    const result = await pool.query(query, [playerId, gameId]);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching player props:', error);
    res.status(500).json({ error: 'Failed to fetch player props' });
  }
});

// Get stats for date range (L3, L5, L10, SEASON)
app.get('/api/players/:playerId/range-stats', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season = 2024, range = 'SEASON' } = req.query;
    
    let weekFilter = '';
    let params = [playerId, season];
    
    if (range !== 'SEASON') {
      const gameCount = parseInt(range.substring(1)); // Extract number from L3, L5, L10
      weekFilter = `
        AND w.week >= (
          SELECT MAX(week) - $3 + 1 
          FROM player_weekly_stats 
          WHERE player_id = $1 AND season = $2
        )
      `;
      params.push(gameCount);
    }
    
    const query = `
      WITH weekly_data AS (
        SELECT 
          w.*,
          ROW_NUMBER() OVER (ORDER BY w.week DESC) as game_num
        FROM player_weekly_stats w
        WHERE w.player_id = $1 AND w.season = $2 ${weekFilter}
      )
      SELECT 
        COUNT(*) as games_played,
        AVG(passing_yards) as avg_passing_yards,
        AVG(rushing_yards) as avg_rushing_yards,
        AVG(receiving_yards) as avg_receiving_yards,
        AVG(passing_tds) as avg_passing_tds,
        AVG(rushing_tds) as avg_rushing_tds,
        AVG(receiving_tds) as avg_receiving_tds,
        AVG(receptions) as avg_receptions,
        AVG(targets) as avg_targets,
        AVG(carries) as avg_carries,
        AVG(attempts) as avg_attempts,
        AVG(fantasy_points) as avg_fantasy_points,
        AVG(fantasy_points_ppr) as avg_fantasy_points_ppr,
        AVG(passing_epa) as avg_passing_epa,
        AVG(rushing_epa) as avg_rushing_epa,
        AVG(receiving_epa) as avg_receiving_epa,
        AVG(target_share) as avg_target_share,
        AVG(air_yards_share) as avg_air_yards_share
      FROM weekly_data
    `;
    
    const result = await pool.query(query, params);
    res.json(result.rows[0] || null);
    
  } catch (error) {
    console.error('Error fetching range stats:', error);
    res.status(500).json({ error: 'Failed to fetch range stats' });
  }
});

// Get all player cards
app.get('/api/player-cards', async (req, res) => {
  try {
    const { timeframe, type, created_by } = req.query;
    
    let query = `
      SELECT 
        pc.id,
        pc.name,
        pc.description,
        pc.type,
        pc.timeframe,
        pc.position_qb,
        pc.position_rb,
        pc.position_wr,
        pc.position_te,
        pc.position_k,
        pc.graph_config,
        pc.created_by,
        pc.created_at,
        pc.updated_at,
        pc.is_default,
        ARRAY_AGG(
          pcf.field_name ORDER BY pcf.display_order
        ) as fields
      FROM player_cards pc
      LEFT JOIN player_card_fields pcf ON pc.id = pcf.player_card_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (timeframe) {
      paramCount++;
      query += ` AND pc.timeframe = $${paramCount}`;
      params.push(timeframe);
    }
    
    if (type) {
      paramCount++;
      query += ` AND pc.type = $${paramCount}`;
      params.push(type);
    }
    
    if (created_by) {
      paramCount++;
      query += ` AND pc.created_by = $${paramCount}`;
      params.push(created_by);
    }
    
    query += `
      GROUP BY pc.id, pc.name, pc.description, pc.type, pc.timeframe, 
               pc.position_qb, pc.position_rb, pc.position_wr, pc.position_te, pc.position_k,
               pc.graph_config, pc.created_by, pc.created_at, pc.updated_at, pc.is_default
      ORDER BY pc.is_default DESC, pc.created_at DESC
    `;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching player cards:', error);
    res.status(500).json({ error: 'Failed to fetch player cards' });
  }
});

// Get specific player card by ID
app.get('/api/player-cards/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    
    const query = `
      SELECT 
        pc.id,
        pc.name,
        pc.description,
        pc.type,
        pc.timeframe,
        pc.position_qb,
        pc.position_rb,
        pc.position_wr,
        pc.position_te,
        pc.position_k,
        pc.graph_config,
        pc.created_by,
        pc.created_at,
        pc.updated_at,
        pc.is_default,
        ARRAY_AGG(
          pcf.field_name ORDER BY pcf.display_order
        ) as fields
      FROM player_cards pc
      LEFT JOIN player_card_fields pcf ON pc.id = pcf.player_card_id
      WHERE pc.id = $1
      GROUP BY pc.id, pc.name, pc.description, pc.type, pc.timeframe, 
               pc.position_qb, pc.position_rb, pc.position_wr, pc.position_te, pc.position_k,
               pc.graph_config, pc.created_by, pc.created_at, pc.updated_at, pc.is_default
    `;
    
    const result = await pool.query(query, [cardId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player card not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching player card:', error);
    res.status(500).json({ error: 'Failed to fetch player card' });
  }
});

// Create new player card
app.post('/api/player-cards', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      name, 
      description, 
      type, 
      timeframe, 
      position_qb,
      position_rb,
      position_wr,
      position_te,
      position_k,
      fields, 
      graph_config, 
      created_by 
    } = req.body;
    
    // Insert player card
    const cardQuery = `
      INSERT INTO player_cards (name, description, type, timeframe, position_qb, position_rb, position_wr, position_te, position_k, graph_config, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;
    
    const cardResult = await client.query(cardQuery, [
      name, description, type, timeframe, position_qb, position_rb, position_wr, position_te, position_k, graph_config, created_by
    ]);
    
    const playerCardId = cardResult.rows[0].id;
    
    // Insert fields
    if (fields && fields.length > 0) {
      const fieldQuery = `
        INSERT INTO player_card_fields (player_card_id, field_name, display_order)
        VALUES ($1, $2, $3)
      `;
      
      for (let i = 0; i < fields.length; i++) {
        await client.query(fieldQuery, [playerCardId, fields[i], i + 1]);
      }
    }
    
    await client.query('COMMIT');
    
    // Fetch the created card with fields
    const createdCard = await pool.query(`
      SELECT 
        pc.id,
        pc.name,
        pc.description,
        pc.type,
        pc.timeframe,
        pc.position_qb,
        pc.position_rb,
        pc.position_wr,
        pc.position_te,
        pc.position_k,
        pc.graph_config,
        pc.created_by,
        pc.created_at,
        pc.updated_at,
        pc.is_default,
        ARRAY_AGG(
          pcf.field_name ORDER BY pcf.display_order
        ) as fields
      FROM player_cards pc
      LEFT JOIN player_card_fields pcf ON pc.id = pcf.player_card_id
      WHERE pc.id = $1
      GROUP BY pc.id, pc.name, pc.description, pc.type, pc.timeframe, 
               pc.position_qb, pc.position_rb, pc.position_wr, pc.position_te, pc.position_k,
               pc.graph_config, pc.created_by, pc.created_at, pc.updated_at, pc.is_default
    `, [playerCardId]);
    
    res.status(201).json(createdCard.rows[0]);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating player card:', error);
    res.status(500).json({ error: 'Failed to create player card' });
  } finally {
    client.release();
  }
});

// Delete player card
app.delete('/api/player-cards/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    
    const result = await pool.query('DELETE FROM player_cards WHERE id = $1 RETURNING *', [cardId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player card not found' });
    }
    
    res.json({ message: 'Player card deleted successfully' });
  } catch (error) {
    console.error('Error deleting player card:', error);
    res.status(500).json({ error: 'Failed to delete player card' });
  }
});

// Get available player card field definitions
app.get('/api/player-card-fields', async (req, res) => {
  try {
    const { position, timeframe, category } = req.query;
    
    let query = `
      SELECT 
        field_key,
        field_label,
        field_description,
        data_type,
        category,
        timeframe,
        format_type,
        position_qb,
        position_rb,
        position_wr,
        position_te,
        position_k,
        sort_order
      FROM player_card_field_definitions
      WHERE is_active = TRUE
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Filter by position if specified
    if (position && ['QB', 'RB', 'WR', 'TE', 'K'].includes(position.toUpperCase())) {
      paramCount++;
      query += ` AND position_${position.toLowerCase()} = $${paramCount}`;
      params.push(true);
    }
    
    // Filter by timeframe if specified
    if (timeframe && ['weekly', 'cumulative'].includes(timeframe)) {
      paramCount++;
      query += ` AND (timeframe = $${paramCount} OR timeframe = 'both')`;
      params.push(timeframe);
    }
    
    // Filter by category if specified
    if (category && ['basic', 'advanced', 'fantasy', 'efficiency', 'game_info'].includes(category)) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }
    
    query += ' ORDER BY sort_order, field_label';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching player card fields:', error);
    res.status(500).json({ error: 'Failed to fetch player card fields' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FFAngles API Server is running' });
});

app.listen(port, () => {
  console.log(`🚀 FFAngles API Server running at http://localhost:${port}`);
  console.log(`📊 Serving nfl_data_py data from PostgreSQL`);
});