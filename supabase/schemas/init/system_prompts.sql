DROP TABLE IF EXISTS system_prompts;

CREATE TABLE system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiers
  name TEXT NOT NULL,
  description TEXT,

  -- Module content
  prompt TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);