export const getPositionColors = (position: string) => {
  switch (position) {
    case 'QB':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        hover: 'hover:bg-red-200'
      }
    case 'RB':
      return {
        bg: 'bg-teal-100',
        text: 'text-teal-800',
        border: 'border-teal-200',
        hover: 'hover:bg-teal-200'
      }
    case 'WR':
      return {
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        border: 'border-indigo-200',
        hover: 'hover:bg-indigo-200'
      }
    case 'TE':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200',
        hover: 'hover:bg-orange-200'
      }
    case 'PK':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        hover: 'hover:bg-yellow-200'
      }
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
        hover: 'hover:bg-gray-200'
      }
  }
}