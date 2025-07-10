import { Player } from '@/types/player'
import PlayerDataTabs from './PlayerDataTabs'

interface PlayerCardProps {
  player: Player
  activeTab: 'chart' | 'table'
  gameFilter: 'L3' | 'L5' | 'L10' | 'SEASON'
  onRemove: (playerName: string) => void
}

export default function PlayerCard({ player, activeTab, gameFilter, onRemove }: PlayerCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-300">
      {/* Player Info Header */}
      <div className="bg-gray-50 rounded-t-lg p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{player.name}</h2>
          <button
            onClick={() => onRemove(player.name)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Remove player"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-medium text-gray-600 mb-2">Position</label>
            <span className="text-lg font-semibold text-gray-800">{player.position}</span>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-medium text-gray-600 mb-2">Team</label>
            <span className="text-lg font-semibold text-gray-800">{player.team || 'N/A'}</span>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-medium text-gray-600 mb-2">Total Games</label>
            <span className="text-lg font-semibold text-gray-800">{player.total_games}</span>
          </div>
        </div>
      </div>

      {/* Player Data Tabs */}
      <div className="p-0">
        <PlayerDataTabs player={player} activeTab={activeTab} gameFilter={gameFilter} />
      </div>
    </div>
  )
}