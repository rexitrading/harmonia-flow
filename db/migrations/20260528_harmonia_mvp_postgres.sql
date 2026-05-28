CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('owner', 'assistant', 'viewer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    CREATE TYPE event_status AS ENUM ('draft', 'ready', 'live', 'finished', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_track_status') THEN
    CREATE TYPE event_track_status AS ENUM ('pending', 'ready', 'playing', 'played', 'skipped', 'canceled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'execution_action') THEN
    CREATE TYPE execution_action AS ENUM ('play', 'pause', 'seek', 'complete', 'skip', 'move', 'note_update', 'status_update');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spotify_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spotify_user_id TEXT NOT NULL,
  display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (spotify_user_id)
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  spotify_account_id UUID REFERENCES spotify_accounts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  status event_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, order_index)
);

CREATE TABLE IF NOT EXISTS imported_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_account_id UUID NOT NULL REFERENCES spotify_accounts(id) ON DELETE CASCADE,
  spotify_playlist_id TEXT NOT NULL,
  name TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  image_url TEXT,
  owner_name TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  UNIQUE (spotify_account_id, spotify_playlist_id)
);

CREATE TABLE IF NOT EXISTS imported_playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_playlist_id UUID NOT NULL REFERENCES imported_playlists(id) ON DELETE CASCADE,
  spotify_track_id TEXT NOT NULL,
  spotify_uri TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artists_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  album_name TEXT,
  duration_ms INT NOT NULL,
  preview_url TEXT,
  original_position INT NOT NULL,
  UNIQUE (imported_playlist_id, spotify_track_id, original_position)
);

CREATE TABLE IF NOT EXISTS event_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  imported_playlist_track_id UUID REFERENCES imported_playlist_tracks(id) ON DELETE SET NULL,
  moment_id UUID REFERENCES moments(id) ON DELETE SET NULL,
  spotify_uri TEXT,
  spotify_url TEXT,
  track_name TEXT NOT NULL DEFAULT 'Sem título',
  artists_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  order_index INT NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  note TEXT,
  cue_start_ms INT,
  cue_end_ms INT,
  status event_track_status NOT NULL DEFAULT 'pending',
  is_backup BOOLEAN NOT NULL DEFAULT false,
  played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_track_id UUID REFERENCES event_tracks(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action execution_action NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ceremony_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_template_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INT NOT NULL,
  color TEXT,
  UNIQUE (template_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_events_owner_date ON events(owner_user_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_moments_event_order ON moments(event_id, order_index);
CREATE INDEX IF NOT EXISTS idx_event_tracks_event_display_order ON event_tracks(event_id, display_order);
CREATE INDEX IF NOT EXISTS idx_logs_event_created_at ON execution_logs(event_id, created_at DESC);
