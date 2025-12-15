/**
 * POS 會員資料存取層 (DAL)
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================
// 類型定義
// ============================================

export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type PaymentMethodType = 'CASH' | 'CARD' | 'TRANSFER' | 'BALANCE' | 'OTHER'

export interface MemberLevel {
  id: string
  tenant_id: string
  name: string
  code: string
  description: string | null
  min_spent: number
  discount_rate: number
  points_multiplier: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PosMember {
  id: string
  tenant_id: string
  name: string
  phone: string
  email: string | null
  gender: Gender | null
  birthday: string | null
  member_no: string
  join_date: string
  level_id: string | null
  level_upgrade_date: string | null
  balance: number
  points: number
  total_spent: number
  consent_at: string | null
  marketing_consent: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MemberDeposit {
  id: string
  member_id: string
  deposit_amount: number
  bonus_amount: number
  total_amount: number
  payment_method: PaymentMethodType
  promotion_id: string | null
  created_at: string
  created_by: string | null
}

export interface CreateMemberInput {
  tenant_id: string
  name: string
  phone: string
  email?: string
  gender?: Gender
  birthday?: string
  level_id?: string
  marketing_consent?: boolean
}

export interface UpdateMemberInput {
  name?: string
  phone?: string
  email?: string
  gender?: Gender
  birthday?: string
  level_id?: string
  marketing_consent?: boolean
  is_active?: boolean
}

export interface MemberQueryOptions {
  tenantId: string
  search?: string
  levelId?: string
  isActive?: boolean
  limit?: number
  offset?: number
}

export interface MemberWithLevel extends PosMember {
  level: MemberLevel | null
}

// ============================================
// 輔助函數
// ============================================

/**
 * 產生會員編號
 */
async function generateMemberNo(db: SupabaseClient, tenantId: string): Promise<string> {
  const today = new Date()
  const prefix = `M${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`

  const { data, error } = await db
    .from('pos_members')
    .select('member_no')
    .eq('tenant_id', tenantId)
    .like('member_no', `${prefix}%`)
    .order('member_no', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`產生會員編號失敗: ${error.message}`)
  }

  let nextSeq = 1
  if (data && data.length > 0) {
    const lastNo = data[0].member_no
    const lastSeq = parseInt(lastNo.substring(7), 10)
    nextSeq = lastSeq + 1
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`
}

// ============================================
// 會員等級查詢函數
// ============================================

/**
 * 取得會員等級列表
 */
export async function getMemberLevels(
  db: SupabaseClient,
  tenantId: string
): Promise<MemberLevel[]> {
  const { data, error } = await db
    .from('member_levels')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('min_spent', { ascending: true })

  if (error) {
    throw new Error(`取得會員等級失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據消費金額取得適用等級
 */
export async function getMemberLevelBySpent(
  db: SupabaseClient,
  tenantId: string,
  totalSpent: number
): Promise<MemberLevel | null> {
  const { data, error } = await db
    .from('member_levels')
    .select('*')
    .eq('tenant_id', tenantId)
    .lte('min_spent', totalSpent)
    .order('min_spent', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`取得會員等級失敗: ${error.message}`)
  }

  return data?.[0] || null
}

// ============================================
// 會員查詢函數
// ============================================

/**
 * 取得會員列表
 */
