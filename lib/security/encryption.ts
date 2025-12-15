/**
 * 資料加密模組 - WebCrypto API 版本
 * Edge Runtime 相容（Cloudflare Workers）
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================
// 常數定義
// ============================================

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // GCM 建議使用 12 bytes
const SALT_LENGTH = 32
const PBKDF2_ITERATIONS = 100000

// ============================================
// 工具函數
// ============================================

/**
 * 將 Uint8Array 轉換為 Base64 字串
 */
function uint8ArrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
}

/**
 * 將 Base64 字串轉換為 Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * 將 Uint8Array 轉換為 Hex 字串
 */
function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 將 Hex 字串轉換為 Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(hex.length / 2)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

/**
 * 產生隨機 bytes
 */
function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(length)
  const arr = new Uint8Array(buffer)
  crypto.getRandomValues(arr)
  return arr
}

// ============================================
// 主金鑰管理
// ============================================

let cachedMasterKey: CryptoKey | null = null

/**
 * 取得主加密金鑰
 */
async function getMasterKey(): Promise<CryptoKey> {
  if (cachedMasterKey) {
    return cachedMasterKey
  }

  const keyHex = process.env.ENCRYPTION_MASTER_KEY
  if (!keyHex) {
    throw new Error('ENCRYPTION_MASTER_KEY environment variable is not set')
  }

  const keyBytes = hexToUint8Array(keyHex)

  cachedMasterKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )

  return cachedMasterKey
}

// ============================================
// 基本加解密函數
// ============================================

/**
 * 加密敏感欄位
 * 輸出格式：base64(iv + ciphertext + authTag)
 */
export async function encryptField(plaintext: string): Promise<string> {
  const masterKey = await getMasterKey()
  const iv = randomBytes(IV_LENGTH)
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    masterKey,
    data
  )

  // WebCrypto 的 AES-GCM 輸出已包含 authTag
  const ciphertext = new Uint8Array(cipherBuffer)

  // 組合：iv + ciphertext (含 authTag)
  const combined = new Uint8Array(iv.length + ciphertext.length)
  combined.set(iv, 0)
  combined.set(ciphertext, iv.length)

  return uint8ArrayToBase64(combined)
}

/**
 * 解密敏感欄位
 */
export async function decryptField(ciphertext: string): Promise<string> {
  const masterKey = await getMasterKey()
  const combined = base64ToUint8Array(ciphertext)

  const iv = combined.slice(0, IV_LENGTH)
  const encrypted = combined.slice(IV_LENGTH)

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    masterKey,
    encrypted
  )

  const decoder = new TextDecoder()
  return decoder.decode(decryptedBuffer)
}

// ============================================
// 雜湊函數
// ============================================

/**
 * 對敏感資料進行雜湊（用於驗證，不可逆）
 * 輸出格式：salt:hash
 */
export async function hashSensitiveData(data: string, existingSalt?: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = existingSalt ? hexToUint8Array(existingSalt) : randomBytes(SALT_LENGTH)

  // 使用 PBKDF2 產生金鑰物料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(data),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  // 衍生位元
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-512',
    },
    keyMaterial,
    512 // 64 bytes = 512 bits
  )

  const hash = uint8ArrayToHex(new Uint8Array(hashBuffer))
  const saltHex = uint8ArrayToHex(salt)

  return `${saltHex}:${hash}`
}

/**
 * 驗證敏感資料的雜湊
 */
export async function verifySensitiveData(data: string, storedHash: string): Promise<boolean> {
  const [salt] = storedHash.split(':')
  const newHash = await hashSensitiveData(data, salt)
  return newHash === storedHash
}

// ============================================
// 租戶專屬金鑰管理
// ============================================

type KeyStatus = 'ACTIVE' | 'ROTATING' | 'RETIRED' | 'COMPROMISED'

/** 加密金鑰記錄（用於資料庫查詢結果類型推導） */
export interface EncryptionKeyRecord {
  id: string
  tenant_id: string
  key_alias: string
  key_type: string
  key_version: number
  encrypted_key: string
  iv: string
  status: KeyStatus
  created_at: string
  rotated_at: string | null
}

/**
 * 取得租戶專屬金鑰
 */
