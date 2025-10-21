-- D1 Database Schema for OAuth State Only
-- Customer data is NOT stored here - only OAuth tokens and codes

-- Store refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token TEXT PRIMARY KEY,
  customer_email TEXT NOT NULL,
  cordial_contact_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  scopes TEXT NOT NULL, -- JSON array
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_used INTEGER
);

CREATE INDEX idx_refresh_tokens_contact ON refresh_tokens(cordial_contact_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Store authorization codes (temporary, single-use)
CREATE TABLE IF NOT EXISTS auth_codes (
  code TEXT PRIMARY KEY,
  customer_email TEXT NOT NULL,
  cordial_contact_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  scopes TEXT NOT NULL, -- JSON array
  code_challenge TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used BOOLEAN DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_auth_codes_expires ON auth_codes(expires_at);
CREATE INDEX idx_auth_codes_used ON auth_codes(used);
