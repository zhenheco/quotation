/**
 * Company Service - Multi-Company Support
 * Handles company information, members, and access control
 */

import { query, getClient } from '../db/zeabur';
import { hasPermission } from './rbac';

// ============================================================================
// TYPES
// ============================================================================

export interface Company {
  id: string;
  name: {
    zh: string;
    en: string;
  };
  logo_url?: string;
  signature_url?: string;
  passbook_url?: string;
  tax_id?: string;
  bank_name?: string;
  bank_account?: string;
  bank_code?: string;
  address?: {
    zh: string;
    en: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role_id: string;
  role_name?: string;
  is_owner: boolean;
  is_active: boolean;
  joined_at: Date;
}

export interface UserCompany {
  company_id: string;
  company_name: {
    zh: string;
    en: string;
  };
  role_name: string;
  is_owner: boolean;
  logo_url?: string;
}

export interface CompanyFormData {
  name_zh: string;
  name_en: string;
  tax_id?: string;
  bank_name?: string;
  bank_account?: string;
  bank_code?: string;
  address_zh?: string;
  address_en?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  signature_url?: string;
  passbook_url?: string;
}

// ============================================================================
// COMPANY CRUD
// ============================================================================

/**
 * Get all companies for a user
 */
export async function getUserCompanies(userId: string): Promise<UserCompany[]> {
  const result = await query(
    `SELECT * FROM get_user_companies($1)`,
    [userId]
  );

  return result.rows.map(row => ({
    company_id: row.company_id,
    company_name: row.company_name,
    role_name: row.role_name,
    is_owner: row.is_owner,
    logo_url: row.logo_url
  }));
}

/**
 * Get a specific company by ID
 */
export async function getCompanyById(companyId: string, userId: string): Promise<Company | null> {
  // Check if user is a member of this company
  const isMember = await isCompanyMember(userId, companyId);
  if (!isMember) {
    throw new Error('You do not have access to this company');
  }

  const result = await query(
    `SELECT * FROM companies WHERE id = $1`,
    [companyId]
  );

  return result.rows[0] || null;
}

/**
 * Create a new company
 */
export async function createCompany(
  userId: string,
  data: CompanyFormData
): Promise<Company> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Create company
    const companyResult = await client.query(
      `INSERT INTO companies (
        name, tax_id, bank_name, bank_account, bank_code,
        address, phone, email, website, logo_url, signature_url, passbook_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        JSON.stringify({ zh: data.name_zh, en: data.name_en }),
        data.tax_id || null,
        data.bank_name || null,
        data.bank_account || null,
        data.bank_code || null,
        data.address_zh || data.address_en
          ? JSON.stringify({ zh: data.address_zh || '', en: data.address_en || '' })
          : null,
        data.phone || null,
        data.email || null,
        data.website || null,
        data.logo_url || null,
        data.signature_url || null,
        data.passbook_url || null
      ]
    );

    const company = companyResult.rows[0];

    // Get admin role ID
    const roleResult = await client.query(
      `SELECT id FROM roles WHERE name = 'admin' LIMIT 1`
    );

    if (roleResult.rows.length === 0) {
      throw new Error('Admin role not found');
    }

    // Add creator as owner with admin role
    await client.query(
      `INSERT INTO company_members (company_id, user_id, role_id, is_owner, is_active)
       VALUES ($1, $2, $3, true, true)`,
      [company.id, userId, roleResult.rows[0].id]
    );

    await client.query('COMMIT');
    return company;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update a company
 */
export async function updateCompany(
  companyId: string,
  userId: string,
  data: Partial<CompanyFormData>
): Promise<Company> {
  // Check if user is owner or has permission
  const member = await getCompanyMember(companyId, userId);
  if (!member || (!member.is_owner && !(await hasPermission(userId, 'company_settings', 'write')))) {
    throw new Error('Insufficient permissions to update company');
  }

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Handle name update
  if (data.name_zh || data.name_en) {
    const currentCompany = await getCompanyById(companyId, userId);
    const currentName = currentCompany?.name || { zh: '', en: '' };
    fields.push(`name = $${paramIndex}`);
    values.push(JSON.stringify({
      zh: data.name_zh || currentName.zh,
      en: data.name_en || currentName.en
    }));
    paramIndex++;
  }

  // Handle address update
  if (data.address_zh || data.address_en) {
    const currentCompany = await getCompanyById(companyId, userId);
    const currentAddress = currentCompany?.address || { zh: '', en: '' };
    fields.push(`address = $${paramIndex}`);
    values.push(JSON.stringify({
      zh: data.address_zh || currentAddress.zh,
      en: data.address_en || currentAddress.en
    }));
    paramIndex++;
  }

  // Handle other fields
  const simpleFields = [
    'tax_id', 'bank_name', 'bank_account', 'bank_code',
    'phone', 'email', 'website', 'logo_url', 'signature_url', 'passbook_url'
  ];

  simpleFields.forEach(field => {
    if (field in data) {
      fields.push(`${field} = $${paramIndex}`);
      values.push((data as any)[field]);
      paramIndex++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(companyId);

  const result = await query(
    `UPDATE companies
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Company not found');
  }

