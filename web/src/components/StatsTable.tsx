import { Player } from '@/types/player'

interface StatsTableProps {
  player: Player
  gameFilter: 'L3' | 'L5' | 'L10' | 'SEASON'
}

export default function StatsTable({ player, gameFilter }: StatsTableProps) {
  if (!player.game_log || player.game_log.length === 0) {
    return (
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Game Log</h3>
        <p className="text-gray-600">No game data available</p>
      </div>
    )
  }

  // Apply game filter
  let filteredGameLog = player.game_log
  if (gameFilter !== 'SEASON') {
    const gameCount = parseInt(gameFilter.substring(1)) // Extract number from L3, L5, L10
    filteredGameLog = player.game_log.slice(-gameCount) // Take last N games
  }

  // Get all unique keys from filtered game logs
  const allKeys = new Set<string>()
  filteredGameLog.forEach(game => {
    Object.keys(game).forEach(key => {
      if (key !== '') { // Skip empty key
        allKeys.add(key)
      }
    })
  })

  const headers = Array.from(allKeys)

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Game Log</h3>
      <div className="overflow-x-auto max-h-96">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-800 sticky top-0">
              {headers.map((header, index) => (
                <th key={index} className="px-3 py-2 text-left border-b border-gray-200">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredGameLog.map((game, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {headers.map((header, headerIndex) => {
                  const value = game[header]
                  const displayValue = value !== undefined ? value : '-'
                  
                  return (
                    <td key={headerIndex} className="px-3 py-2 border-b border-gray-200">
                      {header === 'Score' && typeof displayValue === 'string' ? (
                        <span className={displayValue.startsWith('W') ? 'text-green-600 font-bold' : 
                                       displayValue.startsWith('L') ? 'text-red-600 font-bold' : ''}>
                          {displayValue}
                        </span>
                      ) : (
                        displayValue
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}