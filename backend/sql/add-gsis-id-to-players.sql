-- Add gsis_id column to players table for nfl_data_py integration

-- Add the gsis_id column
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS gsis_id VARCHAR(20);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_players_gsis_id ON players(gsis_id);

-- Add comment
COMMENT ON COLUMN players.gsis_id IS 'NFL GSIS identifier for linking with nfl_data_py statistics';

-- Show the updated table structure
SELECT 'Updated players table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'players' 
ORDER BY ordinal_position;