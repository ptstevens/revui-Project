-- Story 2.3: 10-Second Preview Video Tutorial
-- Add user preferences column to store UI preferences

-- Add preferences column to users table
-- This column stores user-specific UI preferences such as:
-- - Tutorial completion status (e.g., "tutorialSkipped": true)
-- - Theme preferences
-- - UI customization settings
-- The column is nullable and defaults to an empty JSON object for backwards compatibility
ALTER TABLE "users" ADD COLUMN "preferences" JSONB DEFAULT '{}';

-- Create an index on preferences for potential JSON queries
-- This will help with queries filtering by specific preference keys
CREATE INDEX "users_preferences_idx" ON "users" USING GIN ("preferences");

-- Add comment describing the column's purpose
COMMENT ON COLUMN "users"."preferences" IS 'User UI preferences including tutorial status, theme, and other customization settings';