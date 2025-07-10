import { getPositionColors } from '@/lib/positionColors'

interface PositionSidebarProps {
  selectedPosition: string | null
  onPositionSelect: (position: string) => void
}

const positions = [
  { key: 'ALL', label: 'ALL' },
  { key: 'QB', label: 'QB' },
  { key: 'RB', label: 'RB' },
  { key: 'WR', label: 'WR' },
  { key: 'TE', label: 'TE' },
  { key: 'FLEX', label: 'FLEX' },
  { key: 'MY_TEAM', label: 'MY TEAM' },
]

export default function PositionSidebar({ selectedPosition, onPositionSelect }: PositionSidebarProps) {
  return (
    <div className="w-28 bg-gray-800 min-h-screen flex flex-col">
      <div className="p-4">
        <h2 className="text-white text-sm font-bold text-center mb-4">POS</h2>
        <div className="space-y-2">
          {positions.map((position) => {
            const isSelected = selectedPosition === position.key
            
            let buttonClass = 'w-full py-4 px-3 rounded-lg text-base font-medium transition-colors '
            
            if (isSelected) {
              switch (position.key) {
                case 'QB':
                  buttonClass += 'bg-red-500 text-white'
                  break
                case 'RB':
                  buttonClass += 'bg-teal-500 text-white'
                  break
                case 'WR':
                  buttonClass += 'bg-purple-500 text-white'
                  break
                case 'TE':
                  buttonClass += 'bg-orange-500 text-white'
                  break
                default:
                  buttonClass += 'bg-blue-600 text-white'
              }
            } else {
              switch (position.key) {
                case 'QB':
                  buttonClass += 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white'
                  break
                case 'RB':
                  buttonClass += 'bg-gray-700 text-gray-300 hover:bg-teal-600 hover:text-white'
                  break
                case 'WR':
                  buttonClass += 'bg-gray-700 text-gray-300 hover:bg-purple-600 hover:text-white'
                  break
                case 'TE':
                  buttonClass += 'bg-gray-700 text-gray-300 hover:bg-orange-600 hover:text-white'
                  break
                default:
                  buttonClass += 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }
            }
            
            return (
              <button
                key={position.key}
                onClick={() => onPositionSelect(position.key)}
                className={buttonClass}
              >
                {position.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}