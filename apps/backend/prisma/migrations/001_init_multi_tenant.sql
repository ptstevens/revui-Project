-- Migration: Initial Multi-Tenant Schema with RLS
-- Story 1.1: Multi-Tenant Organization Registration
-- Created: 2025-10-15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  company_size VARCHAR(50),
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_tenant_id ON organizations(tenant_id);

-- Create User Role enum
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'REVIEWER', 'USER');

-- Create Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'USER',
  email_verified_at TIMESTAMP(6),
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- Create Link Purpose enum
CREATE TYPE link_purpose AS ENUM ('RECORDING', 'INVITATION', 'EMAIL_VERIFICATION');

-- Create Magic Links table
CREATE TABLE magic_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(tenant_id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  purpose link_purpose DEFAULT 'RECORDING',
  expires_at TIMESTAMP(6) NOT NULL,
  used_at TIMESTAMP(6),
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_magic_links_tenant_id ON magic_links(tenant_id);
CREATE INDEX idx_magic_links_token_hash ON magic_links(token_hash);
CREATE INDEX idx_magic_links_expires_at ON magic_links(expires_at);

-- Create Audit Logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- These policies enforce tenant isolation at the database level
-- The app.current_tenant_id session variable must be set before queries
-- ============================================================================

-- Enable RLS on Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see users in their own tenant
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Enable RLS on Magic Links table
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Magic links isolated by tenant
CREATE POLICY tenant_isolation_magic_links ON magic_links
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Enable RLS on Audit Logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Audit logs isolated by tenant
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
-- Automatically updates the updated_at timestamp on row modification
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT LOG TRIGGER FUNCTION
-- ============================================================================
-- Automatically creates audit log entries for sensitive operations
-- ============================================================================

CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (tenant_id, action, resource, metadata)
    VALUES (
      NEW.tenant_id,
      TG_OP,
      TG_TABLE_NAME,
      jsonb_build_object('new', row_to_json(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (tenant_id, action, resource, metadata)
    VALUES (
      NEW.tenant_id,
      TG_OP,
      TG_TABLE_NAME,
      jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (tenant_id, action, resource, metadata)
    VALUES (
      OLD.tenant_id,
      TG_OP,
      TG_TABLE_NAME,
      jsonb_build_object('old', row_to_json(OLD))
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to users
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Apply audit trigger to organizations
CREATE TRIGGER audit_organizations
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant necessary permissions to the application role
-- ============================================================================

-- Note: Replace 'revui_app' with your actual database user/role
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO revui_app;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO revui_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO revui_app;
