-- Story 1.5: Retention Policy Management
-- Story 1.7: Authentication & Session Management
-- Story 1.8: Audit Trail & Compliance (enhancements)

-- ============================================================================
-- Story 1.5: Add retention policy fields to recordings table
-- ============================================================================

-- Add retention override field (optional, overrides organization default)
ALTER TABLE "recordings" ADD COLUMN "retention_override_days" INTEGER;

-- Add scheduled deletion timestamp (calculated from retention policy)
ALTER TABLE "recordings" ADD COLUMN "scheduled_deletion_at" TIMESTAMP(6);

-- Add legal hold fields (exempt from deletion)
ALTER TABLE "recordings" ADD COLUMN "legal_hold" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "recordings" ADD COLUMN "legal_hold_reason" TEXT;
ALTER TABLE "recordings" ADD COLUMN "legal_hold_by" UUID;
ALTER TABLE "recordings" ADD COLUMN "legal_hold_at" TIMESTAMP(6);

-- Create indexes for retention policy queries
CREATE INDEX "recordings_scheduled_deletion_at_idx" ON "recordings"("scheduled_deletion_at");
CREATE INDEX "recordings_legal_hold_idx" ON "recordings"("legal_hold");

-- ============================================================================
-- Story 1.7: Create sessions table for authentication
-- ============================================================================

CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "last_activity_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logged_out_at" TIMESTAMP(6),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "device_name" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- Create unique index on token_hash for fast validation
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- Create indexes for session management queries
CREATE INDEX "sessions_tenant_id_idx" ON "sessions"("tenant_id");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE INDEX "sessions_logged_out_at_idx" ON "sessions"("logged_out_at");

-- ============================================================================
-- Story 1.8: Enhance audit_logs table (if needed)
-- ============================================================================

-- Note: The audit_logs table was created in migration 003 with optional tenant_id
-- and comprehensive fields. No additional changes required for Story 1.8.
-- The table already supports:
-- - Optional tenant_id for system-level events
-- - Structured action tracking (action VARCHAR, resource_type VARCHAR, resource_id UUID)
-- - Change tracking (old_value JSONB, new_value JSONB)
-- - Request metadata (ip_address, user_agent, metadata JSONB)
-- - 7-year retention with indexed created_at

-- Verify audit_logs has all required fields (this is a documentation comment)
-- If audit_logs needs enhancements, they would go here.

-- ============================================================================
-- Add default retention period to organizations table (if not exists)
-- ============================================================================

-- Check if default_retention_days column exists, add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations'
        AND column_name = 'default_retention_days'
    ) THEN
        ALTER TABLE "organizations" ADD COLUMN "default_retention_days" INTEGER NOT NULL DEFAULT 180;
        CREATE INDEX "organizations_default_retention_days_idx" ON "organizations"("default_retention_days");
    END IF;
END $$;
