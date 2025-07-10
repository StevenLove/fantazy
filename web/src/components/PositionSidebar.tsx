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
]

export default function PositionSidebar({ selectedPosition, onPositionSelect }: PositionSidebarProps) {
  return (
    <div className="w-20 bg-gray-800 min-h-screen flex flex-col">
      <div className="p-4">
        <h2 className="text-white text-sm font-bold text-center mb-4">POS</h2>
        <div className="space-y-2">
          {positions.map((position) => (
            <button
              key={position.key}
              onClick={() => onPositionSelect(position.key)}
              className={`w-full py-3 px-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPosition === position.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              {position.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}