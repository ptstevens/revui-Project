-- Story 1.2: Enhanced Magic Link Security and Audit Trail
-- Migration: Add configurable expiration and audit fields

-- Add configurable magic link expiration to organizations
ALTER TABLE organizations
ADD COLUMN magic_link_expiration_hours INTEGER NOT NULL DEFAULT 48;

-- Add audit trail and association fields to magic_links
ALTER TABLE magic_links
ADD COLUMN user_id UUID,
ADD COLUMN task_id UUID,
ADD COLUMN ip_address VARCHAR(45),
ADD COLUMN user_agent TEXT;

-- Add indexes for new fields
CREATE INDEX idx_magic_links_user_id ON magic_links(user_id);
CREATE INDEX idx_magic_links_task_id ON magic_links(task_id);

-- Add comments for documentation
COMMENT ON COLUMN organizations.magic_link_expiration_hours IS 'Configurable expiration time for magic links in hours (default: 48)';
COMMENT ON COLUMN magic_links.user_id IS 'Optional: Associated user for user-specific magic links';
COMMENT ON COLUMN magic_links.task_id IS 'Optional: Associated task for task-specific magic links';
COMMENT ON COLUMN magic_links.ip_address IS 'IP address of the user who used the magic link';
COMMENT ON COLUMN magic_links.user_agent IS 'User agent string of the browser that used the magic link';
