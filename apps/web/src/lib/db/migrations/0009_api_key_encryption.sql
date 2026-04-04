-- Add encrypted API key column for CLI browser auth retrieval
-- The encrypted key can be decrypted to provide to CLI during browser-based authentication
-- Hash is still used for verification when CLI sends tasks

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;

-- Note: Existing workspaces will have NULL api_key_encrypted
-- They will need to rotate their API key to get the encrypted version
-- New workspaces will get both hash and encrypted automatically
