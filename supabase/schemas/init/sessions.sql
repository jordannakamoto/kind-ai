DROP TABLE IF EXISTS sessions;

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  conversation_id TEXT,
  title TEXT,
  transcript TEXT,
  summary TEXT,
  notes TEXT,

  duration_minutes INTEGER,

  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);