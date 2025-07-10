import { Player } from '@/types/player'
import PlayerDataTabs from './PlayerDataTabs'

interface PlayerCardProps {
  player: Player
  activeTab: 'chart' | 'table'
  gameFilter: 'L3' | 'L5' | 'L10' | 'SEASON'
  onRemove: (playerName: string) => void
}

export default function PlayerCard({ player, activeTab, gameFilter, onRemove }: PlayerCardProps) {
  const getPositionHeaderClass = (position: string) => {
    switch (position) {
      case 'QB':
        return {
          header: 'bg-red-100 border-b-red-200',
          text: 'text-red-900',
          border: 'border-red-300'
        }
      case 'RB':
        return {
          header: 'bg-teal-100 border-b-teal-200',
          text: 'text-teal-900',
          border: 'border-teal-300'
        }
      case 'WR':
        return {
          header: 'bg-purple-200 border-b-purple-300',
          text: 'text-purple-900',
          border: 'border-purple-300'
        }
      case 'TE':
        return {
          header: 'bg-orange-100 border-b-orange-200',
          text: 'text-orange-900',
          border: 'border-orange-300'
        }
      default:
        return {
          header: 'bg-gray-100 border-b-gray-200',
          text: 'text-gray-900',
          border: 'border-gray-300'
        }
    }
  }
  
  const positionStyles = getPositionHeaderClass(player.position)
  
  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 ${positionStyles.border}`}>
      {/* Player Info Header */}
      <div className={`${positionStyles.header} rounded-t-lg p-4 border-b`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className={`text-xl font-bold ${positionStyles.text}`}>{player.name}</h2>
            <span className={`${positionStyles.text} text-sm font-medium`}>
              {player.position}
            </span>
            <span className="bg-white bg-opacity-70 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded">
              {player.team || 'N/A'}
            </span>
          </div>
          <button
            onClick={() => onRemove(player.name)}
            className={`${positionStyles.text} hover:opacity-70 transition-opacity`}
            title="Remove player"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Player Data Tabs */}
      <div className="p-0">
        <PlayerDataTabs player={player} activeTab={activeTab} gameFilter={gameFilter} />
      </div>
    </div>
  )
}