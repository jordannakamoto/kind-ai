-- Add goal types and progress tracking to goals table
-- Run this migration on your Supabase instance

-- Add new columns to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS goal_type VARCHAR(20) DEFAULT 'basic' CHECK (goal_type IN ('basic', 'counter', 'progress'));
ALTER TABLE goals ADD COLUMN IF NOT EXISTS current_value INTEGER DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_value INTEGER DEFAULT NULL;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS archived_reason VARCHAR(50) DEFAULT NULL CHECK (archived_reason IN ('completed', 'abandoned', 'replaced', 'outdated'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_goal_type ON goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_goals_archived_at ON goals(archived_at);
CREATE INDEX IF NOT EXISTS idx_goals_active_user ON goals(user_id, is_active) WHERE archived_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN goals.goal_type IS 'Type of goal: basic (checkbox), counter (accumulating number), progress (percentage to target)';
COMMENT ON COLUMN goals.current_value IS 'Current progress value for counter/progress goals';
COMMENT ON COLUMN goals.target_value IS 'Target value for progress goals (null for counter goals means unlimited)';
COMMENT ON COLUMN goals.archived_at IS 'When the goal was archived/cleaned up';
COMMENT ON COLUMN goals.archived_reason IS 'Why the goal was archived: completed, abandoned, replaced, outdated';

-- Create a view for active goals
CREATE OR REPLACE VIEW active_goals AS
SELECT * FROM goals
WHERE is_active = true AND archived_at IS NULL;

-- Create a view for goal progress calculations
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
    ELSE false
  END as is_completed
FROM goals;