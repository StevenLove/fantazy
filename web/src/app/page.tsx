'use client'

import { useState, useEffect } from 'react'
import { Player, LeagueData } from '@/types/player'
import PositionSidebar from '@/components/PositionSidebar'
import PlayerListSidebar from '@/components/PlayerListSidebar'
import PlayerCard from '@/components/PlayerCard'

export default function Home() {
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])
  const [selectedPosition, setSelectedPosition] = useState<string | null>('ALL')
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart')
  const [gameFilter, setGameFilter] = useState<'L3' | 'L5' | 'L10' | 'SEASON'>('SEASON')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLeagueData()
  }, [])

  const loadLeagueData = async () => {
    try {
      const response = await fetch('/my_league_data.json')
      if (!response.ok) {
        throw new Error('Failed to load league data')
      }
      const data: LeagueData = await response.json()
      setLeagueData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handlePositionSelect = (position: string) => {
    setSelectedPosition(position)
  }

  const handlePlayerSelect = (player: Player) => {
    // Check if player is already selected
    if (selectedPlayers.some(p => p.name === player.name)) {
      return // Player already selected, do nothing
    }
    
    // Add player if we have less than 4 selected
    if (selectedPlayers.length < 4) {
      setSelectedPlayers(prev => [...prev, player])
    }
  }

  const handlePlayerRemove = (playerName: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.name !== playerName))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Position Filter Sidebar */}
      <PositionSidebar 
        selectedPosition={selectedPosition}
        onPositionSelect={handlePositionSelect}
      />

      {/* Player List Sidebar */}
      <PlayerListSidebar 
        players={leagueData?.players || []}
        selectedPlayers={selectedPlayers}
        onPlayerSelect={handlePlayerSelect}
        positionFilter={selectedPosition}
      />

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {selectedPlayers.length > 0 ? (
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              Fantasy Football Player Stats ({selectedPlayers.length}/4 selected)
            </h1>
            
            {/* Global Tab Navigation */}
            <div className="mb-6">
              <nav className="flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('chart')}
                  className={`py-3 px-1 border-b-2 font-medium text-base transition-colors ${
                    activeTab === 'chart'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Props Chart
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  className={`py-3 px-1 border-b-2 font-medium text-base transition-colors ${
                    activeTab === 'table'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Game Log
                </button>
              </nav>
            </div>
            
            {/* Game Filter Buttons */}
            <div className="mb-8">
              <div className="flex space-x-2">
                {(['L3', 'L5', 'L10', 'SEASON'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setGameFilter(filter)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      gameFilter === filter
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              {/* First row - players 1 and 2 */}
              <div className={`grid gap-6 ${
                selectedPlayers.length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'
              }`}>
                {selectedPlayers.slice(0, 2).map((player, index) => (
                  <PlayerCard 
                    key={`${player.name}-${index}`}
                    player={player} 
                    activeTab={activeTab}
                    gameFilter={gameFilter}
                    onRemove={handlePlayerRemove}
                  />
                ))}
              </div>
              
              {/* Second row - players 3 and 4 */}
              {selectedPlayers.length > 2 && (
                <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
                  {selectedPlayers.slice(2, 4).map((player, index) => (
                    <PlayerCard 
                      key={`${player.name}-${index + 2}`}
                      player={player} 
                      activeTab={activeTab}
                      gameFilter={gameFilter}
                      onRemove={handlePlayerRemove}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl text-gray-300 mb-4">🏈</div>
              <h2 className="text-2xl font-bold text-gray-600 mb-2">
                Welcome to Fantasy Football Stats
              </h2>
              <p className="text-gray-500">
                {selectedPosition && selectedPosition !== 'ALL'
                  ? `Select up to 4 ${selectedPosition === 'FLEX' ? 'FLEX' : selectedPosition} players from the sidebar to compare their stats`
                  : 'Select a position to filter players, then choose up to 4 players to compare their stats'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}