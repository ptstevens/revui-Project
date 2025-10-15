-- Story 1.2: Make audit_logs.tenant_id optional for global security events
-- This allows logging of security events that don't have an associated tenant,
-- such as invalid token attempts

ALTER TABLE audit_logs
ALTER COLUMN tenant_id DROP NOT NULL;

COMMENT ON COLUMN audit_logs.tenant_id IS 'Optional tenant ID - null for global security events (e.g., invalid token attempts)';
