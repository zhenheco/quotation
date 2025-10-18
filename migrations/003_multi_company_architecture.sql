-- ============================================================================
-- Multi-Company Architecture Migration
-- ============================================================================
-- This migration enables users to manage multiple companies
-- Each company can have multiple members with different roles

-- 1. Create companies table (consolidates company_settings)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL, -- { "zh": "公司名稱", "en": "Company Name" }
  logo_url TEXT,
  signature_url TEXT,
  passbook_url TEXT,
  tax_id VARCHAR(50),
  bank_name VARCHAR(255),
  bank_account VARCHAR(100),
  bank_code VARCHAR(50),
  address JSONB, -- { "zh": "地址", "en": "Address" }
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_tax_id ON companies(tax_id);

-- 2. Create company_members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References Supabase auth.users
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_owner BOOLEAN DEFAULT false, -- The user who created the company
  is_active BOOLEAN DEFAULT true, -- Can be deactivated without deletion
  joined_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_role_id ON company_members(role_id);

-- 3. Add company_id to existing tables
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create indexes for company_id
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON quotations(company_id);

-- 4. Add updated_at trigger to companies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_companies_updated_at') THEN
    CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_company_members_updated_at') THEN
    CREATE TRIGGER update_company_members_updated_at BEFORE UPDATE ON company_members
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 5. Migrate existing data from company_settings to companies
-- Only if company_settings exists and has data
DO $$
DECLARE
  settings_record RECORD;
  new_company_id UUID;
BEGIN
  -- Check if company_settings table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_settings') THEN
    -- Migrate each company setting to a new company
    FOR settings_record IN
      SELECT * FROM company_settings
    LOOP
      -- Create new company
      INSERT INTO companies (
        name, logo_url, signature_url, passbook_url,
        tax_id, bank_name, bank_account, bank_code,
        address, phone, email, website,
        created_at, updated_at
      ) VALUES (
        settings_record.company_name,
        settings_record.logo_url,
        settings_record.signature_url,
        settings_record.passbook_url,
        settings_record.tax_id,
        settings_record.bank_name,
        settings_record.bank_account,
        settings_record.bank_code,
        settings_record.address,
        settings_record.phone,
        settings_record.email,
        settings_record.website,
        settings_record.created_at,
        settings_record.updated_at
      ) RETURNING id INTO new_company_id;

      -- Create company member relationship (owner)
      INSERT INTO company_members (company_id, user_id, role_id, is_owner)
      VALUES (
        new_company_id,
        settings_record.user_id,
        (SELECT id FROM roles WHERE name = 'admin' LIMIT 1), -- Default to admin role
        true
      );

      -- Update related records with company_id
      UPDATE customers SET company_id = new_company_id WHERE user_id = settings_record.user_id;
      UPDATE products SET company_id = new_company_id WHERE user_id = settings_record.user_id;
      UPDATE quotations SET company_id = new_company_id WHERE user_id = settings_record.user_id;
    END LOOP;

    RAISE NOTICE 'Successfully migrated data from company_settings to companies';
  END IF;
END $$;

-- 6. Create helper functions

-- Function to check if user is member of a company
CREATE OR REPLACE FUNCTION is_company_member(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM company_members
    WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's companies
CREATE OR REPLACE FUNCTION get_user_companies(p_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  company_name JSONB,
  role_name VARCHAR,
  is_owner BOOLEAN,
  logo_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    r.name as role_name,
    cm.is_owner,
    c.logo_url
  FROM companies c
  INNER JOIN company_members cm ON c.id = cm.company_id
  INNER JOIN roles r ON cm.role_id = r.id
  WHERE cm.user_id = p_user_id
  AND cm.is_active = true
  ORDER BY cm.is_owner DESC, cm.joined_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get company members
CREATE OR REPLACE FUNCTION get_company_members(p_company_id UUID)
RETURNS TABLE (
  user_id UUID,
  role_name VARCHAR,
  is_owner BOOLEAN,
  is_active BOOLEAN,
  joined_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.user_id,
    r.name as role_name,
    cm.is_owner,
    cm.is_active,
    cm.joined_at
  FROM company_members cm
  INNER JOIN roles r ON cm.role_id = r.id
  WHERE cm.company_id = p_company_id
  ORDER BY cm.is_owner DESC, cm.joined_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Complete
SELECT 'Multi-company architecture created successfully!' as status;
