import { Player } from '@/types/player'

interface PlayerSelectorProps {
  players: Player[]
  onPlayerSelect: (player: Player | null) => void
}

export default function PlayerSelector({ players, onPlayerSelect }: PlayerSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(e.target.value)
    if (selectedIndex === -1) {
      onPlayerSelect(null)
    } else {
      onPlayerSelect(players[selectedIndex])
    }
  }

  return (
    <div className="text-center mb-8">
      <select
        onChange={handleChange}
        className="w-full max-w-md px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        defaultValue="-1"
      >
        <option value="-1">Select a player...</option>
        {players.map((player, index) => (
          <option key={index} value={index}>
            {player.name} ({player.position}) - {player.team}
          </option>
        ))}
      </select>
    </div>
  )
}