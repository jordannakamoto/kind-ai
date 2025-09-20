-- Add list goal type for tracking items like bedtime, habits, etc.
-- Run this migration on your Supabase instance

-- Update the goal_type constraint to include 'list'
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_goal_type_check;
ALTER TABLE goals ADD CONSTRAINT goals_goal_type_check CHECK (goal_type IN ('basic', 'counter', 'progress', 'list'));

-- Add a new column for storing list items as JSON
ALTER TABLE goals ADD COLUMN IF NOT EXISTS list_items JSONB DEFAULT '[]'::jsonb;

-- Add index for better JSON query performance
CREATE INDEX IF NOT EXISTS idx_goals_list_items ON goals USING GIN (list_items);

-- Update comments for documentation
COMMENT ON COLUMN goals.goal_type IS 'Type of goal: basic (checkbox), counter (accumulating number), progress (percentage to target), list (collection of items/entries)';
COMMENT ON COLUMN goals.list_items IS 'JSON array of list items for list-type goals, each with timestamp, value, and optional notes';

-- Update the goals_with_progress view to handle list goals
CREATE OR REPLACE VIEW goals_with_progress AS
SELECT
  *,
  CASE
    WHEN goal_type = 'progress' AND target_value > 0 THEN
      LEAST(100, ROUND((current_value::FLOAT / target_value::FLOAT) * 100))
    ELSE NULL
  END as progress_percentage,
  CASE
    WHEN goal_type = 'progress' AND target_value > 0 AND current_value >= target_value THEN true
    WHEN goal_type = 'basic' AND completed_at IS NOT NULL THEN true
    WHEN goal_type = 'list' AND jsonb_array_length(list_items) > 0 THEN true
    ELSE false
  END as is_completed,
  CASE
    WHEN goal_type = 'list' THEN jsonb_array_length(list_items)
    ELSE NULL
  END as list_count
FROM goals;