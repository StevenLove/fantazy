'use client';

import { useState, useEffect } from 'react';
import { DataSelection, GameStats, WeeklyStats, SeasonalStats, RangeStats } from '@/types/nfl-data';
import { nflAPI, formatStatValue, getPositionColor } from '@/lib/nfl-api';

interface DataResultsProps {
  dataSelection: DataSelection;
  onBack: () => void;
}

export default function DataResults({ dataSelection, onBack }: DataResultsProps) {
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState<GameStats[]>([]);
  const [rangeData, setRangeData] = useState<(RangeStats | null)[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyStats[][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [dataSelection]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (dataSelection.viewType === 'specific-game' && dataSelection.selectedGame) {
        // Load specific game data for all selected players
        const playerIds = dataSelection.selectedPlayers.map(p => p.id);
        const gameStats = await nflAPI.getMultiPlayerGameStats(playerIds, dataSelection.selectedGame.game_id);
        setGameData(gameStats);
      } else if (dataSelection.viewType === 'range' && dataSelection.rangeType) {
        // Load range data for all selected players
        const playerIds = dataSelection.selectedPlayers.map(p => p.id);
        
        if (dataSelection.rangeDataTypes?.includes('advanced-trends') || dataSelection.rangeDataTypes?.includes('counting-trends')) {
          // Get weekly data for trend analysis
          const allWeeklyData = await nflAPI.getMultiPlayerWeeklyStats(playerIds, 2024);
          
          // Filter weeks based on range type
          const filteredWeeklyData = allWeeklyData.map(playerWeekly => {
            if (dataSelection.rangeType === 'SEASON') {
              return playerWeekly;
            } else {
              const gameCount = parseInt(dataSelection.rangeType!.substring(1));
              return playerWeekly.slice(-gameCount); // Get last N games
            }
          });
          
          setWeeklyData(filteredWeeklyData);
        }
        
        // Also get aggregated range stats
        const rangeStats = await nflAPI.getMultiPlayerRangeStats(playerIds, dataSelection.rangeType);
        setRangeData(rangeStats);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {dataSelection.viewType === 'specific-game' 
                ? `Game Analysis: Week ${dataSelection.selectedGame?.week}`
                : `Range Analysis: ${dataSelection.rangeType}`
              }
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {dataSelection.selectedPlayers.map(player => (
                <span
                  key={player.id}
                  className="px-2 py-1 rounded-md text-sm text-white"
                  style={{ backgroundColor: getPositionColor(player.position) }}
                >
                  {player.name} ({player.position})
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Selection
          </button>
        </div>
      </div>

      {/* Specific Game Results */}
      {dataSelection.viewType === 'specific-game' && (
        <div className="space-y-6">
          {dataSelection.gameDataTypes?.includes('game-log') && (
            <GameLogDisplay gameData={gameData} players={dataSelection.selectedPlayers} />
          )}
          
          {dataSelection.gameDataTypes?.includes('advanced-stats') && (
            <AdvancedStatsDisplay gameData={gameData} players={dataSelection.selectedPlayers} />
          )}
          
          {dataSelection.gameDataTypes?.includes('matchup-info') && (
            <MatchupInfoDisplay gameData={gameData} players={dataSelection.selectedPlayers} />
          )}
          
          {dataSelection.gameDataTypes?.includes('betting-lines') && (
            <BettingLinesDisplay gameData={gameData} players={dataSelection.selectedPlayers} />
          )}
        </div>
      )}

      {/* Range Results */}
      {dataSelection.viewType === 'range' && (
        <div className="space-y-6">
          {dataSelection.rangeDataTypes?.includes('counting-trends') && (
            <CountingTrendsDisplay weeklyData={weeklyData} players={dataSelection.selectedPlayers} />
          )}
          
          {dataSelection.rangeDataTypes?.includes('advanced-trends') && (
            <AdvancedTrendsDisplay weeklyData={weeklyData} players={dataSelection.selectedPlayers} />
          )}
          
          {/* Aggregated Range Stats */}
          <RangeStatsDisplay rangeData={rangeData} players={dataSelection.selectedPlayers} />
        </div>
      )}
    </div>
  );
}

// Component for displaying game log data
function GameLogDisplay({ gameData, players }: { gameData: GameStats[]; players: any[] }) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Game Log</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pass Yds</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pass TDs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rush Yds</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rush TDs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rec Yds</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rec TDs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fantasy Pts</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {gameData.map((data, index) => {
              const player = players[index];
              const stats = data.weekly_stats;
              return (
                <tr key={player.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{player.name}</div>
                        <div className="text-sm text-gray-500">{player.position} - {player.team}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatStatValue(stats?.passing_yards, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatStatValue(stats?.passing_tds, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatStatValue(stats?.rushing_yards, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatStatValue(stats?.rushing_tds, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatStatValue(stats?.receiving_yards, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatStatValue(stats?.receiving_tds, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatStatValue(stats?.fantasy_points_ppr, 1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Component for displaying advanced stats
function AdvancedStatsDisplay({ gameData, players }: { gameData: GameStats[]; players: any[] }) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Stats (NGS)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gameData.map((data, index) => {
          const player = players[index];
          return (
            <div key={player.id} className="p-4 border rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">{player.name}</h4>
              
              {/* NGS Passing Stats */}
              {data.ngs_stats.passing && (
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Passing (NGS)</h5>
                  <div className="text-xs space-y-1">
                    <div>Time to Throw: {formatStatValue(data.ngs_stats.passing.avg_time_to_throw)}s</div>
                    <div>CPOE: {formatStatValue(data.ngs_stats.passing.completion_percentage_above_expectation)}%</div>
                    <div>Air Yards: {formatStatValue(data.ngs_stats.passing.avg_intended_air_yards)}</div>
                  </div>
                </div>
              )}
              
              {/* NGS Receiving Stats */}
              {data.ngs_stats.receiving && (
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Receiving (NGS)</h5>
                  <div className="text-xs space-y-1">
                    <div>Separation: {formatStatValue(data.ngs_stats.receiving.avg_separation)} yds</div>
                    <div>YAC Above Expected: {formatStatValue(data.ngs_stats.receiving.avg_yac_above_expectation)}</div>
                    <div>Cushion: {formatStatValue(data.ngs_stats.receiving.avg_cushion)} yds</div>
                  </div>
                </div>
              )}
              
              {/* NGS Rushing Stats */}
              {data.ngs_stats.rushing && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Rushing (NGS)</h5>
                  <div className="text-xs space-y-1">
                    <div>Efficiency: {formatStatValue(data.ngs_stats.rushing.efficiency)}%</div>
                    <div>Yards Over Expected: {formatStatValue(data.ngs_stats.rushing.rush_yards_over_expected)}</div>
                    <div>Time to LOS: {formatStatValue(data.ngs_stats.rushing.avg_time_to_los)}s</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Component for displaying matchup info
function MatchupInfoDisplay({ gameData, players }: { gameData: GameStats[]; players: any[] }) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Matchup Information</h3>
      {gameData.length > 0 && gameData[0].game && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Game Details</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Matchup:</span>
              <div className="font-medium">{gameData[0].game.away_team} @ {gameData[0].game.home_team}</div>
            </div>
            <div>
              <span className="text-gray-600">Date:</span>
              <div className="font-medium">{new Date(gameData[0].game.gameday).toLocaleDateString()}</div>
            </div>
            <div>
              <span className="text-gray-600">Week:</span>
              <div className="font-medium">Week {gameData[0].game.week}</div>
            </div>
            <div>
              <span className="text-gray-600">Score:</span>
              <div className="font-medium">
                {gameData[0].game.away_score !== null 
                  ? `${gameData[0].game.away_score} - ${gameData[0].game.home_score}`
                  : 'TBD'
                }
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {gameData.map((data, index) => {
          const player = players[index];
          const opponent = data.game.away_team === player.team ? data.game.home_team : data.game.away_team;
          const isHome = data.game.home_team === player.team;
          
          return (
            <div key={player.id} className="p-3 border rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">{player.name}</span>
                <span className="text-sm text-gray-600">
                  {isHome ? 'vs' : '@'} {opponent}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Component for displaying betting lines (placeholder for when available)
function BettingLinesDisplay({ gameData, players }: { gameData: GameStats[]; players: any[] }) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Betting Lines</h3>
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          🏈 Betting lines will be available when 2025 season prop data becomes available.
        </p>
      </div>
    </div>
  );
}

// Component for displaying counting trends
function CountingTrendsDisplay({ weeklyData, players }: { weeklyData: WeeklyStats[][]; players: any[] }) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Counting Stats Trends</h3>
      <div className="space-y-4">
        {weeklyData.map((playerWeekly, playerIndex) => {
          const player = players[playerIndex];
          return (
            <div key={player.id} className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">{player.name}</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="text-left py-1">Week</th>
                      <th className="text-left py-1">Pass Yds</th>
                      <th className="text-left py-1">Rush Yds</th>
                      <th className="text-left py-1">Rec Yds</th>
                      <th className="text-left py-1">TDs</th>
                      <th className="text-left py-1">Fantasy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerWeekly.map((week, weekIndex) => (
                      <tr key={weekIndex}>
                        <td className="py-1">{week.week}</td>
                        <td className="py-1">{formatStatValue(week.passing_yards, 0)}</td>
                        <td className="py-1">{formatStatValue(week.rushing_yards, 0)}</td>
                        <td className="py-1">{formatStatValue(week.receiving_yards, 0)}</td>
                        <td className="py-1">{(week.passing_tds || 0) + (week.rushing_tds || 0) + (week.receiving_tds || 0)}</td>
                        <td className="py-1 font-medium">{formatStatValue(week.fantasy_points_ppr, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Component for displaying advanced trends
function AdvancedTrendsDisplay({ weeklyData, players }: { weeklyData: WeeklyStats[][]; players: any[] }) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Stats Trends</h3>
      <div className="space-y-4">
        {weeklyData.map((playerWeekly, playerIndex) => {
          const player = players[playerIndex];
          return (
            <div key={player.id} className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">{player.name}</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="text-left py-1">Week</th>
                      <th className="text-left py-1">Target Share</th>
                      <th className="text-left py-1">Air Yards Share</th>
                      <th className="text-left py-1">Pass EPA</th>
                      <th className="text-left py-1">Rush EPA</th>
                      <th className="text-left py-1">Rec EPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerWeekly.map((week, weekIndex) => (
                      <tr key={weekIndex}>
                        <td className="py-1">{week.week}</td>
                        <td className="py-1">{formatStatValue(week.target_share, 3)}</td>
                        <td className="py-1">{formatStatValue(week.air_yards_share, 3)}</td>
                        <td className="py-1">{formatStatValue(week.passing_epa, 2)}</td>
                        <td className="py-1">{formatStatValue(week.rushing_epa, 2)}</td>
                        <td className="py-1">{formatStatValue(week.receiving_epa, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Component for displaying aggregated range stats
function RangeStatsDisplay({ rangeData, players }: { rangeData: (RangeStats | null)[]; players: any[] }) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Range Averages</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Games</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pass Yds/G</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rush Yds/G</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rec Yds/G</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fantasy/G</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Share</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rangeData.map((data, index) => {
              const player = players[index];
              return (
                <tr key={player.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{player.name}</div>
                    <div className="text-sm text-gray-500">{player.position} - {player.team}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data?.games_played || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatStatValue(data?.avg_passing_yards, 1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatStatValue(data?.avg_rushing_yards, 1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatStatValue(data?.avg_receiving_yards, 1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatStatValue(data?.avg_fantasy_points_ppr, 1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatStatValue(data?.avg_target_share, 3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}