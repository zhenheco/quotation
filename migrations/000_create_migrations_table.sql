-- Migration: Create schema_migrations tracking table
-- Created: 2025-12-10
-- Purpose: Track which migrations have been executed to prevent schema drift

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checksum VARCHAR(64)
);

-- Add comment for documentation
COMMENT ON TABLE schema_migrations IS 'Tracks executed database migrations to prevent schema drift between code and database';
COMMENT ON COLUMN schema_migrations.filename IS 'Migration filename (e.g., 001_create_users.sql)';
COMMENT ON COLUMN schema_migrations.executed_at IS 'Timestamp when migration was executed';
COMMENT ON COLUMN schema_migrations.checksum IS 'SHA256 checksum of migration file content';
