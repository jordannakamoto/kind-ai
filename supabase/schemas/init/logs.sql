CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. 'login', 'logout', 'start_session', 'end_session', 'update_goal', 'update_profile'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);