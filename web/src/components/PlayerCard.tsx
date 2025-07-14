'use client';

import { useState, useEffect } from 'react';
import { Player, WeeklyStats, SeasonalStats } from '@/types/nfl-data';
import { nflAPI, formatStatValue, getPositionColor } from '@/lib/nfl-api';

interface PlayerCardProps {
  player: Player;
  activeTab: 'week' | 'season';
  gameFilter: 'L3' | 'L5' | 'L10' | 'SEASON';
  selectedWeek?: number | null;
  selectedSeason: number;
  onRemove: (playerId: number) => void;
}

export default function PlayerCard({ player, activeTab, gameFilter, selectedWeek, selectedSeason, onRemove }: PlayerCardProps) {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [seasonalStats, setSeasonalStats] = useState<SeasonalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlayerData();
  }, [player.id, gameFilter, selectedWeek ?? 0, activeTab, selectedSeason]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [weekly, seasonal] = await Promise.all([
        nflAPI.getPlayerWeeklyStats(player.id, selectedSeason),
        nflAPI.getPlayerSeasonalStats(player.id, selectedSeason)
      ]);
      
      // Filter weekly stats based on view type
      let filteredWeekly = weekly;
      
      if (activeTab === 'week' && selectedWeek !== null) {
        // For Week view, show only the selected week
        filteredWeekly = weekly.filter(stat => stat.week === selectedWeek);
      } else if (activeTab === 'season' && gameFilter !== 'SEASON') {
        // For Season view, filter by game count
        const gameCount = parseInt(gameFilter.substring(1));
        filteredWeekly = weekly.slice(-gameCount);
      }
      
      setWeeklyStats(filteredWeekly);
      setSeasonalStats(seasonal);
    } catch (err) {
      console.error('Error loading player data:', err);
      setError('Failed to load player data');
    } finally {
      setLoading(false);
    }
  };

  const getPositionHeaderClass = (position: string) => {
    const color = getPositionColor(position);
    return {
      backgroundColor: `${color}20`,
      borderColor: `${color}40`,
      textColor: color
    };
  };

  const positionStyles = getPositionHeaderClass(player.position);


  const calculateAverages = (stats: WeeklyStats[]) => {
    if (stats.length === 0) return {};
    
    // Count valid (non-null, non-undefined) values for each stat
    const totals: any = {};
    const counts: any = {};
    
    stats.forEach(stat => {
      Object.keys(stat).forEach(key => {
        const value = (stat as any)[key];
        // Convert string numbers to actual numbers
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (typeof numValue === 'number' && !isNaN(numValue)) {
          totals[key] = (totals[key] || 0) + numValue;
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    });

    // Calculate averages only for stats that have valid data
    const averages: any = {};
    Object.keys(totals).forEach(key => {
      if (counts[key] > 0) {
        averages[key] = totals[key] / counts[key];
      }
    });
    
    return averages;
  };

  const averages = calculateAverages(weeklyStats);

  return (
    <div 
      className="bg-white rounded-lg shadow-lg border-2"
      style={{ borderColor: positionStyles.borderColor }}
    >
      {/* Player Info Header */}
      <div 
        className="rounded-t-lg p-4 border-b"
        style={{ backgroundColor: positionStyles.backgroundColor }}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {player.headshot_url && (
              <img 
                src={player.headshot_url} 
                alt={`${player.name} headshot`}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div>
              <h2 className="text-xl font-bold" style={{ color: positionStyles.textColor }}>
                {player.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium" style={{ color: positionStyles.textColor }}>
                  {player.position}
                </span>
                <span className="bg-white bg-opacity-70 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  {player.team}
                </span>
                {player.jersey_number && (
                  <span className="bg-white bg-opacity-70 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded">
                    #{player.jersey_number}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => onRemove(player.id)}
            className="hover:opacity-70 transition-opacity"
            style={{ color: positionStyles.textColor }}
            title="Remove player"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Player Data Content */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading stats...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div>

            {/* Content */}
            {activeTab === 'season' ? (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">
                  {gameFilter === 'SEASON' ? 'Season Totals' : `Last ${gameFilter.slice(1)} Games`}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* QB Season Stats */}
                  {player.position === 'QB' && (
                    <>
                      <div>
                        <span className="font-medium text-gray-600">Games Played:</span>
                        <div className="text-gray-900">{formatStatValue(weeklyStats.length, 0)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Completions:' : 'Completions/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.completions : averages.completions, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Attempts:' : 'Attempts/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.attempts : averages.attempts, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Pass Yards:' : 'Pass Yards/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.passing_yards : averages.passing_yards, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Pass TDs:' : 'Pass TDs/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.passing_tds : averages.passing_tds, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Interceptions:' : 'Interceptions/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.interceptions : averages.interceptions, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Sacks:' : 'Sacks/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.sacks : averages.sacks, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Fumbles Lost:' : 'Fumbles Lost/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? ((seasonalStats?.sack_fumbles_lost || 0) + (seasonalStats?.rushing_fumbles_lost || 0) + (seasonalStats?.receiving_fumbles_lost || 0)) : ((averages.sack_fumbles_lost || 0) + (averages.rushing_fumbles_lost || 0) + (averages.receiving_fumbles_lost || 0)), gameFilter === 'SEASON' ? 0 : 2)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Passing EPA:' : 'Passing EPA/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.passing_epa : averages.passing_epa, 2)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Rush Yards:' : 'Rush Yards/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.rushing_yards : averages.rushing_yards, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Rush TDs:' : 'Rush TDs/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.rushing_tds : averages.rushing_tds, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Rushing EPA:' : 'Rushing EPA/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.rushing_epa : averages.rushing_epa, 2)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Fantasy Pts:' : 'Fantasy Pts/G:'}</span>
                        <div className="text-gray-900 font-semibold">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.fantasy_points : averages.fantasy_points, 1)}</div>
                      </div>
                    </>
                  )}
                  
                  {/* RB Season Stats */}
                  {player.position === 'RB' && (
                    <>
                      <div>
                        <span className="font-medium text-gray-600">Games Played:</span>
                        <div className="text-gray-900">{formatStatValue(weeklyStats.length, 0)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Carries:' : 'Carries/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.carries : averages.carries, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Rush Yards:' : 'Rush Yards/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.rushing_yards : averages.rushing_yards, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Rush TDs:' : 'Rush TDs/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.rushing_tds : averages.rushing_tds, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Fumbles Lost:' : 'Fumbles Lost/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? ((seasonalStats?.sack_fumbles_lost || 0) + (seasonalStats?.rushing_fumbles_lost || 0) + (seasonalStats?.receiving_fumbles_lost || 0)) : ((averages.sack_fumbles_lost || 0) + (averages.rushing_fumbles_lost || 0) + (averages.receiving_fumbles_lost || 0)), gameFilter === 'SEASON' ? 0 : 2)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Rushing EPA:' : 'Rushing EPA/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.rushing_epa : averages.rushing_epa, 2)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Receptions:' : 'Receptions/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.receptions : averages.receptions, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Targets:' : 'Targets/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.targets : averages.targets, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Rec Yards:' : 'Rec Yards/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.receiving_yards : averages.receiving_yards, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Rec TDs:' : 'Rec TDs/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.receiving_tds : averages.receiving_tds, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Fantasy Pts (PPR):' : 'Fantasy Pts/G (PPR):'}</span>
                        <div className="text-gray-900 font-semibold">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.fantasy_points_ppr : averages.fantasy_points_ppr, 1)}</div>
                      </div>
                    </>
                  )}
                  
                  {/* WR/TE Season Stats */}
                  {(['WR', 'TE'].includes(player.position)) && (
                    <>
                      <div>
                        <span className="font-medium text-gray-600">Games Played:</span>
                        <div className="text-gray-900">{formatStatValue(weeklyStats.length, 0)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Receptions:' : 'Receptions/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.receptions : averages.receptions, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Targets:' : 'Targets/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.targets : averages.targets, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Rec Yards:' : 'Rec Yards/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.receiving_yards : averages.receiving_yards, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Rec TDs:' : 'Rec TDs/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.receiving_tds : averages.receiving_tds, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Fumbles Lost:' : 'Fumbles Lost/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? ((seasonalStats?.sack_fumbles_lost || 0) + (seasonalStats?.rushing_fumbles_lost || 0) + (seasonalStats?.receiving_fumbles_lost || 0)) : ((averages.sack_fumbles_lost || 0) + (averages.rushing_fumbles_lost || 0) + (averages.receiving_fumbles_lost || 0)), gameFilter === 'SEASON' ? 0 : 2)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Receiving EPA:' : 'Receiving EPA/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.receiving_epa : averages.receiving_epa, 2)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Rush Yards:' : 'Rush Yards/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.rushing_yards : averages.rushing_yards, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Rush TDs:' : 'Rush TDs/G:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.rushing_tds : averages.rushing_tds, gameFilter === 'SEASON' ? 0 : 1)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Target Share:' : 'Target Share:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.target_share : averages.target_share, 3)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Air Yards Share:' : 'Air Yards Share:'}</span>
                        <div className="text-gray-900">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.air_yards_share : averages.air_yards_share, 3)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">{gameFilter === 'SEASON' ? 'Fantasy Pts (PPR):' : 'Fantasy Pts/G (PPR):'}</span>
                        <div className="text-gray-900 font-semibold">{formatStatValue(gameFilter === 'SEASON' ? seasonalStats?.fantasy_points_ppr : averages.fantasy_points_ppr, 1)}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">
                  {selectedWeek ? `Week ${selectedWeek} Game Info` : 'Select a Week'}
                </h4>
                {weeklyStats.length > 0 ? (
                  <div className="space-y-6">
                    {weeklyStats.map((stat, index) => {
                      // Determine opponent team and home/away status
                      const isHome = stat.recent_team === stat.home_team;
                      const opponent = isHome ? stat.away_team : stat.home_team;
                      const homeAwayStatus = isHome ? 'Home' : 'Away';
                      
                      // Format game day
                      let gameDay = 'TBD';
                      if (stat.gameday) {
                        try {
                          const date = new Date(stat.gameday);
                          if (!isNaN(date.getTime())) {
                            gameDay = date.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            });
                          } else {
                            gameDay = stat.gameday;
                          }
                        } catch (e) {
                          console.error('Error parsing gameday:', stat.gameday, e);
                          gameDay = stat.gameday || 'TBD';
                        }
                      }
                      
                      // Format game time
                      let gameTime = 'TBD';
                      if (stat.gametime) {
                        try {
                          const today = new Date().toISOString().split('T')[0];
                          const dateTimeStr = `${today}T${stat.gametime}`;
                          const date = new Date(dateTimeStr);
                          
                          if (!isNaN(date.getTime())) {
                            gameTime = date.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                              timeZone: 'America/New_York'
                            });
                          } else {
                            gameTime = stat.gametime;
                          }
                        } catch (e) {
                          console.error('Error parsing gametime:', stat.gametime, e);
                          gameTime = stat.gametime || 'TBD';
                        }
                      }
                      
                      // Check if game is completed
                      const isGameCompleted = stat.away_score !== null && stat.home_score !== null;
                      const finalScore = isGameCompleted 
                        ? `${stat.away_team} ${stat.away_score} - ${stat.home_score} ${stat.home_team}`
                        : 'Game not completed';
                      
                      return (
                        <div key={index} className="space-y-4">
                          {/* Matchup Section */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h5 className="font-semibold text-gray-800 mb-3">Matchup</h5>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-600">{homeAwayStatus}</span>
                                <div className="text-gray-900 font-medium">vs {opponent || 'TBD'}</div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Date - Time</span>
                                <div className="text-gray-900">{gameDay} - {gameTime}</div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Total Line</span>
                                <div className="text-gray-900">{stat.total_line || 'N/A'}</div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Conditions</span>
                                <div className="text-gray-900">{stat.roof || 'N/A'} • {stat.temp ? `${stat.temp}°F` : 'N/A'} • {stat.wind ? `${stat.wind} mph` : 'N/A'}</div>
                              </div>
                            </div>
                            {isGameCompleted && (
                              <div className="mt-2 text-sm">
                                <div className="font-medium text-gray-600">Final:</div>
                                <div className="text-gray-900">{finalScore}</div>
                              </div>
                            )}
                          </div>
                          
                          {/* Player Stats or Projections Section */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h5 className="font-semibold text-gray-800 mb-3">
                              {isGameCompleted ? 'Player Stats' : 'Projections'}
                            </h5>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {/* QB Stats */}
                              {player.position === 'QB' && (
                                <>
                                  <div>
                                    <span className="font-medium text-gray-600">Completions/Attempts:</span>
                                    <div className="text-gray-900">{stat.completions || 0}/{stat.attempts || 0}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Passing TDs:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.passing_tds, 0)}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Interceptions:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.interceptions, 0)}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Sacks:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.sacks, 0)}</div>
                                  </div>
                                  <div className="col-span-2 grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-600">Rushes:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.carries, 0)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Rush Yards:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.rushing_yards, 0)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Rush TDs:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.rushing_tds, 0)}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Fumbles Lost:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.fumbles_lost, 0)}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Passing EPA:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.passing_epa, 2)}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Fantasy Points:</span>
                                    <div className="text-gray-900 font-semibold">{formatStatValue(stat.fantasy_points, 1)}</div>
                                  </div>
                                </>
                              )}
                              
                              {/* RB Stats */}
                              {player.position === 'RB' && (
                                <>
                                  <div className="col-span-2 grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-600">Rushes:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.carries, 0)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Rush Yards:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.rushing_yards, 0)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Rush TDs:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.rushing_tds, 0)}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Fumbles Lost:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.fumbles_lost, 0)}</div>
                                  </div>
                                  <div className="col-span-2 grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-600">Receptions:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.receptions, 0)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Targets:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.targets, 0)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Rec Yards:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.receiving_yards, 0)}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Receiving TDs:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.receiving_tds, 0)}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Rushing EPA:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.rushing_epa, 2)}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Fantasy Points (PPR):</span>
                                    <div className="text-gray-900 font-semibold">{formatStatValue(stat.fantasy_points_ppr, 1)}</div>
                                  </div>
                                </>
                              )}
                              
                              {/* WR/TE Stats */}
                              {(['WR', 'TE'].includes(player.position)) && (
                                <>
                                  <div className="col-span-2 grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-600">Receptions:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.receptions, 0)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Targets:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.targets, 0)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Rec Yards:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.receiving_yards, 0)}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Receiving TDs:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.receiving_tds, 0)}</div>
                                  </div>
                                  <div className="col-span-2 grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-600">Rushes:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.carries, 0)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Rush Yards:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.rushing_yards, 0)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-600">Rush TDs:</span>
                                      <div className="text-gray-900">{formatStatValue(stat.rushing_tds, 0)}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Fumbles Lost:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.fumbles_lost, 0)}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Receiving EPA:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.receiving_epa, 2)}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Target Share:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.target_share, 3)}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Air Yards Share:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.air_yards_share, 3)}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">WOPR:</span>
                                    <div className="text-gray-900">{formatStatValue(stat.wopr, 3)}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Fantasy Points (PPR):</span>
                                    <div className="text-gray-900 font-semibold">{formatStatValue(stat.fantasy_points_ppr, 1)}</div>
                                  </div>
                                </>
                              )}
                              
                              {/* Kicker - placeholder */}
                              {player.position === 'K' && (
                                <div className="col-span-2 text-center text-gray-500">
                                  Kicker stats evaluation needed
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-4">
                    No game data available for this week
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}