'use client'

import { useState, useEffect, useRef } from 'react'
import { Player, LeagueData } from '@/types/player'
import PositionSidebar from '@/components/PositionSidebar'
import PlayerListSidebar from '@/components/PlayerListSidebar'
import PlayerCard from '@/components/PlayerCard'

export default function Home() {
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null)
  const [teamData, setTeamData] = useState<LeagueData | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])
  const [selectedPosition, setSelectedPosition] = useState<string | null>('ALL')
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart')
  const [gameFilter, setGameFilter] = useState<'L3' | 'L5' | 'L10' | 'SEASON'>('SEASON')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [animatingPlayers, setAnimatingPlayers] = useState<string[]>([])

  useEffect(() => {
    loadLeagueData()
    loadTeamData()
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

  const loadTeamData = async () => {
    try {
      const response = await fetch('/my_team.json')
      if (!response.ok) {
        throw new Error('Failed to load team data')
      }
      const data: LeagueData = await response.json()
      console.log('Team data loaded:', data.players?.length, 'players')
      setTeamData(data)
    } catch (err) {
      console.error('Failed to load team data:', err)
    }
  }

  const handlePositionSelect = (position: string) => {
    setSelectedPosition(position)
  }

  const handlePlayerSelect = (player: Player) => {
    // Check if player is already selected - if so, remove them
    if (selectedPlayers.some(p => p.name === player.name)) {
      setSelectedPlayers(prev => prev.filter(p => p.name !== player.name))
      return
    }
    
    // Add player if we have less than 4 selected
    if (selectedPlayers.length < 4) {
      setAnimatingPlayers(prev => [...prev, player.name])
      setSelectedPlayers(prev => [...prev, player])
      
      // Remove from animating after animation completes
      setTimeout(() => {
        setAnimatingPlayers(prev => prev.filter(name => name !== player.name))
      }, 300)
    }
  }

  const handlePlayerRemove = (playerName: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.name !== playerName))
  }

  const handleClearAll = () => {
    setSelectedPlayers([])
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
        players={selectedPosition === 'MY_TEAM' ? (teamData?.players || []) : (leagueData?.players || [])}
        selectedPlayers={selectedPlayers}
        onPlayerSelect={handlePlayerSelect}
        onClearAll={handleClearAll}
        positionFilter={selectedPosition}
      />

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {selectedPlayers.length > 0 ? (
          <div className="max-w-none mx-auto">
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
                    className={`px-2 py-1 rounded font-medium text-xs transition-colors ${
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
            <div className="space-y-8">
              {/* Single grid that handles all players with animations */}
              <div className="space-y-8">
                {/* First row - always players 1 and 2 */}
                <div className={`grid gap-8 transition-all duration-300 ease-in-out ${
                  selectedPlayers.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
                }`}>
                  {selectedPlayers.slice(0, 2).map((player, index) => {
                    const isAnimating = animatingPlayers.includes(player.name)
                    return (
                      <div
                        key={player.name}
                        className={`transition-all duration-300 ease-in-out transform ${
                          isAnimating ? 'animate-bounce-in' : ''
                        }`}
                        style={{ 
                          opacity: isAnimating ? 0 : 1,
                          transform: isAnimating ? 'translateY(20px) scale(0.95)' : 'translateY(0px) scale(1)',
                          transition: 'all 0.3s ease-in-out',
                          animation: isAnimating ? 'slideInUp 0.3s ease-out forwards' : undefined
                        }}
                      >
                        <PlayerCard 
                          player={player} 
                          activeTab={activeTab}
                          gameFilter={gameFilter}
                          onRemove={handlePlayerRemove}
                        />
                      </div>
                    )
                  })}
                </div>
                
                {/* Second row - players 3 and 4 */}
                {selectedPlayers.length > 2 && (
                  <div className="grid gap-8 grid-cols-1 lg:grid-cols-2 transition-all duration-300 ease-in-out">
                    {selectedPlayers.slice(2, 4).map((player, index) => {
                      const isAnimating = animatingPlayers.includes(player.name)
                      return (
                        <div
                          key={player.name}
                          className={`transition-all duration-300 ease-in-out transform ${
                            isAnimating ? 'animate-bounce-in' : ''
                          }`}
                          style={{ 
                            opacity: isAnimating ? 0 : 1,
                            transform: isAnimating ? 'translateY(20px) scale(0.95)' : 'translateY(0px) scale(1)',
                            transition: 'all 0.3s ease-in-out',
                            animation: isAnimating ? 'slideInUp 0.3s ease-out forwards' : undefined
                          }}
                        >
                          <PlayerCard 
                            player={player} 
                            activeTab={activeTab}
                            gameFilter={gameFilter}
                            onRemove={handlePlayerRemove}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
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