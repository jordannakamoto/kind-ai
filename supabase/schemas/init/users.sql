CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile Information
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT DEFAULT 'user',

  -- Therapy Profile
  bio TEXT,
  therapy_summary TEXT,
  themes TEXT,
  goals TEXT,

  -- Preferences
  settings JSONB DEFAULT '{}'::jsonb;

  -- Account Info
  is_active BOOLEAN DEFAULT TRUE,
  subscription TEXT,
  admin_notes TEXT
);