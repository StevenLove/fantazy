import { Player } from '@/types/player'
import PlayerChart from './PlayerChart'
import StatsTable from './StatsTable'

interface PlayerDataTabsProps {
  player: Player
  activeTab: 'chart' | 'table'
  gameFilter: 'L3' | 'L5' | 'L10' | 'SEASON'
}

export default function PlayerDataTabs({ player, activeTab, gameFilter }: PlayerDataTabsProps) {
  // Check if player has game log data
  const hasData = player.game_log && player.game_log.length > 0;

  const tabs = [
    { id: 'chart', label: 'Props Chart', component: <PlayerChart player={player} gameFilter={gameFilter} /> },
    { id: 'table', label: 'Game Log', component: <StatsTable player={player} gameFilter={gameFilter} /> }
  ]

  // Show no data message if player has no game logs
  if (!hasData) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Game Data Available</h3>
          <p className="text-sm text-gray-500">
            This player doesn't have any recorded game log data for the 2024 season.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Tab Content */}
      <div className="p-0">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  )
}