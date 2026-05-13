-- ============================================================================
-- Multi-tenant migration for GP Solutions Pro
-- NOTE: The live database has already been rebuilt with the full multi-tenant
-- schema via Supabase MCP during the audit session. This file is kept as a
-- reference and for future fresh installs.
-- ============================================================================
--
-- This migration introduces the concept of a "company" (tenant) and ties every
-- business table to one. Without this, anyone who signs up can read every
-- other tenant's customers, jobs, invoices, and revenue.
--
-- After running this migration:
--   1. Replace the broken signup flow: it must create a company row, then
--      create the employees row with company_id = that new company, and the
--      first user of a company should be promoted to 'admin'. The client-side
--      role:'admin' insert has been removed in this audit branch.
--   2. Replace the open 'Allow all' policies with the policies at the bottom
--      of this file.
--   3. Rotate the Supabase anon key after any period of open RLS.
-- ============================================================================

-- 1. Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 2. Add company_id to every tenant-owned table
ALTER TABLE employees           ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE customers           ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE jobs                ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE estimates           ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE invoices            ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- 3. Helper: return current user's company_id (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION current_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM employees WHERE id = auth.uid() LIMIT 1
$$;
-- Revoke public execute so it cannot be called via REST /rpc/
REVOKE EXECUTE ON FUNCTION current_company_id() FROM PUBLIC, anon, authenticated;

-- 4. Drop any open dev policies
DROP POLICY IF EXISTS "Allow all" ON employees;
DROP POLICY IF EXISTS "Allow all" ON customers;
DROP POLICY IF EXISTS "Allow all" ON jobs;
DROP POLICY IF EXISTS "Allow all" ON estimates;
DROP POLICY IF EXISTS "Allow all" ON invoices;

-- 5. Tenant-scoped RLS policies
CREATE POLICY tenant_read  ON customers FOR SELECT USING (company_id = current_company_id());
CREATE POLICY tenant_write ON customers FOR ALL    USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

CREATE POLICY tenant_read  ON jobs FOR SELECT USING (company_id = current_company_id());
CREATE POLICY tenant_write ON jobs FOR ALL    USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

CREATE POLICY tenant_read  ON estimates FOR SELECT USING (company_id = current_company_id());
CREATE POLICY tenant_write ON estimates FOR ALL    USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

CREATE POLICY tenant_read  ON invoices FOR SELECT USING (company_id = current_company_id());
CREATE POLICY tenant_write ON invoices FOR ALL    USING (company_id = current_company_id()) WITH CHECK (company_id = current_company_id());

CREATE POLICY tenant_read ON employees
  FOR SELECT USING (company_id = current_company_id() OR id = auth.uid());
CREATE POLICY tenant_write ON employees
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY owner_only ON companies
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