async function getTenantKey(
  db: SupabaseClient,
  tenantId: string,
  keyAlias: string = 'default'
): Promise<CryptoKey> {
  // 查詢現有金鑰
  const { data: encryptionKey, error } = await db
    .from('encryption_keys')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('key_alias', keyAlias)
    .eq('status', 'ACTIVE')
    .order('key_version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`取得租戶金鑰失敗: ${error.message}`)
  }

  if (!encryptionKey) {
    // 建立新金鑰
    return createTenantKey(db, tenantId, keyAlias)
  }

  // 解密租戶金鑰
  const masterKey = await getMasterKey()
  const iv = hexToUint8Array(encryptionKey.iv)
  const encryptedKeyData = base64ToUint8Array(encryptionKey.encrypted_key)

  const decryptedKeyBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    masterKey,
    encryptedKeyData
  )

  // 匯入解密後的金鑰
  return crypto.subtle.importKey(
    'raw',
    decryptedKeyBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 建立租戶專屬金鑰
 */
async function createTenantKey(
  db: SupabaseClient,
  tenantId: string,
  keyAlias: string
): Promise<CryptoKey> {
  // 產生新的資料金鑰
  const dataKey = randomBytes(32)

  // 使用主金鑰加密資料金鑰
  const masterKey = await getMasterKey()
  const iv = randomBytes(IV_LENGTH)

  const encryptedKeyBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    masterKey,
    dataKey
  )

  // 儲存加密後的金鑰
  const { error } = await db.from('encryption_keys').insert({
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    key_alias: keyAlias,
    key_type: 'AES_256_GCM',
    key_version: 1,
    encrypted_key: uint8ArrayToBase64(new Uint8Array(encryptedKeyBuffer)),
    iv: uint8ArrayToHex(iv),
    status: 'ACTIVE',
  })

  if (error) {
    throw new Error(`建立租戶金鑰失敗: ${error.message}`)
  }

  // 匯入並回傳金鑰
  return crypto.subtle.importKey(
    'raw',
    dataKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 加密租戶資料
 */
export async function encryptTenantData(
  db: SupabaseClient,
  tenantId: string,
  plaintext: string
): Promise<string> {
  const key = await getTenantKey(db, tenantId)
  const iv = randomBytes(IV_LENGTH)
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  const cipherBuffer = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, data)

  const ciphertext = new Uint8Array(cipherBuffer)
  const combined = new Uint8Array(iv.length + ciphertext.length)
  combined.set(iv, 0)
  combined.set(ciphertext, iv.length)

  return uint8ArrayToBase64(combined)
}

/**
 * 解密租戶資料
 */
export async function decryptTenantData(
  db: SupabaseClient,
  tenantId: string,
  ciphertext: string
): Promise<string> {
  const key = await getTenantKey(db, tenantId)
  const combined = base64ToUint8Array(ciphertext)

  const iv = combined.slice(0, IV_LENGTH)
  const encrypted = combined.slice(IV_LENGTH)

  const decryptedBuffer = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, encrypted)

  const decoder = new TextDecoder()
  return decoder.decode(decryptedBuffer)
}

/**
 * 輪替租戶金鑰
 */
export async function rotateTenantKey(db: SupabaseClient, tenantId: string): Promise<void> {
  // 取得當前金鑰
  const { data: currentKey, error: fetchError } = await db
    .from('encryption_keys')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('key_alias', 'default')
    .eq('status', 'ACTIVE')
    .order('key_version', { ascending: false })
    .limit(1)
    .single()

  if (fetchError || !currentKey) {
    throw new Error('找不到租戶的有效金鑰')
  }

  // 標記為輪替中
  await db
    .from('encryption_keys')
    .update({ status: 'ROTATING' })
    .eq('id', currentKey.id)

  // 產生新金鑰
  const newDataKey = randomBytes(32)
  const masterKey = await getMasterKey()
  const iv = randomBytes(IV_LENGTH)

  const encryptedKeyBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    masterKey,
    newDataKey
  )

  // 建立新金鑰記錄
  const { error: createError } = await db.from('encryption_keys').insert({
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    key_alias: 'default',
    key_type: 'AES_256_GCM',
    key_version: currentKey.key_version + 1,
    encrypted_key: uint8ArrayToBase64(new Uint8Array(encryptedKeyBuffer)),
    iv: uint8ArrayToHex(iv),
    status: 'ACTIVE',
    rotated_at: new Date().toISOString(),
  })

  if (createError) {
    // 回滾
    await db
      .from('encryption_keys')
      .update({ status: 'ACTIVE' })
      .eq('id', currentKey.id)
    throw new Error(`建立新金鑰失敗: ${createError.message}`)
  }

  // 標記舊金鑰為已退役
  await db.from('encryption_keys').update({ status: 'RETIRED' }).eq('id', currentKey.id)
}

