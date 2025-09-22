-- Migration: Add custom moods support
-- This migration adds support for user-customizable mood emojis

-- Create custom_moods table
CREATE TABLE IF NOT EXISTS custom_moods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  label VARCHAR(50) NOT NULL,
  value VARCHAR(50) NOT NULL,
  color_theme JSONB NOT NULL DEFAULT '{
    "color": "bg-gradient-to-br from-gray-50 to-gray-100",
    "borderColor": "border-gray-300",
    "dotColor": "bg-gradient-to-r from-gray-400 to-gray-500",
    "shadowColor": "shadow-gray-200/60"
  }',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_moods_user_id ON custom_moods(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_moods_user_active ON custom_moods(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_custom_moods_sort_order ON custom_moods(user_id, sort_order);

-- Add unique constraint to prevent duplicate mood values per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_moods_user_value ON custom_moods(user_id, value) WHERE is_active = true;

-- Enable RLS (Row Level Security)
ALTER TABLE custom_moods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own custom moods"
  ON custom_moods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom moods"
  ON custom_moods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom moods"
  ON custom_moods FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom moods"
  ON custom_moods FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create user_mood_preferences table to store user's mood configuration
CREATE TABLE IF NOT EXISTS user_mood_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_moods_enabled BOOLEAN NOT NULL DEFAULT true,
  mood_order JSONB DEFAULT '[]', -- Array of mood IDs in preferred order
  hidden_default_moods JSONB DEFAULT '[]', -- Array of hidden default mood IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on preferences table
ALTER TABLE user_mood_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for preferences
CREATE POLICY "Users can view their own mood preferences"
  ON user_mood_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood preferences"
  ON user_mood_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood preferences"
  ON user_mood_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a function to get all moods for a user (default + custom)
CREATE OR REPLACE FUNCTION get_user_moods(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB := '[]'::JSONB;
  default_moods JSONB;
  custom_moods JSONB;
  user_prefs RECORD;
  hidden_moods JSONB;
  filtered_defaults JSONB := '[]'::JSONB;
BEGIN
  -- Get user preferences including hidden moods
  SELECT * INTO user_prefs
  FROM user_mood_preferences
  WHERE user_id = p_user_id;

  hidden_moods := COALESCE(user_prefs.hidden_default_moods, '[]'::JSONB);

  -- Default moods (hardcoded for consistency)
  default_moods := '[
    {
      "id": "default_happy",
      "emoji": "😊",
      "label": "Happy",
      "value": "happy",
      "color": "bg-gradient-to-br from-emerald-50 to-green-100",
      "borderColor": "border-emerald-300",
      "dotColor": "bg-gradient-to-r from-emerald-400 to-green-500",
      "shadowColor": "shadow-emerald-200/60",
      "isCustom": false
    },
    {
      "id": "default_neutral",
      "emoji": "😐",
      "label": "Neutral",
      "value": "neutral",
      "color": "bg-gradient-to-br from-amber-50 to-yellow-100",
      "borderColor": "border-amber-300",
      "dotColor": "bg-gradient-to-r from-amber-400 to-orange-400",
      "shadowColor": "shadow-amber-200/60",
      "isCustom": false
    },
    {
      "id": "default_sad",
      "emoji": "😢",
      "label": "Sad",
      "value": "sad",
      "color": "bg-gradient-to-br from-sky-50 to-blue-100",
      "borderColor": "border-sky-300",
      "dotColor": "bg-gradient-to-r from-sky-400 to-blue-500",
      "shadowColor": "shadow-sky-200/60",
      "isCustom": false
    },
    {
      "id": "default_angry",
      "emoji": "😡",
      "label": "Angry",
      "value": "angry",
      "color": "bg-gradient-to-br from-rose-50 to-red-100",
      "borderColor": "border-rose-300",
      "dotColor": "bg-gradient-to-r from-rose-400 to-red-500",
      "shadowColor": "shadow-rose-200/60",
      "isCustom": false
    },
    {
      "id": "default_tired",
      "emoji": "😴",
      "label": "Tired",
      "value": "tired",
      "color": "bg-gradient-to-br from-violet-50 to-purple-100",
      "borderColor": "border-violet-300",
      "dotColor": "bg-gradient-to-r from-violet-400 to-purple-500",
      "shadowColor": "shadow-violet-200/60",
      "isCustom": false
    }
  ]'::JSONB;

  -- Filter out hidden default moods
  SELECT jsonb_agg(mood)
  INTO filtered_defaults
  FROM jsonb_array_elements(default_moods) AS mood
  WHERE NOT (hidden_moods @> to_jsonb(mood->>'id'));

  -- Get custom moods
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id::text,
        'emoji', emoji,
        'label', label,
        'value', value,
        'color', color_theme->>'color',
        'borderColor', color_theme->>'borderColor',
        'dotColor', color_theme->>'dotColor',
        'shadowColor', color_theme->>'shadowColor',
        'isCustom', true
      ) ORDER BY sort_order, created_at
    ),
    '[]'::JSONB
  ) INTO custom_moods
  FROM custom_moods
  WHERE user_id = p_user_id AND is_active = true;

  -- Combine filtered default moods and custom moods
  result := COALESCE(filtered_defaults, '[]'::JSONB) || custom_moods;

  -- If user has a specific mood order, apply it
  IF user_prefs.mood_order IS NOT NULL AND jsonb_array_length(user_prefs.mood_order) > 0 THEN
    -- Reorder moods based on mood_order
    SELECT jsonb_agg(
      mood ORDER BY
        CASE
          WHEN position((mood->>'id')::text IN user_prefs.mood_order::text) > 0
          THEN position((mood->>'id')::text IN user_prefs.mood_order::text)
          ELSE 999999
        END
    )
    INTO result
    FROM jsonb_array_elements(result) AS mood;
  END IF;

  RETURN result;
END;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_custom_moods_updated_at
  BEFORE UPDATE ON custom_moods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_mood_preferences_updated_at
  BEFORE UPDATE ON user_mood_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();