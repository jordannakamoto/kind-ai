DROP TABLE IF EXISTS therapy_modules;

CREATE TABLE therapy_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiers
  name TEXT NOT NULL,
  description TEXT,

  -- Module content
  greeting TEXT,
  instructions TEXT,
  agenda TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);