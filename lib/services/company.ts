import { createClient } from '@/lib/supabase/server';
import { hasPermission } from './rbac';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompanyRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompanyInsert = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompanyUpdate = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompanyMemberRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompanyMemberInsert = any;

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

function mapCompanyRow(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name as { zh: string; en: string },
    logo_url: row.logo_url || undefined,
    signature_url: row.signature_url || undefined,
    passbook_url: row.passbook_url || undefined,
    tax_id: row.tax_id || undefined,
    bank_name: row.bank_name || undefined,
    bank_account: row.bank_account || undefined,
    bank_code: row.bank_code || undefined,
    address: row.address ? (row.address as { zh: string; en: string }) : undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    website: row.website || undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

function mapCompanyMemberRow(row: CompanyMemberRow & { role_name?: string }): CompanyMember {
  return {
    id: row.id,
    company_id: row.company_id,
    user_id: row.user_id,
    role_id: row.role_id,
    role_name: row.role_name,
    is_owner: row.is_owner,
    is_active: row.is_active,
    joined_at: new Date(row.joined_at),
  };
}

export async function getUserCompanies(userId: string): Promise<UserCompany[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('get_user_companies', { p_user_id: userId });

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type UserCompanyRow = any;

  return (data || []).map((row: UserCompanyRow) => ({
    company_id: row.company_id,
    company_name: row.company_name as { zh: string; en: string },
    role_name: row.role_name,
    is_owner: row.is_owner,
    logo_url: row.logo_url || undefined,
  }));
}

export async function getCompanyById(companyId: string, userId: string): Promise<Company | null> {
  const isMember = await isCompanyMember(userId, companyId);
  if (!isMember) {
    throw new Error('You do not have access to this company');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data ? mapCompanyRow(data) : null;
}

export async function createCompany(
  userId: string,
  formData: CompanyFormData
): Promise<Company> {
  const supabase = await createClient();

  const companyInsert: CompanyInsert = {
    name: { zh: formData.name_zh, en: formData.name_en },
    tax_id: formData.tax_id || null,
    bank_name: formData.bank_name || null,
    bank_account: formData.bank_account || null,
    bank_code: formData.bank_code || null,
    address: (formData.address_zh || formData.address_en)
      ? { zh: formData.address_zh || '', en: formData.address_en || '' }
      : null,
    phone: formData.phone || null,
    email: formData.email || null,
    website: formData.website || null,
    logo_url: formData.logo_url || null,
    signature_url: formData.signature_url || null,
    passbook_url: formData.passbook_url || null,
  };

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert(companyInsert)
    .select()
    .single();

  if (companyError) throw companyError;

  const { data: ownerRole, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'company_owner')
    .single();

  if (roleError || !ownerRole) {
    await supabase.from('companies').delete().eq('id', company.id);
    throw new Error('Company owner role not found');
  }

  const memberInsert: CompanyMemberInsert = {
    company_id: company.id,
    user_id: userId,
    role_id: ownerRole.id,
    is_owner: true,
    is_active: true,
  };

  const { error: memberError } = await supabase
    .from('company_members')
    .insert(memberInsert);

  if (memberError) {
    await supabase.from('companies').delete().eq('id', company.id);
    throw memberError;
  }

  return mapCompanyRow(company);
}

export async function updateCompany(
  companyId: string,
  userId: string,
  data: Partial<CompanyFormData>
): Promise<Company> {
  const member = await getCompanyMember(companyId, userId);
  if (!member || (!member.is_owner && !(await hasPermission(userId, 'company_settings', 'write')))) {
    throw new Error('Insufficient permissions to update company');
  }

  const supabase = await createClient();
  const updates: CompanyUpdate = {};

  if (data.name_zh || data.name_en) {
    const currentCompany = await getCompanyById(companyId, userId);
    const currentName = currentCompany?.name || { zh: '', en: '' };
    updates.name = {
      zh: data.name_zh || currentName.zh,
      en: data.name_en || currentName.en,
    };
  }

  if (data.address_zh || data.address_en) {
    const currentCompany = await getCompanyById(companyId, userId);
    const currentAddress = currentCompany?.address || { zh: '', en: '' };
    updates.address = {
      zh: data.address_zh || currentAddress.zh,
      en: data.address_en || currentAddress.en,
    };
  }

  const simpleFields = [
    'tax_id', 'bank_name', 'bank_account', 'bank_code',
    'phone', 'email', 'website', 'logo_url', 'signature_url', 'passbook_url'
  ] as const;

  simpleFields.forEach(field => {
    if (field in data) {
      const value = data[field];
      if (field === 'tax_id') updates.tax_id = (value as string) || null;
      else if (field === 'bank_name') updates.bank_name = (value as string) || null;
      else if (field === 'bank_account') updates.bank_account = (value as string) || null;
      else if (field === 'bank_code') updates.bank_code = (value as string) || null;
      else if (field === 'phone') updates.phone = (value as string) || null;
      else if (field === 'email') updates.email = (value as string) || null;
      else if (field === 'website') updates.website = (value as string) || null;
      else if (field === 'logo_url') updates.logo_url = (value as string) || null;
      else if (field === 'signature_url') updates.signature_url = (value as string) || null;
      else if (field === 'passbook_url') updates.passbook_url = (value as string) || null;
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new Error('No fields to update');
  }

  const { data: updated, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', companyId)
    .select()
    .single();

  if (error) throw error;
  if (!updated) throw new Error('Company not found');

  return mapCompanyRow(updated);
}

export async function deleteCompany(companyId: string, userId: string): Promise<void> {
  const member = await getCompanyMember(companyId, userId);
  if (!member || !member.is_owner) {
    throw new Error('Only company owner can delete the company');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId);

  if (error) throw error;
}

export async function isCompanyMember(userId: string, companyId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('is_company_member', { p_user_id: userId, p_company_id: companyId });

  if (error) throw error;

  return data || false;
}

export async function getCompanyMember(
  companyId: string,
  userId: string
): Promise<CompanyMember | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('company_members')
    .select(`
      *,
      roles!inner(name)
    `)
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  if (!data) return null;

  return mapCompanyMemberRow({
    ...data,
    role_name: (data.roles as { name: string }).name,
  });
}

export async function getCompanyMembers(companyId: string, userId: string): Promise<CompanyMember[]> {
  const isMember = await isCompanyMember(userId, companyId);
  if (!isMember) {
    throw new Error('You do not have access to this company');
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('get_company_members', { p_company_id: companyId });

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type CompanyMemberRow = any;

  return (data || []).map((row: CompanyMemberRow) => mapCompanyMemberRow(row));
}

export async function addCompanyMember(
  companyId: string,
  userId: string,
  newMemberUserId: string,
  roleId: string
): Promise<CompanyMember> {
  const member = await getCompanyMember(companyId, userId);
  if (!member || (!member.is_owner && !(await hasPermission(userId, 'users', 'write')))) {
    throw new Error('Insufficient permissions to add members');
  }

  const supabase = await createClient();

  const memberInsert: CompanyMemberInsert = {
    company_id: companyId,
    user_id: newMemberUserId,
    role_id: roleId,
    is_owner: false,
    is_active: true,
  };

  const { data, error } = await supabase
    .from('company_members')
    .insert(memberInsert)
    .select(`
      *,
      roles!inner(name)
    `)
    .single();

  if (error) throw error;

  return mapCompanyMemberRow({
    ...data,
    role_name: (data.roles as { name: string }).name,
  });
}

export async function updateCompanyMemberRole(
  companyId: string,
  userId: string,
  targetUserId: string,
  newRoleId: string
): Promise<CompanyMember> {
  const member = await getCompanyMember(companyId, userId);
  if (!member || (!member.is_owner && !(await hasPermission(userId, 'users', 'write')))) {
    throw new Error('Insufficient permissions to update member roles');
  }

  const targetMember = await getCompanyMember(companyId, targetUserId);
  if (targetMember?.is_owner) {
    throw new Error('Cannot change owner\'s role');
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('company_members')
    .update({ role_id: newRoleId })
    .eq('company_id', companyId)
    .eq('user_id', targetUserId)
    .select(`
      *,
      roles!inner(name)
    `)
    .single();

  if (error) throw error;

  return mapCompanyMemberRow({
    ...data,
    role_name: (data.roles as { name: string }).name,
  });
}

export async function removeCompanyMember(
  companyId: string,
  userId: string,
  targetUserId: string
): Promise<void> {
  const member = await getCompanyMember(companyId, userId);
  if (!member || (!member.is_owner && !(await hasPermission(userId, 'users', 'delete')))) {
    throw new Error('Insufficient permissions to remove members');
  }

  const targetMember = await getCompanyMember(companyId, targetUserId);
  if (targetMember?.is_owner) {
    throw new Error('Cannot remove company owner');
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('company_members')
    .update({ is_active: false })
    .eq('company_id', companyId)
    .eq('user_id', targetUserId);

  if (error) throw error;
}

export interface FileUploadResult {
  url: string;
  path: string;
}

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

  return await updateCompany(companyId, userId, { [field]: fileUrl } as Partial<CompanyFormData>);
}

export interface CompanyMemberDetailed extends CompanyMember {
  full_name?: string;
  display_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  role_name_zh?: string;
  role_name_en?: string;
  role_level?: number;
}

export async function getCompanyMembersDetailed(
  companyId: string,
  requestingUserId: string
): Promise<CompanyMemberDetailed[]> {
  const { canAccessCompany } = await import('./rbac');
  const canAccess = await canAccessCompany(requestingUserId, companyId);
  if (!canAccess) {
    throw new Error('You do not have access to this company');
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('company_members')
    .select(`
      *,
      user_profiles!inner(
        full_name,
        display_name,
        phone,
        avatar_url
      ),
      roles!inner(
        name,
        name_zh,
        name_en,
        level
      )
    `)
    .eq('company_id', companyId)
    .order('is_owner', { ascending: false })
    .order('joined_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => {
    const profile = row.user_profiles as {
      full_name: string | null;
      display_name: string | null;
      phone: string | null;
      avatar_url: string | null;
    };
    const role = row.roles as {
      name: string;
      name_zh: string;
      name_en: string;
      level: number;
    };

    return {
      id: row.id,
      company_id: row.company_id,
      user_id: row.user_id,
      role_id: row.role_id,
      is_owner: row.is_owner,
      is_active: row.is_active,
      joined_at: new Date(row.joined_at),
      full_name: profile.full_name || undefined,
      display_name: profile.display_name || undefined,
      phone: profile.phone || undefined,
      avatar_url: profile.avatar_url || undefined,
      role_name: role.name,
      role_name_zh: role.name_zh,
      role_name_en: role.name_en,
      role_level: role.level,
    };
  });
}

export interface AddCompanyMemberData {
  email: string;
  roleName: string;
  fullName?: string;
  displayName?: string;
  phone?: string;
}

export async function addCompanyMemberEnhanced(
  companyId: string,
  requestingUserId: string,
  memberData: AddCompanyMemberData
): Promise<CompanyMember> {
  const {
    isSuperAdmin,
    canAssignRole,
    getRoleByName
  } = await import('./rbac');

  const isSuperAdminUser = await isSuperAdmin(requestingUserId);
  const member = await getCompanyMember(companyId, requestingUserId);

  if (!isSuperAdminUser && (!member || !member.is_owner)) {
    throw new Error('Insufficient permissions to add members');
  }

  const canAssign = await canAssignRole(
    requestingUserId,
    memberData.roleName as 'super_admin' | 'company_owner' | 'sales_manager' | 'salesperson' | 'accountant',
    companyId
  );

  if (!canAssign) {
    throw new Error(`Cannot assign role: ${memberData.roleName}`);
  }

  const role = await getRoleByName(memberData.roleName as 'super_admin' | 'company_owner' | 'sales_manager' | 'salesperson' | 'accountant');
  if (!role) {
    throw new Error(`Role not found: ${memberData.roleName}`);
  }

  throw new Error(
    'User registration not yet implemented. Please ensure user is registered before adding to company.'
  );
}

export async function getAllCompaniesForAdmin(
  requestingUserId: string
): Promise<Company[]> {
  const { isSuperAdmin } = await import('./rbac');

  const isSuperAdminUser = await isSuperAdmin(requestingUserId);
  if (!isSuperAdminUser) {
    throw new Error('Only super admin can view all companies');
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(mapCompanyRow);
}

export interface CompanyStats {
  total_members: number;
  active_members: number;
  total_customers: number;
  total_products: number;
  total_quotations: number;
}

export async function getCompanyStats(
  companyId: string,
  requestingUserId: string
): Promise<CompanyStats> {
  const { canAccessCompany } = await import('./rbac');

  const canAccess = await canAccessCompany(requestingUserId, companyId);
  if (!canAccess) {
    throw new Error('You do not have access to this company');
  }

  const supabase = await createClient();

  const [
    { count: totalMembers },
    { count: activeMembers },
    { count: totalCustomers },
    { count: totalProducts },
    { count: totalQuotations },
  ] = await Promise.all([
    supabase.from('company_members').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('company_members').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
  ]);

  return {
    total_members: totalMembers || 0,
    active_members: activeMembers || 0,
    total_customers: totalCustomers || 0,
    total_products: totalProducts || 0,
    total_quotations: totalQuotations || 0,
  };
}
