'use client'

import { useState, useEffect } from 'react'
import { Player, Game } from '@/types/nfl-data'
import { CustomPlayerCard } from '@/types/custom-player-cards'
import PlayerListSidebar from '@/components/PlayerListSidebar'
import PlayerCard from '@/components/PlayerCard'
import PlayerCardModal from '@/components/PlayerCardModal'
import { nflAPI } from '@/lib/nfl-api'

export default function Home() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])
  const [selectedPosition, setSelectedPosition] = useState<string | null>('ALL')
  const [activeTab, setActiveTab] = useState<'week' | 'season'>('week')
  const [gameFilter, setGameFilter] = useState<'L3' | 'L5' | 'L10' | 'SEASON'>('SEASON')
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedSeason, setSelectedSeason] = useState<number>(2024)
  const [availableGames, setAvailableGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [animatingPlayers, setAnimatingPlayers] = useState<string[]>([])
  const [availablePlayerCards, setAvailablePlayerCards] = useState<CustomPlayerCard[]>([])
  const [selectedPlayerCard, setSelectedPlayerCard] = useState<CustomPlayerCard | null>(null)
  const [showPlayerCardModal, setShowPlayerCardModal] = useState(false)
  const [editingPlayerCard, setEditingPlayerCard] = useState<CustomPlayerCard | null>(null)

  useEffect(() => {
    loadPlayers()
    loadPlayerCards()
  }, [])

  useEffect(() => {
    loadGames()
  }, [selectedSeason])

  // Set default player card based on active tab
  useEffect(() => {
    const defaultCard = availablePlayerCards.find(card => 
      (activeTab === 'week' && card.timeframe === 'weekly') ||
      (activeTab === 'season' && card.timeframe === 'cumulative')
    );
    if (defaultCard && (!selectedPlayerCard || selectedPlayerCard.timeframe !== (activeTab === 'week' ? 'weekly' : 'cumulative'))) {
      setSelectedPlayerCard(defaultCard);
    }
  }, [activeTab, availablePlayerCards, selectedPlayerCard])

  const loadPlayers = async () => {
    try {
      setLoading(true)
      const players = await nflAPI.getPlayers()
      setAllPlayers(players)
      
      console.log('Players loaded:', players.length, 'total players')
    } catch (err) {
      console.error('Error loading players:', err)
      setError(err instanceof Error ? err.message : 'Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  const loadGames = async () => {
    try {
      const games = await nflAPI.getGames(selectedSeason)
      console.log('Loaded games:', games.length, 'games for season', selectedSeason)
      console.log('Sample games:', games.slice(0, 3))
      setAvailableGames(games)
      
      // Set selected week to the latest available week
      if (games.length > 0) {
        const weeks = Array.from(new Set(games.map(g => g.week)))
        const latestWeek = Math.max(...weeks)
        setSelectedWeek(latestWeek)
      } else {
        setSelectedWeek(null)
      }
    } catch (err) {
      console.error('Error loading games:', err)
    }
  }

  const loadPlayerCards = async () => {
    try {
      const cards = await nflAPI.getPlayerCards()
      setAvailablePlayerCards(cards)
      console.log('Loaded player cards:', cards.length, 'cards')
    } catch (err) {
      console.error('Error loading player cards:', err)
      // Fallback to empty array if API fails
      setAvailablePlayerCards([])
    }
  }

  const handlePositionSelect = (position: string) => {
    setSelectedPosition(position)
  }

  const handlePlayerSelect = (player: Player) => {
    // Check if player is already selected - if so, remove them
    if (selectedPlayers.some(p => p.id === player.id)) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id))
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

  const handlePlayerRemove = (playerId: number) => {
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId))
  }

  const handleClearAll = () => {
    setSelectedPlayers([])
  }

  const handleCreatePlayerCard = () => {
    setEditingPlayerCard(null)
    setShowPlayerCardModal(true)
  }

  const handleEditPlayerCard = (card: CustomPlayerCard) => {
    setEditingPlayerCard(card)
    setShowPlayerCardModal(true)
  }

  const handlePlayerCardSave = (savedCard: CustomPlayerCard) => {
    // Add the new card to the list or update existing one
    setAvailablePlayerCards(prev => {
      const existingIndex = prev.findIndex(card => card.id === savedCard.id)
      if (existingIndex >= 0) {
        // Update existing card
        const updated = [...prev]
        updated[existingIndex] = savedCard
        return updated
      } else {
        // Add new card
        return [...prev, savedCard]
      }
    })
    
    // Set the newly created/edited card as selected
    setSelectedPlayerCard(savedCard)
  }

  const handlePlayerCardModalClose = () => {
    setShowPlayerCardModal(false)
    setEditingPlayerCard(null)
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
      {/* Player List Sidebar */}
      <PlayerListSidebar 
        players={allPlayers}
        selectedPlayers={selectedPlayers}
        onPlayerSelect={handlePlayerSelect}
        onClearAll={handleClearAll}
        positionFilter={selectedPosition}
        selectedCount={selectedPlayers.length}
      />

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-none mx-auto">
          {/* Filters Section */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {/* Position Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'ALL', label: 'ALL' },
                    { key: 'QB', label: 'QB' },
                    { key: 'RB', label: 'RB' },
                    { key: 'WR', label: 'WR' },
                    { key: 'TE', label: 'TE' },
                    { key: 'K', label: 'K' },
                    { key: 'FLEX', label: 'FLEX' }
                  ].map((position) => (
                    <button
                      key={position.key}
                      onClick={() => handlePositionSelect(position.key)}
                      className={`px-4 py-3 rounded font-medium text-base transition-colors ${
                        selectedPosition === position.key
                          ? (position.key === 'QB' ? 'bg-red-500 text-white' :
                             position.key === 'RB' ? 'bg-teal-500 text-white' :
                             position.key === 'WR' ? 'bg-purple-500 text-white' :
                             position.key === 'TE' ? 'bg-orange-500 text-white' :
                             position.key === 'K' ? 'bg-yellow-500 text-white' :
                             'bg-blue-600 text-white')
                          : (position.key === 'QB' ? 'bg-gray-200 text-gray-700 hover:bg-red-600 hover:text-white' :
                             position.key === 'RB' ? 'bg-gray-200 text-gray-700 hover:bg-teal-600 hover:text-white' :
                             position.key === 'WR' ? 'bg-gray-200 text-gray-700 hover:bg-purple-600 hover:text-white' :
                             position.key === 'TE' ? 'bg-gray-200 text-gray-700 hover:bg-orange-600 hover:text-white' :
                             position.key === 'K' ? 'bg-gray-200 text-gray-700 hover:bg-yellow-600 hover:text-white' :
                             'bg-gray-200 text-gray-700 hover:bg-gray-600 hover:text-white')
                      }`}
                    >
                      {position.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Season Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Season
                </label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                  className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base font-medium"
                >
                  {[2024, 2023, 2022, 2021, 2020].map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Week/Season Tab Navigation */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeframe
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('week')}
                  className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                    activeTab === 'week'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setActiveTab('season')}
                  className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                    activeTab === 'season'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Season
                </button>
              </div>
            </div>
            
            {/* Season Filter Buttons - Only show for Season tab */}
            {activeTab === 'season' && (
              <div className="flex space-x-2 mb-4">
                {(['SEASON', 'L10', 'L5', 'L3'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setGameFilter(filter)}
                    className={`px-3 py-1 rounded font-medium text-sm transition-colors ${
                      gameFilter === filter
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}

            {/* Week Filter - Show for Week tab */}
            {activeTab === 'week' && (
              <div className="flex flex-wrap gap-2 items-center mb-4">
                {availableGames.length === 0 ? (
                  <div className="text-gray-500">Loading games...</div>
                ) : (
                  Array.from(new Set(availableGames.map(g => g.week)))
                    .sort((a, b) => b - a)
                    .map((week, index, weeks) => (
                      <div key={week} className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedWeek(week)}
                          className={`px-3 py-1 rounded font-medium text-sm transition-colors ${
                            selectedWeek === week
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {week}
                        </button>
                        {/* Add vertical pipe after week 19 (before week 18 in descending order) */}
                        {week === 19 && weeks.includes(18) && (
                          <div className="h-6 w-px bg-gray-400 mx-1"></div>
                        )}
                      </div>
                    ))
                )}
              </div>
            )}
            
            {/* Player Card Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Player Card
              </label>
              <div className="flex flex-wrap gap-2">
                {availablePlayerCards
                  .filter(card => 
                    (activeTab === 'week' && card.timeframe === 'weekly') ||
                    (activeTab === 'season' && card.timeframe === 'cumulative')
                  )
                  .map((card) => (
                    <button
                      key={card.id}
                      onClick={() => setSelectedPlayerCard(card)}
                      className={`px-3 py-1 rounded font-medium text-sm transition-colors ${
                        selectedPlayerCard?.id === card.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title={card.description}
                    >
                      {card.name}
                    </button>
                  ))}
                <button
                  onClick={handleCreatePlayerCard}
                  className="px-3 py-1 rounded font-medium text-sm bg-green-200 text-green-700 hover:bg-green-300 transition-colors"
                  title="Create new player card"
                >
                  + Create
                </button>
              </div>
            </div>
          </div>

          {/* Player Cards Grid */}
          {selectedPlayers.length > 0 ? (
            <div className="space-y-8">
              {/* First row - players 1 and 2 */}
              <div className={`grid gap-8 transition-all duration-300 ease-in-out ${
                selectedPlayers.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
              }`}>
                {selectedPlayers.slice(0, 2).map((player, index) => {
                  const isAnimating = animatingPlayers.includes(player.name)
                  return (
                    <div
                      key={player.id}
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
                        selectedWeek={selectedWeek}
                        selectedSeason={selectedSeason}
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
                        key={player.id}
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
                          selectedWeek={selectedWeek}
                          selectedSeason={selectedSeason}
                          onRemove={handlePlayerRemove}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl text-gray-300 mb-4">🏈</div>
                <h2 className="text-2xl font-bold text-gray-600 mb-2">
                  Welcome to FFAngles
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

      {/* Player Card Modal */}
      <PlayerCardModal
        isOpen={showPlayerCardModal}
        onClose={handlePlayerCardModalClose}
        onSave={handlePlayerCardSave}
        editingCard={editingPlayerCard}
      />
    </div>
  )
}