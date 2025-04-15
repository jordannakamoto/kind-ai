CREATE TABLE user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  plan_id TEXT, -- e.g., 'free', 'pro', 'enterprise'
  status TEXT, -- 'active', 'trialing', 'canceled', etc.
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);