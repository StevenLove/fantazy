export interface CustomPlayerCard {
  id: string;
  name: string;
  description: string;
  type: 'data_display' | 'graph';
  timeframe: 'weekly' | 'cumulative';
  position_qb: boolean;
  position_rb: boolean;
  position_wr: boolean;
  position_te: boolean;
  position_k: boolean;
  fields: string[]; // For data display: array of field names to show
  graph_config?: {
    x_axis: string;
    y_axis: string;
    line?: string; // For bar charts with lines
    chart_type: 'line' | 'bar' | 'scatter' | 'bar_with_line';
  };
  created_by: string; // user identifier
  created_at: Date;
  updated_at: Date;
  is_default: boolean; // for the built-in cards we have now
}

export interface PlayerCardField {
  key: string;
  label: string;
  description: string;
  dataType: 'number' | 'string' | 'boolean';
  positions: string[]; // which positions this field applies to
  category: 'basic' | 'advanced' | 'game_info' | 'fantasy' | 'efficiency';
  timeframe: 'weekly' | 'cumulative' | 'both';
  format?: 'percentage' | 'decimal' | 'integer' | 'yards' | 'time';
}

export interface CreatePlayerCardRequest {
  name: string;
  description: string;
  type: 'data_display' | 'graph';
  timeframe: 'weekly' | 'cumulative';
  position_qb: boolean;
  position_rb: boolean;
  position_wr: boolean;
  position_te: boolean;
  position_k: boolean;
  fields: string[];
  graph_config?: {
    x_axis: string;
    y_axis: string;
    line?: string; // For bar charts with lines
    chart_type: 'line' | 'bar' | 'scatter' | 'bar_with_line';
  };
  created_by: string;
}

export interface PlayerCardResponse {
  success: boolean;
  card?: CustomPlayerCard;
  error?: string;
}

export interface FieldMetadata {
  [position: string]: PlayerCardField[];
}