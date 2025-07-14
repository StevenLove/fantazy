const API_BASE_URL = 'http://localhost:3001/api';

interface ApiPlayer {
  id: number;
  name: string;
  slug: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'PK';
  team: string;
  espn_headshot?: string;
}

interface ApiGameLog {
  week: string;
  matchup: string;
  score: string;
  spread_result: string;
  prop_line: number | null;
  qbr: number | null;
  pass_yds: number | null;
  pass_tds: number | null;
  pass_cmps: number | null;
  pass_atts: number | null;
  ints: number | null;
  rush_td: number | null;
  rush_yds: number | null;
  rush_atts: number | null;
  recs: number | null;
  rec_yds: number | null;
  rec_tds: number | null;
  tds_scored: number | null;
  created_at: string;
}

export async function fetchPlayers(): Promise<ApiPlayer[]> {
  const response = await fetch(`${API_BASE_URL}/players`);
  if (!response.ok) {
    throw new Error('Failed to fetch players');
  }
  return response.json();
}

export async function fetchPlayerGameLogs(playerId: number): Promise<ApiGameLog[]> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/game-logs`);
  if (!response.ok) {
    throw new Error('Failed to fetch game logs');
  }
  return response.json();
}

// Transform API data to match existing frontend types
export function transformApiPlayerToPlayer(apiPlayer: ApiPlayer, gameLogs: ApiGameLog[]): import('@/types/player').Player {
  const transformedGameLogs = gameLogs.map(log => ({
    Week: log.week,
    Matchup: log.matchup || '',
    Score: log.score || '',
    "Spread Result": log.spread_result || '',
    "Prop Line": log.prop_line || 0,
    "": '',
    QBR: log.qbr || undefined,
    "PASS YDS": log.pass_yds || undefined,
    "PASS TDS": log.pass_tds || undefined,
    "PASS CMPS": log.pass_cmps || undefined,
    "PASS ATTS": log.pass_atts || undefined,
    INTS: log.ints || undefined,
    "RUSH TD": log.rush_td || undefined,
    "Rush YDS": log.rush_yds || undefined,
    "Rush ATTS": log.rush_atts || undefined,
    "TDS SCORED": log.tds_scored || undefined,
    REC: log.recs || undefined,
    "REC YDS": log.rec_yds || undefined,
    "REC TD": log.rec_tds || undefined,
  }));

  // Calculate season averages
  const seasonAverages = calculateSeasonAverages(transformedGameLogs);

  return {
    name: apiPlayer.name,
    slug: apiPlayer.slug,
    position: apiPlayer.position,
    team: apiPlayer.team,
    espn_headshot: apiPlayer.espn_headshot,
    game_log: transformedGameLogs,
    season_averages: seasonAverages,
    total_games: transformedGameLogs.length,
    scrape_timestamp: new Date().toISOString(),
  };
}

function calculateSeasonAverages(gameLogs: any[]): any {
  if (gameLogs.length === 0) return {};

  const totals: any = {};
  const counts: any = {};

  gameLogs.forEach(log => {
    Object.keys(log).forEach(key => {
      if (typeof log[key] === 'number' && key !== 'Week') {
        totals[key] = (totals[key] || 0) + log[key];
        counts[key] = (counts[key] || 0) + 1;
      }
    });
  });

  const averages: any = {};
  Object.keys(totals).forEach(key => {
    averages[key] = totals[key] / counts[key];
  });

  return averages;
}