  return result.rows[0];
}

/**
 * Delete a company (only owner can delete)
 */
export async function deleteCompany(companyId: string, userId: string): Promise<void> {
  const member = await getCompanyMember(companyId, userId);
  if (!member || !member.is_owner) {
    throw new Error('Only company owner can delete the company');
  }

  await query(
    `DELETE FROM companies WHERE id = $1`,
    [companyId]
  );
}

// ============================================================================
// COMPANY MEMBERS
// ============================================================================

/**
 * Check if user is a member of a company
 */
export async function isCompanyMember(userId: string, companyId: string): Promise<boolean> {
  const result = await query(
    `SELECT is_company_member($1, $2) as is_member`,
    [userId, companyId]
  );

  return result.rows[0]?.is_member || false;
}

/**
 * Get a specific company member
 */
export async function getCompanyMember(
  companyId: string,
  userId: string
): Promise<CompanyMember | null> {
  const result = await query(
    `SELECT cm.*, r.name as role_name
     FROM company_members cm
     LEFT JOIN roles r ON cm.role_id = r.id
     WHERE cm.company_id = $1 AND cm.user_id = $2`,
    [companyId, userId]
  );

  return result.rows[0] || null;
}

/**
 * Get all members of a company
 */
export async function getCompanyMembers(companyId: string, userId: string): Promise<CompanyMember[]> {
  // Check if user has access to this company
  const isMember = await isCompanyMember(userId, companyId);
  if (!isMember) {
    throw new Error('You do not have access to this company');
  }

  const result = await query(
    `SELECT * FROM get_company_members($1)`,
    [companyId]
  );

  return result.rows;
}

/**
 * Add a member to a company
 */
export async function addCompanyMember(
  companyId: string,
  userId: string,
  newMemberUserId: string,
  roleId: string
): Promise<CompanyMember> {
  // Check if requester is owner or has permission
  const member = await getCompanyMember(companyId, userId);
  if (!member || (!member.is_owner && !(await hasPermission(userId, 'user_management', 'write')))) {
    throw new Error('Insufficient permissions to add members');
  }

  const result = await query(
    `INSERT INTO company_members (company_id, user_id, role_id, is_owner, is_active)
     VALUES ($1, $2, $3, false, true)
     RETURNING *`,
    [companyId, newMemberUserId, roleId]
  );

  return result.rows[0];
}

/**
 * Update a company member's role
 */
export async function updateCompanyMemberRole(
  companyId: string,
  userId: string,
  targetUserId: string,
  newRoleId: string
): Promise<CompanyMember> {
  // Check if requester is owner or has permission
  const member = await getCompanyMember(companyId, userId);
  if (!member || (!member.is_owner && !(await hasPermission(userId, 'user_management', 'write')))) {
    throw new Error('Insufficient permissions to update member roles');
  }

  // Cannot change owner's role
  const targetMember = await getCompanyMember(companyId, targetUserId);
  if (targetMember?.is_owner) {
    throw new Error('Cannot change owner\'s role');
  }

  const result = await query(
    `UPDATE company_members
     SET role_id = $1, updated_at = NOW()
     WHERE company_id = $2 AND user_id = $3
     RETURNING *`,
    [newRoleId, companyId, targetUserId]
  );

  return result.rows[0];
}

/**
 * Remove a member from a company (deactivate)
 */
export async function removeCompanyMember(
  companyId: string,
  userId: string,
  targetUserId: string
): Promise<void> {
  // Check if requester is owner or has permission
  const member = await getCompanyMember(companyId, userId);
  if (!member || (!member.is_owner && !(await hasPermission(userId, 'user_management', 'delete')))) {
    throw new Error('Insufficient permissions to remove members');
  }

  // Cannot remove owner
  const targetMember = await getCompanyMember(companyId, targetUserId);
  if (targetMember?.is_owner) {
    throw new Error('Cannot remove company owner');
  }

  await query(
    `UPDATE company_members
     SET is_active = false, updated_at = NOW()
     WHERE company_id = $1 AND user_id = $2`,
    [companyId, targetUserId]
  );
}

// ============================================================================
// FILE UPLOAD HELPERS
// ============================================================================

export interface FileUploadResult {
  url: string;
  path: string;
}

/**
 * Update company file URL
 */
export async function updateCompanyFile(
  companyId: string,
  userId: string,
  fileType: 'logo' | 'signature' | 'passbook',
  fileUrl: string
): Promise<Company> {
  const fieldMap = {
    logo: 'logo_url',
    signature: 'signature_url',
    passbook: 'passbook_url',
  };

  const field = fieldMap[fileType];

  return await updateCompany(companyId, userId, { [field]: fileUrl } as any);
}
