import { Player } from '@/types/player'
import PlayerChart from './PlayerChart'
import StatsTable from './StatsTable'

interface PlayerDataTabsProps {
  player: Player
  activeTab: 'chart' | 'table'
  gameFilter: 'L3' | 'L5' | 'L10' | 'SEASON'
}

export default function PlayerDataTabs({ player, activeTab, gameFilter }: PlayerDataTabsProps) {

  const tabs = [
    { id: 'chart', label: 'Props Chart', component: <PlayerChart player={player} gameFilter={gameFilter} /> },
    { id: 'table', label: 'Game Log', component: <StatsTable player={player} gameFilter={gameFilter} /> }
  ]

  return (
    <div>
      {/* Tab Content */}
      <div className="p-0">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  )
}