import { Player } from '@/types/player'

interface PlayerInfoProps {
  player: Player
}

export default function PlayerInfo({ player }: PlayerInfoProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">{player.name}</h2>
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
  )
}