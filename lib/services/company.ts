/**
 * Company Settings Service
 * Handles company information, logos, and bank details
 */

import { pool } from '../db/zeabur';
import type { CompanySettings, CompanySettingsFormData } from '@/types/extended.types';
import { hasPermission } from './rbac';

// ============================================================================
// COMPANY SETTINGS
// ============================================================================

export async function getCompanySettings(userId: string): Promise<CompanySettings | null> {
  const result = await pool.query(
    `SELECT * FROM company_settings WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

export async function createCompanySettings(
  userId: string,
  data: CompanySettingsFormData
): Promise<CompanySettings> {
  // Check permission
  const canWrite = await hasPermission(userId, 'company_settings', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to create company settings');
  }

  // Check if settings already exist
  const existing = await getCompanySettings(userId);
  if (existing) {
    throw new Error('Company settings already exist. Use update instead.');
  }

  const result = await pool.query(
    `INSERT INTO company_settings (
       user_id,
       company_name_zh,
       company_name_en,
       tax_id,
       address_zh,
       address_en,
       phone,
       email,
       website,
       bank_name,
       bank_code,
       account_number,
       account_name,
       swift_code,
       default_currency,
       default_tax_rate,
       default_payment_terms,
       default_payment_day
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     RETURNING *`,
    [
      userId,
      data.company_name_zh || null,
      data.company_name_en || null,
      data.tax_id || null,
      data.address_zh || null,
      data.address_en || null,
      data.phone || null,
      data.email || null,
      data.website || null,
      data.bank_name || null,
      data.bank_code || null,
      data.account_number || null,
      data.account_name || null,
      data.swift_code || null,
      data.default_currency || 'TWD',
      data.default_tax_rate || 5.00,
      data.default_payment_terms || null,
      data.default_payment_day || 5,
    ]
  );

  return result.rows[0];
}

export async function updateCompanySettings(
  userId: string,
  data: Partial<CompanySettingsFormData>
): Promise<CompanySettings> {
  // Check permission
  const canWrite = await hasPermission(userId, 'company_settings', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to update company settings');
  }

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    fields.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(userId);

  const result = await pool.query(
    `UPDATE company_settings
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE user_id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Company settings not found');
  }

  return result.rows[0];
}

export async function updateCompanyLogo(
  userId: string,
  logoUrl: string
): Promise<CompanySettings> {
  return await updateCompanySettings(userId, { logo_url: logoUrl } as any);
}

export async function updateCompanySignature(
  userId: string,
  signatureUrl: string
): Promise<CompanySettings> {
  return await updateCompanySettings(userId, { signature_url: signatureUrl } as any);
}

export async function updatePassbookImage(
  userId: string,
  passbookUrl: string
): Promise<CompanySettings> {
  return await updateCompanySettings(userId, { passbook_image_url: passbookUrl } as any);
}

// ============================================================================
// FILE UPLOAD HELPERS
// ============================================================================

export interface FileUploadResult {
  url: string;
  path: string;
}

/**
 * Note: Actual file upload to Supabase Storage should be done in the API route
 * This service just updates the URL in the database
 */

export async function updateCompanyFile(
  userId: string,
  fileType: 'logo' | 'signature' | 'passbook',
  fileUrl: string
): Promise<CompanySettings> {
  const fieldMap = {
    logo: 'logo_url',
    signature: 'signature_url',
    passbook: 'passbook_image_url',
  };

  const field = fieldMap[fileType];

  return await updateCompanySettings(userId, { [field]: fileUrl } as any);
}
