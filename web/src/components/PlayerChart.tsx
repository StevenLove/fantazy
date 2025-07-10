'use client'

import { useEffect, useRef } from 'react'
import { Player } from '@/types/player'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)

interface PlayerChartProps {
  player: Player
  gameFilter: 'L3' | 'L5' | 'L10' | 'SEASON'
}

export default function PlayerChart({ player, gameFilter }: PlayerChartProps) {
  const chartRef = useRef<ChartJS>(null)

  // Determine chart configuration based on position
  const getChartConfig = () => {
    switch (player.position) {
      case 'QB':
        return {
          title: 'Passing Yards vs Prop Line',
          yardColumn: 'PASS YDS'
        }
      case 'RB':
        return {
          title: 'Rushing Yards vs Prop Line',
          yardColumn: 'Rush YDS'
        }
      case 'WR':
      case 'TE':
        return {
          title: 'Receiving Yards vs Prop Line',
          yardColumn: 'REC YDS'
        }
      default:
        return {
          title: 'Yards vs Prop Line',
          yardColumn: 'PASS YDS'
        }
    }
  }

  const { title, yardColumn } = getChartConfig()

  // Process game data for chart
  const processGameData = () => {
    if (!player.game_log || player.game_log.length === 0) {
      return { labels: [], datasets: [] }
    }

    // Filter games with the relevant yard column
    let gameData = player.game_log.filter(game => 
      game[yardColumn] !== undefined && game[yardColumn] !== null
    )

    // Apply game filter
    if (gameFilter !== 'SEASON') {
      const gameCount = parseInt(gameFilter.substring(1)) // Extract number from L3, L5, L10
      gameData = gameData.slice(0, gameCount) // Take first N games (which are the most recent)
    }

    // Convert week values to numbers for sorting
    const gameDataWithNumericWeeks = gameData.map(game => {
      let weekNum = game.Week
      if (typeof weekNum === 'string') {
        // Handle playoff weeks
        if (weekNum === 'WC') weekNum = 19      // Wild Card
        else if (weekNum === 'DR') weekNum = 20 // Divisional Round
        else if (weekNum === 'CC') weekNum = 21 // Conference Championship
        else if (weekNum === 'SB') weekNum = 22 // Super Bowl
        else weekNum = parseInt(weekNum)
      }
      return { ...game, WeekNum: weekNum }
    })

    // Sort by week number
    gameDataWithNumericWeeks.sort((a, b) => a.WeekNum - b.WeekNum)

    // Find min and max week
    const weekNumbers = gameDataWithNumericWeeks.map(game => game.WeekNum).filter(week => !isNaN(week))
    if (weekNumbers.length === 0) {
      return { labels: [], datasets: [] }
    }

    const minWeek = Math.min(...weekNumbers)
    const maxWeek = Math.max(...weekNumbers)

    // Create complete week range
    const labels = []
    const yards = []
    const propLines = []
    const barColors = []

    for (let week = minWeek; week <= maxWeek; week++) {
      // Create label for this week
      let weekLabel = `Week ${week}`
      if (week === 19) weekLabel = 'Wild Card'
      else if (week === 20) weekLabel = 'Divisional'
      else if (week === 21) weekLabel = 'Conf. Championship'
      else if (week === 22) weekLabel = 'Super Bowl'

      labels.push(weekLabel)

      // Find game for this week
      const gameForWeek = gameDataWithNumericWeeks.find(game => game.WeekNum === week)

      if (gameForWeek) {
        const yardValue = gameForWeek[yardColumn]
        const propValue = gameForWeek['Prop Line']
        yards.push(yardValue)
        propLines.push(propValue)
        barColors.push(yardValue > propValue ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)') // green if over, red if under
      } else {
        // Bye week - use null
        yards.push(null)
        propLines.push(null)
        barColors.push(null)
      }
    }

    return {
      labels,
      datasets: [
        {
          label: yardColumn.replace('YDS', 'Yards'),
          data: yards,
          backgroundColor: barColors,
          borderColor: barColors,
          borderWidth: 1,
          type: 'bar' as const,
          order: 2,
        },
        {
          label: 'Prop Line',
          data: propLines,
          type: 'line' as const,
          borderColor: '#374151',
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 6,
          pointBackgroundColor: '#374151',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          tension: 0.1,
          order: 1,
          spanGaps: false,
        },
      ],
    }
  }

  const chartData = processGameData()

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          afterLabel: function(context: any) {
            if (context.datasetIndex === 0 && context.parsed.y !== null) {
              const propLine = chartData.datasets[1].data[context.dataIndex]
              if (propLine !== null) {
                const diff = context.parsed.y - propLine
                const sign = diff > 0 ? '+' : ''
                return `Prop: ${propLine} (${sign}${diff})`
              }
            }
            return ''
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Week'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Yards'
        }
      }
    }
  }

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
      <div className="h-96">
        <Chart
          ref={chartRef}
          type="bar"
          data={chartData}
          options={options}
        />
      </div>
    </div>
  )
}