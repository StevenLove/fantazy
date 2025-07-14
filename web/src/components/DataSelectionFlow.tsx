'use client';

import { useState, useEffect } from 'react';
import { 
  Player, 
  Game, 
  DataViewType, 
  RangeType, 
  GameDataType, 
  RangeDataType,
  DataSelection 
} from '@/types/nfl-data';
import { nflAPI } from '@/lib/nfl-api';

interface DataSelectionFlowProps {
  selectedPlayers: Player[];
  onDataSelection: (selection: DataSelection) => void;
}

export default function DataSelectionFlow({ selectedPlayers, onDataSelection }: DataSelectionFlowProps) {
  const [step, setStep] = useState<'view-type' | 'game-selection' | 'range-selection' | 'data-types'>('view-type');
  const [viewType, setViewType] = useState<DataViewType | null>(null);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedRange, setSelectedRange] = useState<RangeType | null>(null);
  const [selectedGameDataTypes, setSelectedGameDataTypes] = useState<GameDataType[]>([]);
  const [selectedRangeDataTypes, setSelectedRangeDataTypes] = useState<RangeDataType[]>([]);
  const [loading, setLoading] = useState(false);

  // Load available games when component mounts
  useEffect(() => {
    const loadGames = async () => {
      try {
        setLoading(true);
        const games = await nflAPI.getGames(2024);
        setAvailableGames(games);
      } catch (error) {
        console.error('Error loading games:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadGames();
  }, []);

  const handleViewTypeSelection = (type: DataViewType) => {
    setViewType(type);
    if (type === 'specific-game') {
      setStep('game-selection');
    } else {
      setStep('range-selection');
    }
  };

  const handleGameSelection = (game: Game) => {
    setSelectedGame(game);
    setStep('data-types');
  };

  const handleRangeSelection = (range: RangeType) => {
    setSelectedRange(range);
    setStep('data-types');
  };

  const toggleGameDataType = (dataType: GameDataType) => {
    setSelectedGameDataTypes(prev => 
      prev.includes(dataType) 
        ? prev.filter(t => t !== dataType)
        : [...prev, dataType]
    );
  };

  const toggleRangeDataType = (dataType: RangeDataType) => {
    setSelectedRangeDataTypes(prev => 
      prev.includes(dataType) 
        ? prev.filter(t => t !== dataType)
        : [...prev, dataType]
    );
  };

  const handleSubmit = () => {
    const selection: DataSelection = {
      viewType: viewType!,
      selectedPlayers,
      selectedGame: viewType === 'specific-game' ? selectedGame! : undefined,
      gameDataTypes: viewType === 'specific-game' ? selectedGameDataTypes : undefined,
      rangeType: viewType === 'range' ? selectedRange! : undefined,
      rangeDataTypes: viewType === 'range' ? selectedRangeDataTypes : undefined,
    };
    
    onDataSelection(selection);
  };

  const canSubmit = () => {
    if (!viewType) return false;
    
    if (viewType === 'specific-game') {
      return selectedGame && selectedGameDataTypes.length > 0;
    } else {
      return selectedRange && selectedRangeDataTypes.length > 0;
    }
  };

  const resetSelection = () => {
    setStep('view-type');
    setViewType(null);
    setSelectedGame(null);
    setSelectedRange(null);
    setSelectedGameDataTypes([]);
    setSelectedRangeDataTypes([]);
  };

  if (selectedPlayers.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select Players to Compare</h3>
        <p className="text-gray-600">Choose 1-4 players from the sidebar to begin data analysis.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Data Analysis for {selectedPlayers.length} Player{selectedPlayers.length > 1 ? 's' : ''}
        </h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedPlayers.map(player => (
            <span key={player.id} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
              {player.name} ({player.position})
            </span>
          ))}
        </div>
      </div>

      {/* Step 1: View Type Selection */}
      {step === 'view-type' && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Choose Analysis Type</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleViewTypeSelection('specific-game')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <h5 className="font-medium text-gray-900 mb-2">Specific Game Data</h5>
              <p className="text-gray-600 text-sm">
                Analyze performance in a specific game with detailed matchup info, advanced stats, and betting lines.
              </p>
            </button>
            <button
              onClick={() => handleViewTypeSelection('range')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <h5 className="font-medium text-gray-900 mb-2">Range Analysis</h5>
              <p className="text-gray-600 text-sm">
                Compare performance trends over multiple games (L3, L5, L10, or full season).
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Game Selection */}
      {step === 'game-selection' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-gray-900">Select Game</h4>
            <button
              onClick={resetSelection}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to Analysis Type
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-4">Loading games...</div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              <div className="grid gap-2">
                {availableGames.map(game => (
                  <button
                    key={game.game_id}
                    onClick={() => handleGameSelection(game)}
                    className="p-3 border rounded-lg text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        Week {game.week}: {game.away_team} @ {game.home_team}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(game.gameday).toLocaleDateString()}
                      </span>
                    </div>
                    {game.away_score !== null && (
                      <div className="text-sm text-gray-600 mt-1">
                        Final: {game.away_score} - {game.home_score}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Range Selection */}
      {step === 'range-selection' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-gray-900">Select Range</h4>
            <button
              onClick={resetSelection}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to Analysis Type
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['L3', 'L5', 'L10', 'SEASON'] as RangeType[]).map(range => (
              <button
                key={range}
                onClick={() => handleRangeSelection(range)}
                className="p-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
              >
                <div className="font-medium text-gray-900">{range}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {range === 'SEASON' ? 'Full Season' : `Last ${range.slice(1)} Games`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Data Type Selection */}
      {step === 'data-types' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-gray-900">
              Select Data Types
              {viewType === 'specific-game' && selectedGame && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  for Week {selectedGame.week}: {selectedGame.away_team} @ {selectedGame.home_team}
                </span>
              )}
              {viewType === 'range' && selectedRange && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  for {selectedRange === 'SEASON' ? 'Full Season' : `Last ${selectedRange.slice(1)} Games`}
                </span>
              )}
            </h4>
            <button
              onClick={() => setStep(viewType === 'specific-game' ? 'game-selection' : 'range-selection')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back
            </button>
          </div>

          {viewType === 'specific-game' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { id: 'game-log', label: 'Game Log', desc: 'Basic stats and performance' },
                { id: 'matchup-info', label: 'Matchup Info', desc: 'Opponent analysis and context' },
                { id: 'advanced-stats', label: 'Advanced Stats', desc: 'EPA, NGS metrics, efficiency' },
                { id: 'betting-lines', label: 'Betting Lines', desc: 'Props and odds (when available)' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => toggleGameDataType(option.id as GameDataType)}
                  className={`p-3 border-2 rounded-lg text-left transition-colors ${
                    selectedGameDataTypes.includes(option.id as GameDataType)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-600 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          )}

          {viewType === 'range' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { id: 'props-vs-actual', label: 'Props vs Actual', desc: 'Compare betting lines to performance (2025)', disabled: true },
                { id: 'projected-vs-actual', label: 'Projected vs Actual', desc: 'Fantasy projections vs results (when available)', disabled: true },
                { id: 'advanced-trends', label: 'Advanced Trends', desc: 'EPA, target share, efficiency over time' },
                { id: 'counting-trends', label: 'Counting Stats', desc: 'Yards, TDs, receptions over time' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => !option.disabled && toggleRangeDataType(option.id as RangeDataType)}
                  disabled={option.disabled}
                  className={`p-3 border-2 rounded-lg text-left transition-colors ${
                    option.disabled
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      : selectedRangeDataTypes.includes(option.id as RangeDataType)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className={`font-medium ${option.disabled ? 'text-gray-400' : 'text-gray-900'}`}>
                    {option.label}
                    {option.disabled && <span className="text-xs ml-2">(Coming Soon)</span>}
                  </div>
                  <div className={`text-sm mt-1 ${option.disabled ? 'text-gray-400' : 'text-gray-600'}`}>
                    {option.desc}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit()}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                canSubmit()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Analyze Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}