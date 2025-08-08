-- Add Auth0 ID column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth0_id VARCHAR(255) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);

-- Make password_hash nullable since Auth0 handles authentication
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN users.auth0_id IS 'Auth0 user ID (sub claim from JWT)';
COMMENT ON COLUMN users.password_hash IS 'Legacy password hash - NULL for Auth0 users'; 