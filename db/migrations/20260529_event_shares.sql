DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('owner', 'assistant', 'viewer');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS event_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'assistant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_shares_user ON event_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_event_shares_event ON event_shares(event_id);
