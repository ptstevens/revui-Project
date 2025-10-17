-- AlterTable: Add password_hash column to users table
-- Refactor: Adding password authentication for platform users
-- Nullable to maintain backward compatibility with existing users

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255);
