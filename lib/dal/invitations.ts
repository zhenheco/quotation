/**
 * 邀請連結資料存取層 (DAL)
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import type {
  CompanyInvitation,
  CompanyInvitationWithDetails,
} from '@/types/invitation.types'
import { randomBytes } from 'crypto'

function generateInviteCode(): string {
  return randomBytes(16).toString('hex')
}

export async function getCompanyInvitations(
  db: SupabaseClient,
  companyId: string
): Promise<CompanyInvitationWithDetails[]> {
  const { data, error } = await db
    .from('company_invitations')
    .select(`
      *,
      roles (id, name, display_name),
      companies (id, name)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get invitations: ${error.message}`)
  }

  return (data || []).map(inv => ({
    ...inv,
    role: inv.roles as CompanyInvitationWithDetails['role'],
    company: inv.companies as CompanyInvitationWithDetails['company'],
    roles: undefined,
    companies: undefined,
  }))
}

export async function createInvitation(
  db: SupabaseClient,
  data: {
    company_id: string
    role_id: string
    created_by: string
    max_uses?: number
    expires_in_days?: number
  }
): Promise<CompanyInvitation> {
  const expiresInDays = data.expires_in_days ?? 7
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const inviteCode = generateInviteCode()

  const { data: invitation, error } = await db
    .from('company_invitations')
    .insert({
      id: crypto.randomUUID(),
      company_id: data.company_id,
      invite_code: inviteCode,
      role_id: data.role_id,
      created_by: data.created_by,
      expires_at: expiresAt.toISOString(),
      max_uses: data.max_uses ?? 1,
      used_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create invitation: ${error.message}`)
  }

  return invitation
}

export async function getInvitationByCode(
  db: SupabaseClient,
  code: string
): Promise<CompanyInvitationWithDetails | null> {
  const { data, error } = await db
    .from('company_invitations')
    .select(`
      *,
      roles (id, name, display_name),
      companies (id, name)
    `)
    .eq('invite_code', code)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get invitation: ${error.message}`)
  }

  if (!data) return null

  return {
    ...data,
    role: data.roles as CompanyInvitationWithDetails['role'],
    company: data.companies as CompanyInvitationWithDetails['company'],
    roles: undefined,
    companies: undefined,
  }
}

export async function validateInvitation(
  db: SupabaseClient,
  code: string
): Promise<{ valid: boolean; invitation?: CompanyInvitationWithDetails; error?: string }> {
  const invitation = await getInvitationByCode(db, code)

  if (!invitation) {
    return { valid: false, error: 'INVITATION_NOT_FOUND' }
  }

  if (!invitation.is_active) {
    return { valid: false, error: 'INVITATION_REVOKED' }
  }

  const now = new Date()
  const expiresAt = new Date(invitation.expires_at)
  if (now > expiresAt) {
    return { valid: false, error: 'INVITATION_EXPIRED' }
  }

  if (invitation.used_count >= invitation.max_uses) {
    return { valid: false, error: 'INVITATION_MAX_USES_REACHED' }
  }

  return { valid: true, invitation }
}

export async function acceptInvitation(
  db: SupabaseClient,
  code: string,
  userId: string
): Promise<{ success: boolean; company_id?: string; error?: string }> {
  const validation = await validateInvitation(db, code)

  if (!validation.valid || !validation.invitation) {
    return { success: false, error: validation.error }
  }

  const invitation = validation.invitation

  // 檢查是否已經是成員
  const { data: existingMember } = await db
    .from('company_members')
    .select('id, is_active')
    .eq('company_id', invitation.company_id)
    .eq('user_id', userId)
    .single()

  if (existingMember) {
    if (existingMember.is_active) {
      return { success: false, error: 'ALREADY_MEMBER' }
    }

    // 重新啟用成員資格
    const { error: reactivateError } = await db
      .from('company_members')
      .update({
        is_active: true,
        role_id: invitation.role_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingMember.id)

    if (reactivateError) {
      return { success: false, error: 'FAILED_TO_REACTIVATE' }
    }
  } else {
    // 新增成員
    const { error: insertError } = await db
      .from('company_members')
      .insert({
        id: crypto.randomUUID(),
        company_id: invitation.company_id,
        user_id: userId,
        role_id: invitation.role_id,
        is_owner: false,
        is_active: true,
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (insertError) {
      return { success: false, error: 'FAILED_TO_ADD_MEMBER' }
    }
  }

  // 更新邀請使用次數
  const { error: updateError } = await db
    .from('company_invitations')
    .update({
      used_count: invitation.used_count + 1,
    })
    .eq('id', invitation.id)

  if (updateError) {
    console.error('Failed to update invitation used_count:', updateError)
  }

  return { success: true, company_id: invitation.company_id }
}

export async function revokeInvitation(
  db: SupabaseClient,
  invitationId: string
): Promise<void> {
  const { error } = await db
    .from('company_invitations')
    .update({
      is_active: false,
    })
    .eq('id', invitationId)

  if (error) {
    throw new Error(`Failed to revoke invitation: ${error.message}`)
  }
}

export async function deleteInvitation(
  db: SupabaseClient,
  invitationId: string
): Promise<void> {
  const { error } = await db
    .from('company_invitations')
    .delete()
    .eq('id', invitationId)

  if (error) {
    throw new Error(`Failed to delete invitation: ${error.message}`)
  }
}