export async function getMembers(
  db: SupabaseClient,
  options: MemberQueryOptions
): Promise<MemberWithLevel[]> {
  const { tenantId, search, levelId, isActive = true, limit = 50, offset = 0 } = options

  let query = db
    .from('pos_members')
    .select(`
      *,
      level:member_levels(*)
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,member_no.ilike.%${search}%`)
  }

  if (levelId) {
    query = query.eq('level_id', levelId)
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得會員列表失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得會員
 */
export async function getMemberById(
  db: SupabaseClient,
  memberId: string
): Promise<MemberWithLevel | null> {
  const { data, error } = await db
    .from('pos_members')
    .select(`
      *,
      level:member_levels(*)
    `)
    .eq('id', memberId)
    .is('deleted_at', null)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得會員失敗: ${error.message}`)
  }

  return data
}

/**
 * 根據電話取得會員
 */
export async function getMemberByPhone(
  db: SupabaseClient,
  tenantId: string,
  phone: string
): Promise<PosMember | null> {
  const { data, error } = await db
    .from('pos_members')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('phone', phone)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`取得會員失敗: ${error.message}`)
  }

  return data
}

/**
 * 根據會員編號取得會員
 */
export async function getMemberByNo(
  db: SupabaseClient,
  tenantId: string,
  memberNo: string
): Promise<PosMember | null> {
  const { data, error } = await db
    .from('pos_members')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('member_no', memberNo)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`取得會員失敗: ${error.message}`)
  }

  return data
}

/**
 * 取得會員儲值記錄
 */
export async function getMemberDeposits(
  db: SupabaseClient,
  memberId: string,
  limit: number = 20
): Promise<MemberDeposit[]> {
  const { data, error } = await db
    .from('member_deposits')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`取得儲值記錄失敗: ${error.message}`)
  }

  return data || []
}

// ============================================
// 會員寫入函數
// ============================================

/**
 * 建立會員
 */
export async function createMember(
  db: SupabaseClient,
  input: CreateMemberInput
): Promise<PosMember> {
  // 檢查電話是否重複
  const existing = await getMemberByPhone(db, input.tenant_id, input.phone)
  if (existing) {
    throw new Error(`電話 ${input.phone} 已被註冊`)
  }

  // 產生會員編號
  const memberNo = await generateMemberNo(db, input.tenant_id)

  // 取得預設等級（如果有）
  let levelId = input.level_id
  if (!levelId) {
    const defaultLevel = await getMemberLevelBySpent(db, input.tenant_id, 0)
    levelId = defaultLevel?.id
  }

  const { data, error } = await db
    .from('pos_members')
    .insert({
      id: crypto.randomUUID(),
      tenant_id: input.tenant_id,
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      gender: input.gender || null,
      birthday: input.birthday || null,
      member_no: memberNo,
      join_date: new Date().toISOString().split('T')[0],
      level_id: levelId || null,
      balance: 0,
      points: 0,
      total_spent: 0,
      consent_at: new Date().toISOString(),
      marketing_consent: input.marketing_consent || false,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`建立會員失敗: ${error.message}`)
  }

  return data
}

/**
 * 更新會員
 */
export async function updateMember(
  db: SupabaseClient,
  memberId: string,
  input: UpdateMemberInput
): Promise<PosMember> {
  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.phone !== undefined) updateData.phone = input.phone
  if (input.email !== undefined) updateData.email = input.email
  if (input.gender !== undefined) updateData.gender = input.gender
  if (input.birthday !== undefined) updateData.birthday = input.birthday
  if (input.level_id !== undefined) updateData.level_id = input.level_id
  if (input.marketing_consent !== undefined) updateData.marketing_consent = input.marketing_consent
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await db
    .from('pos_members')
    .update(updateData)
    .eq('id', memberId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    throw new Error(`更新會員失敗: ${error.message}`)
  }

  return data
}

/**
 * 刪除會員（軟刪除）
 */
export async function deleteMember(db: SupabaseClient, memberId: string): Promise<void> {
  const { error } = await db
    .from('pos_members')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', memberId)

  if (error) {
    throw new Error(`刪除會員失敗: ${error.message}`)
  }
}

/**
 * 會員儲值
 */
export async function depositToMember(
  db: SupabaseClient,
  memberId: string,
  amount: number,
  bonusAmount: number,
  paymentMethod: PaymentMethodType,
  promotionId?: string,
  createdBy?: string
): Promise<MemberDeposit> {
  // 取得會員
  const member = await getMemberById(db, memberId)
  if (!member) {
    throw new Error('會員不存在')
  }

  const totalAmount = amount + bonusAmount

  // 建立儲值記錄
  const { data: deposit, error: depositError } = await db
    .from('member_deposits')
    .insert({
      id: crypto.randomUUID(),
      member_id: memberId,
      deposit_amount: amount,
      bonus_amount: bonusAmount,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      promotion_id: promotionId || null,
      created_by: createdBy || null,
    })
    .select()
    .single()

  if (depositError) {
    throw new Error(`建立儲值記錄失敗: ${depositError.message}`)
  }

  // 更新會員餘額
  const { error: updateError } = await db
    .from('pos_members')
    .update({
      balance: member.balance + totalAmount,
    })
    .eq('id', memberId)

  if (updateError) {
    throw new Error(`更新會員餘額失敗: ${updateError.message}`)
  }

  return deposit
}

/**
 * 扣除會員餘額
 */
export async function deductMemberBalance(
  db: SupabaseClient,
  memberId: string,
  amount: number
): Promise<number> {
  const member = await getMemberById(db, memberId)
  if (!member) {
    throw new Error('會員不存在')
  }

  if (member.balance < amount) {
    throw new Error('餘額不足')
  }

  const newBalance = member.balance - amount

  const { error } = await db
    .from('pos_members')
    .update({ balance: newBalance })
    .eq('id', memberId)

  if (error) {
    throw new Error(`扣除餘額失敗: ${error.message}`)
  }

  return newBalance
}

/**
 * 更新會員累計消費並檢查升等
 */
export async function updateMemberSpent(
  db: SupabaseClient,
  memberId: string,
  amount: number
): Promise<PosMember> {
  const member = await getMemberById(db, memberId)
  if (!member) {
    throw new Error('會員不存在')
  }

  const newTotalSpent = member.total_spent + amount

  // 檢查是否需要升等
  const newLevel = await getMemberLevelBySpent(db, member.tenant_id, newTotalSpent)

  const updateData: Record<string, unknown> = {
    total_spent: newTotalSpent,
  }

  if (newLevel && newLevel.id !== member.level_id) {
    updateData.level_id = newLevel.id
    updateData.level_upgrade_date = new Date().toISOString().split('T')[0]
  }

  const { data, error } = await db
    .from('pos_members')
    .update(updateData)
    .eq('id', memberId)
    .select()
    .single()

  if (error) {
    throw new Error(`更新會員消費失敗: ${error.message}`)
  }

  return data
}

// ============================================
// RPC 版本（原子性操作）
// ============================================

/**
 * 會員儲值（RPC 版本 - 原子性操作）
 */
export async function depositToMemberRpc(
  db: SupabaseClient,
  memberId: string,
  amount: number,
  bonusAmount: number,
  paymentMethod: PaymentMethodType,
  reference: string | null,
  processedBy: string
): Promise<{
  deposit_id: string
  member_id: string
  amount: number
  bonus_amount: number
  new_balance: number
}> {
  const { data, error } = await db.rpc('process_member_deposit', {
    p_member_id: memberId,
    p_amount: amount,
    p_bonus_amount: bonusAmount,
    p_payment_method: paymentMethod,
    p_reference: reference,
    p_processed_by: processedBy,
  })

  if (error) {
    throw new Error(`儲值失敗 (RPC): ${error.message}`)
  }

  return data
}
