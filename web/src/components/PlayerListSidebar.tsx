import { useState, useMemo } from 'react'
import { Player } from '@/types/player'

interface PlayerListSidebarProps {
  players: Player[]
  selectedPlayers: Player[]
  onPlayerSelect: (player: Player) => void
  positionFilter: string | null
}

export default function PlayerListSidebar({ 
  players, 
  selectedPlayers, 
  onPlayerSelect, 
  positionFilter 
}: PlayerListSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter players based on position and search term
  const filteredPlayers = useMemo(() => {
    let filtered = players

    // Apply position filter
    if (positionFilter && positionFilter !== 'ALL') {
      if (positionFilter === 'FLEX') {
        filtered = filtered.filter(player => 
          ['RB', 'WR', 'TE'].includes(player.position)
        )
      } else {
        filtered = filtered.filter(player => player.position === positionFilter)
      }
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name))
  }, [players, positionFilter, searchTerm])

  return (
    <div className="w-64 bg-gray-100 min-h-screen border-r border-gray-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-300 bg-white">
        <h2 className="text-lg font-bold text-gray-800 mb-3">
          {positionFilter && positionFilter !== 'ALL' ? (
            positionFilter === 'FLEX' ? 'FLEX Players' : `${positionFilter} Players`
          ) : 'All Players'}
        </h2>
        
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Player List */}
      <div className="overflow-y-auto max-h-[calc(100vh-140px)]">
        {filteredPlayers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'No players found' : 'Select a position to view players'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredPlayers.map((player, index) => {
              const isSelected = selectedPlayers.some(p => p.name === player.name)
              const isDisabled = selectedPlayers.length >= 4 && !isSelected
              
              return (
                <button
                  key={`${player.name}-${index}`}
                  onClick={() => onPlayerSelect(player)}
                  disabled={isDisabled}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isDisabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">{player.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {player.position} • {player.team}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {player.total_games}g
                  </div>
                </div>
              </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer with count */}
      <div className="p-3 bg-gray-50 border-t border-gray-300">
        <div className="text-xs text-gray-600 text-center">
          {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''} • {selectedPlayers.length}/4 selected
        </div>
      </div>
    </div>
  )
}