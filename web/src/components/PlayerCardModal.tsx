'use client'

import { useState, useEffect } from 'react'
import { CustomPlayerCard, CreatePlayerCardRequest } from '@/types/custom-player-cards'
import { nflAPI } from '@/lib/nfl-api'

interface PlayerCardModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (card: CustomPlayerCard) => void
  editingCard?: CustomPlayerCard | null
}

export default function PlayerCardModal({ isOpen, onClose, onSave, editingCard }: PlayerCardModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'data_display' as 'data_display' | 'graph',
    timeframe: 'weekly' as 'weekly' | 'cumulative',
    position_qb: false,
    position_rb: false,
    position_wr: false,
    position_te: false,
    position_k: false,
    fields: [] as string[],
    graph_config: {
      x_axis: '',
      y_axis: '',
      line: '',
      chart_type: 'line' as 'line' | 'bar' | 'scatter' | 'bar_with_line'
    }
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableFields, setAvailableFields] = useState<any[]>([])
  const [fieldsLoading, setFieldsLoading] = useState(false)

  // Reset form when modal opens/closes or editingCard changes
  useEffect(() => {
    if (isOpen) {
      if (editingCard) {
        setFormData({
          name: editingCard.name,
          description: editingCard.description,
          type: editingCard.type,
          timeframe: editingCard.timeframe,
          position_qb: editingCard.position_qb,
          position_rb: editingCard.position_rb,
          position_wr: editingCard.position_wr,
          position_te: editingCard.position_te,
          position_k: editingCard.position_k,
          fields: editingCard.fields || [],
          graph_config: editingCard.graph_config || {
            x_axis: '',
            y_axis: '',
            line: '',
            chart_type: 'line'
          }
        })
      } else {
        setFormData({
          name: '',
          description: '',
          type: 'data_display',
          timeframe: 'weekly',
          position_qb: false,
          position_rb: false,
          position_wr: false,
          position_te: false,
          position_k: false,
          fields: [],
          graph_config: {
            x_axis: '',
            y_axis: '',
            line: '',
            chart_type: 'line'
          }
        })
      }
      setError(null)
    }
  }, [isOpen, editingCard])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Card name is required')
      }

      if (!formData.position_qb && !formData.position_rb && !formData.position_wr && !formData.position_te && !formData.position_k) {
        throw new Error('At least one position must be selected')
      }

      if (formData.type === 'data_display' && formData.fields.length === 0) {
        throw new Error('At least one field must be selected')
      }

      if (formData.type === 'graph') {
        if (!formData.graph_config.x_axis || !formData.graph_config.y_axis) {
          throw new Error('Graph configuration requires both X and Y axis fields')
        }
      }

      // For graph cards, automatically populate fields from graph configuration
      let fields = formData.fields
      if (formData.type === 'graph') {
        fields = [formData.graph_config.x_axis, formData.graph_config.y_axis]
        if (formData.graph_config.line) {
          fields.push(formData.graph_config.line)
        }
        // Remove duplicates and empty values
        fields = [...new Set(fields.filter(Boolean))]
      }

      const cardData: CreatePlayerCardRequest = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        timeframe: formData.timeframe,
        position_qb: formData.position_qb,
        position_rb: formData.position_rb,
        position_wr: formData.position_wr,
        position_te: formData.position_te,
        position_k: formData.position_k,
        fields: fields,
        graph_config: formData.type === 'graph' ? formData.graph_config : undefined,
        created_by: 'user' // TODO: Replace with actual user ID
      }

      const savedCard = await nflAPI.createPlayerCard(cardData)
      onSave(savedCard)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save player card')
    } finally {
      setLoading(false)
    }
  }

  const handlePositionToggle = (position: 'qb' | 'rb' | 'wr' | 'te' | 'k') => {
    setFormData(prev => ({
      ...prev,
      [`position_${position}`]: !prev[`position_${position}` as keyof typeof prev]
    }))
  }

  const handleFieldToggle = (fieldKey: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.includes(fieldKey)
        ? prev.fields.filter(f => f !== fieldKey)
        : [...prev.fields, fieldKey]
    }))
  }

  // Load available fields from API when positions or timeframe changes
  useEffect(() => {
    if (isOpen) {
      loadAvailableFields()
    }
  }, [isOpen, formData.position_qb, formData.position_rb, formData.position_wr, formData.position_te, formData.position_k, formData.timeframe])

  const loadAvailableFields = async () => {
    setFieldsLoading(true)
    try {
      // Get selected positions
      const selectedPositions = []
      if (formData.position_qb) selectedPositions.push('QB')
      if (formData.position_rb) selectedPositions.push('RB')
      if (formData.position_wr) selectedPositions.push('WR')
      if (formData.position_te) selectedPositions.push('TE')
      if (formData.position_k) selectedPositions.push('K')

      if (selectedPositions.length === 0) {
        setAvailableFields([])
        return
      }

      // Load fields for each selected position
      const fieldPromises = selectedPositions.map(position => 
        nflAPI.getPlayerCardFields(position, formData.timeframe)
      )
      
      const fieldResults = await Promise.all(fieldPromises)
      
      // Combine and deduplicate fields
      const allFields = fieldResults.flat()
      const uniqueFields = allFields.filter((field, index, self) => 
        index === self.findIndex(f => f.field_key === field.field_key)
      )
      
      // Sort by sort_order and then by field_label
      uniqueFields.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order
        }
        return a.field_label.localeCompare(b.field_label)
      })
      
      setAvailableFields(uniqueFields)
    } catch (err) {
      console.error('Error loading available fields:', err)
      setAvailableFields([])
    } finally {
      setFieldsLoading(false)
    }
  }

  // Get fields for graph axes - includes all available fields plus time-based fields
  const getGraphAxisFields = () => {
    const baseFields = [...availableFields]
    
    // Always include week for time-based graphing, regardless of timeframe
    const weekField = availableFields.find(field => field.field_key === 'week')
    if (!weekField) {
      // If week isn't in available fields, add it manually
      baseFields.push({
        field_key: 'week',
        field_label: 'Week',
        field_description: 'NFL week number',
        data_type: 'number',
        category: 'game_info',
        timeframe: 'weekly',
        format_type: 'integer',
        sort_order: 20
      })
    }
    
    // For cumulative timeframe, also add games_played as a time axis option
    if (formData.timeframe === 'cumulative') {
      const gamesPlayedField = availableFields.find(field => field.field_key === 'games_played')
      if (!gamesPlayedField) {
        baseFields.push({
          field_key: 'games_played',
          field_label: 'Games Played',
          field_description: 'Number of games played',
          data_type: 'number',
          category: 'basic',
          timeframe: 'cumulative',
          format_type: 'integer',
          sort_order: 10
        })
      }
    }
    
    return baseFields.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order
      }
      return a.field_label.localeCompare(b.field_label)
    })
  }

  const graphAxisFields = getGraphAxisFields()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingCard ? 'Edit Player Card' : 'Create New Player Card'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter card name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'data_display' | 'graph' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="data_display">Data Display</option>
                  <option value="graph">Graph</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter card description"
              />
            </div>

            {/* Timeframe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeframe *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="weekly"
                    checked={formData.timeframe === 'weekly'}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeframe: e.target.value as 'weekly' | 'cumulative' }))}
                    className="mr-2"
                  />
                  Weekly
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="cumulative"
                    checked={formData.timeframe === 'cumulative'}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeframe: e.target.value as 'weekly' | 'cumulative' }))}
                    className="mr-2"
                  />
                  Cumulative
                </label>
              </div>
            </div>

            {/* Position Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Positions *
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'qb', label: 'QB', color: 'bg-red-100 text-red-800' },
                  { key: 'rb', label: 'RB', color: 'bg-teal-100 text-teal-800' },
                  { key: 'wr', label: 'WR', color: 'bg-purple-100 text-purple-800' },
                  { key: 'te', label: 'TE', color: 'bg-orange-100 text-orange-800' },
                  { key: 'k', label: 'K', color: 'bg-yellow-100 text-yellow-800' }
                ].map((position) => (
                  <label key={position.key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData[`position_${position.key}` as keyof typeof formData] as boolean}
                      onChange={() => handlePositionToggle(position.key as 'qb' | 'rb' | 'wr' | 'te' | 'k')}
                      className="mr-2"
                    />
                    <span className={`px-2 py-1 rounded text-sm font-medium ${position.color}`}>
                      {position.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Field Selection - Only show for data display cards */}
            {formData.type === 'data_display' && availableFields.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fields * ({formData.fields.length} selected)
                </label>
                <div className="border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {availableFields.map((field) => (
                      <label key={field.key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.fields.includes(field.key)}
                          onChange={() => handleFieldToggle(field.key)}
                          className="mr-2"
                        />
                        <span className="text-sm" title={field.description}>
                          {field.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Graph Configuration - Only show for graph type */}
            {formData.type === 'graph' && graphAxisFields.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Graph Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      X-Axis *
                    </label>
                    <select
                      value={formData.graph_config.x_axis}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        graph_config: { ...prev.graph_config, x_axis: e.target.value } 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select X-Axis field</option>
                      {graphAxisFields.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Y-Axis *
                    </label>
                    <select
                      value={formData.graph_config.y_axis}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        graph_config: { ...prev.graph_config, y_axis: e.target.value } 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Y-Axis field</option>
                      {graphAxisFields.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chart Type *
                    </label>
                    <select
                      value={formData.graph_config.chart_type}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        graph_config: { ...prev.graph_config, chart_type: e.target.value as 'line' | 'bar' | 'scatter' | 'bar_with_line' } 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="line">Line Chart</option>
                      <option value="bar">Bar Chart</option>
                      <option value="scatter">Scatter Plot</option>
                      <option value="bar_with_line">Bar Chart with Line</option>
                    </select>
                  </div>

                  {formData.graph_config.chart_type === 'bar_with_line' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Line Field
                      </label>
                      <select
                        value={formData.graph_config.line || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          graph_config: { ...prev.graph_config, line: e.target.value } 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select line field</option>
                        {graphAxisFields.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingCard ? 'Update Card' : 'Create Card'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}