// New API layer for nfl_data_py backend
import {
  Player,
  Game,
  SeasonalStats,
  WeeklyStats,
  NGSStats,
  GameStats,
  RangeStats,
  PlayerProps,
  RangeType
} from '@/types/nfl-data';
import { CustomPlayerCard, CreatePlayerCardRequest } from '@/types/custom-player-cards';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class NFLDataAPI {
  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return response.json();
  }

  // Player endpoints
  async getPlayers(): Promise<Player[]> {
    return this.request<Player[]>('/players');
  }

  async getPlayersByPosition(position: string): Promise<Player[]> {
    const players = await this.getPlayers();
    return players.filter(player => player.position === position);
  }

  // Game endpoints
  async getGames(season = 2024): Promise<Game[]> {
    return this.request<Game[]>(`/games?season=${season}`);
  }

  async getGamesByWeek(season = 2024, week: number): Promise<Game[]> {
    const games = await this.getGames(season);
    return games.filter(game => game.week === week);
  }

  // Player stats endpoints
  async getPlayerSeasonalStats(playerId: number, season = 2024): Promise<SeasonalStats | null> {
    return this.request<SeasonalStats | null>(`/players/${playerId}/seasonal-stats?season=${season}`);
  }

  async getPlayerWeeklyStats(playerId: number, season = 2024, weeks?: number[]): Promise<WeeklyStats[]> {
    let endpoint = `/players/${playerId}/weekly-stats?season=${season}`;
    if (weeks && weeks.length > 0) {
      endpoint += `&weeks=${weeks.join(',')}`;
    }
    return this.request<WeeklyStats[]>(endpoint);
  }

  async getPlayerNGSStats(playerId: number, season = 2024, type: 'all' | 'passing' | 'receiving' | 'rushing' = 'all'): Promise<NGSStats> {
    return this.request<NGSStats>(`/players/${playerId}/ngs-stats?season=${season}&type=${type}`);
  }

  async getPlayerGameStats(playerId: number, gameId: string): Promise<GameStats> {
    return this.request<GameStats>(`/players/${playerId}/game/${gameId}`);
  }

  async getPlayerRangeStats(playerId: number, range: RangeType, season = 2024): Promise<RangeStats | null> {
    return this.request<RangeStats | null>(`/players/${playerId}/range-stats?season=${season}&range=${range}`);
  }

  async getPlayerProps(playerId: number, gameId: string): Promise<PlayerProps[]> {
    // This will be empty until 2025 season props are available
    return this.request<PlayerProps[]>(`/players/${playerId}/props/${gameId}`);
  }

  // Multi-player comparison methods
  async getMultiPlayerSeasonalStats(playerIds: number[], season = 2024): Promise<(SeasonalStats | null)[]> {
    const promises = playerIds.map(id => this.getPlayerSeasonalStats(id, season));
    return Promise.all(promises);
  }

  async getMultiPlayerWeeklyStats(playerIds: number[], season = 2024, weeks?: number[]): Promise<WeeklyStats[][]> {
    const promises = playerIds.map(id => this.getPlayerWeeklyStats(id, season, weeks));
    return Promise.all(promises);
  }

  async getMultiPlayerGameStats(playerIds: number[], gameId: string): Promise<GameStats[]> {
    const promises = playerIds.map(id => this.getPlayerGameStats(id, gameId));
    return Promise.all(promises);
  }

  async getMultiPlayerRangeStats(playerIds: number[], range: RangeType, season = 2024): Promise<(RangeStats | null)[]> {
    const promises = playerIds.map(id => this.getPlayerRangeStats(id, range, season));
    return Promise.all(promises);
  }

  // Utility methods for data processing
  getWeeksFromRange(range: RangeType, allWeeks: number[]): number[] {
    if (range === 'SEASON') {
      return allWeeks;
    }
    
    const gameCount = parseInt(range.substring(1)); // Extract number from L3, L5, L10
    const sortedWeeks = [...allWeeks].sort((a, b) => b - a); // Sort descending (most recent first)
    return sortedWeeks.slice(0, gameCount);
  }

  getOpponentFromGame(game: Game, playerTeam: string): string {
    return game.away_team === playerTeam ? game.home_team : game.away_team;
  }

  getGameResult(game: Game, playerTeam: string): 'W' | 'L' | 'T' | 'TBD' {
    if (game.away_score === null || game.home_score === null) return 'TBD';
    
    const isHome = game.home_team === playerTeam;
    const playerScore = isHome ? game.home_score : game.away_score;
    const opponentScore = isHome ? game.away_score : game.home_score;
    
    if (playerScore > opponentScore) return 'W';
    if (playerScore < opponentScore) return 'L';
    return 'T';
  }

  // Player Card API methods
  async getPlayerCards(timeframe?: 'weekly' | 'cumulative', type?: 'data_display' | 'graph', created_by?: string): Promise<CustomPlayerCard[]> {
    let endpoint = '/player-cards';
    const params = new URLSearchParams();
    
    if (timeframe) params.append('timeframe', timeframe);
    if (type) params.append('type', type);
    if (created_by) params.append('created_by', created_by);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.request<CustomPlayerCard[]>(endpoint);
  }

  async getPlayerCard(cardId: string): Promise<CustomPlayerCard> {
    return this.request<CustomPlayerCard>(`/player-cards/${cardId}`);
  }

  async createPlayerCard(cardData: CreatePlayerCardRequest): Promise<CustomPlayerCard> {
    const response = await fetch(`${API_BASE_URL}/player-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cardData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create player card');
    }
    return response.json();
  }

  async deletePlayerCard(cardId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/player-cards/${cardId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete player card');
    }
  }

  // Get available player card field definitions
  async getPlayerCardFields(position?: string, timeframe?: 'weekly' | 'cumulative', category?: string): Promise<any[]> {
    let endpoint = '/player-card-fields';
    const params = new URLSearchParams();
    
    if (position) params.append('position', position);
    if (timeframe) params.append('timeframe', timeframe);
    if (category) params.append('category', category);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.request<any[]>(endpoint);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/health');
  }
}

export const nflAPI = new NFLDataAPI();

// Helper functions for data transformation and display
export function formatStatValue(value: number | undefined | null, decimals = 1): string {
  if (value === undefined || value === null || isNaN(value)) return '-';
  return Number(value).toFixed(decimals);
}

export function getPositionColor(position: string): string {
  const colors: Record<string, string> = {
    QB: '#EF4444', // Red
    RB: '#10B981', // Green  
    WR: '#8B5CF6', // Purple
    TE: '#F59E0B', // Orange
    K: '#EAB308'   // Yellow
  };
  return colors[position] || '#6B7280'; // Gray fallback
}

export function calculateFantasyPoints(stats: WeeklyStats, isPPR = true): number {
  let points = 0;
  
  // Passing: 1 point per 25 yards, 4 points per TD, -2 per INT
  if (stats.passing_yards) points += stats.passing_yards / 25;
  if (stats.passing_tds) points += stats.passing_tds * 4;
  if (stats.interceptions) points -= stats.interceptions * 2;
  
  // Rushing: 1 point per 10 yards, 6 points per TD
  if (stats.rushing_yards) points += stats.rushing_yards / 10;
  if (stats.rushing_tds) points += stats.rushing_tds * 6;
  
  // Receiving: 1 point per 10 yards, 6 points per TD
  if (stats.receiving_yards) points += stats.receiving_yards / 10;
  if (stats.receiving_tds) points += stats.receiving_tds * 6;
  
  // PPR: 1 point per reception
  if (isPPR && stats.receptions) points += stats.receptions;
  
  return Math.round(points * 100) / 100;
}