// ============================================
// 資料遮罩函數
// ============================================

/**
 * 遮罩電話號碼
 * 例：0912345678 → 091****678
 */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return '***'
  return phone.slice(0, 3) + '****' + phone.slice(-3)
}

/**
 * 遮罩電子郵件
 * 例：john.doe@example.com → j******e@example.com
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  if (!domain) return '***'
  const maskedLocal =
    localPart.length <= 2
      ? '*'.repeat(localPart.length)
      : localPart[0] + '*'.repeat(localPart.length - 2) + localPart.slice(-1)
  return `${maskedLocal}@${domain}`
}

/**
 * 遮罩身分證號碼
 * 例：A123456789 → A1*****89
 */
export function maskIdNumber(idNumber: string): string {
  if (idNumber.length < 4) return '***'
  return idNumber.slice(0, 2) + '*'.repeat(idNumber.length - 4) + idNumber.slice(-2)
}

/**
 * 遮罩銀行帳號
 * 例：12345678901234 → **********1234
 */
export function maskBankAccount(account: string): string {
  if (account.length < 8) return '***'
  return '*'.repeat(account.length - 4) + account.slice(-4)
}

/**
 * 遮罩姓名
 * 例：王小明 → 王*明
 */
export function maskName(name: string): string {
  if (name.length === 1) return '*'
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name.slice(-1)
}

/**
 * 遮罩統一編號
 * 例：12345678 → 1234****
 */
export function maskTaxId(taxId: string): string {
  if (taxId.length < 4) return '***'
  return taxId.slice(0, 4) + '*'.repeat(taxId.length - 4)
}

export interface SensitiveData {
  phone?: string
  email?: string
  idNumber?: string
  bankAccount?: string
  name?: string
  taxId?: string
}

export interface MaskOptions {
  showFull?: boolean
}

/**
 * 批量遮罩敏感資料
 */
export function maskSensitiveData(data: SensitiveData, options: MaskOptions = {}): SensitiveData {
  if (options.showFull) return data

  return {
    phone: data.phone ? maskPhone(data.phone) : undefined,
    email: data.email ? maskEmail(data.email) : undefined,
    idNumber: data.idNumber ? maskIdNumber(data.idNumber) : undefined,
    bankAccount: data.bankAccount ? maskBankAccount(data.bankAccount) : undefined,
    name: data.name ? maskName(data.name) : undefined,
    taxId: data.taxId ? maskTaxId(data.taxId) : undefined,
  }
}

// ============================================
// 相容性函數（支援舊格式解密）
// ============================================

/**
 * 解密舊格式資料（Node.js crypto 產生）
 * 舊格式：base64(iv[16] + authTag[16] + ciphertext)
 * 新格式：base64(iv[12] + ciphertext + authTag[16])
 *
 * 注意：WebCrypto AES-GCM 的 authTag 附加在 ciphertext 後面
 */
export async function decryptLegacyField(ciphertext: string): Promise<string> {
  const masterKey = await getMasterKey()
  const combined = base64ToUint8Array(ciphertext)

  // 舊格式：iv(16) + authTag(16) + encrypted
  const legacyIvLength = 16
  const authTagLength = 16

  const iv = combined.slice(0, legacyIvLength)
  const authTag = combined.slice(legacyIvLength, legacyIvLength + authTagLength)
  const encrypted = combined.slice(legacyIvLength + authTagLength)

  // WebCrypto 期望格式：ciphertext + authTag
  const dataWithTag = new Uint8Array(encrypted.length + authTag.length)
  dataWithTag.set(encrypted, 0)
  dataWithTag.set(authTag, encrypted.length)

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      masterKey,
      dataWithTag
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch {
    // 如果舊格式解密失敗，嘗試新格式
    return decryptField(ciphertext)
  }
}
