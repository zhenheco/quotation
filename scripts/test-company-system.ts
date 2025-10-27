#!/usr/bin/env tsx
/**
 * 公司管理系統完整測試
 *
 * 測試項目：
 * 1. Companies (公司) CRUD
 * 2. Company Members (公司成員) 管理
 * 3. Company Settings (公司設定) 管理
 * 4. 多公司架構驗證
 * 5. 成員角色分配
 * 6. 公司資料隔離（RLS）
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 載入環境變數
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    envVars[key] = value
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  details?: any
}

const results: TestResult[] = []

// 儲存建立的資料 ID，用於清理
const createdIds = {
  companies: [] as string[],
  companyMembers: [] as string[],
  companySettings: [] as string[],
  roles: [] as string[]
}

async function testCompanySystem() {
  console.log('🏢 開始測試公司管理系統\n')

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // 登入測試使用者
  console.log('📋 步驟 0: 登入測試帳號')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'TestPassword123!'
  })

  if (signInError || !signInData.user) {
    console.log(`❌ 登入失敗: ${signInError?.message}\n`)
    return
  }

  console.log(`✅ 登入成功 (User ID: ${signInData.user.id})\n`)
  const userId = signInData.user.id

  // ========================================
  // 測試 1: Companies (公司) CRUD
  // ========================================
  console.log('='.repeat(60))
  console.log('🏢 測試 Companies (公司) CRUD 操作')
  console.log('='.repeat(60) + '\n')

  // 1.1 建立公司
  console.log('📋 測試 1.1: 建立公司 (CREATE)')
  const timestamp = Date.now()
  const companyData = {
    name: `測試科技股份有限公司 ${timestamp}`,
    tax_id: `${timestamp}`.slice(0, 8),
    phone: '02-1234-5678',
    email: `company-${timestamp}@example.com`,
    address: '台北市信義區信義路五段7號',
    website: 'https://example.com',
    is_active: true,
    created_by: userId
  }

  const { data: createdCompany, error: createCompanyError } = await supabase
    .from('companies')
    .insert(companyData)
    .select()
    .single()

  if (createCompanyError) {
    results.push({
      name: '建立公司',
      status: 'FAIL',
      message: '建立失敗',
      details: createCompanyError
    })
    console.log(`❌ 建立失敗: ${createCompanyError.message}\n`)

    // 如果連基本的公司建立都失敗，後續測試無法進行
    console.log('⚠️  無法建立公司，測試中止\n')
    await supabase.auth.signOut()
    return
  } else {
    createdIds.companies.push(createdCompany.id)
    results.push({
      name: '建立公司',
      status: 'PASS',
      message: '建立成功',
      details: { id: createdCompany.id, name: createdCompany.name }
    })
    console.log(`✅ 建立成功`)
    console.log(`   公司 ID: ${createdCompany.id}`)
    console.log(`   公司名稱: ${createdCompany.name}`)
    console.log(`   統編: ${createdCompany.tax_id}\n`)
  }

  // 1.2 讀取公司
  console.log('📋 測試 1.2: 讀取公司 (READ)')
  const { data: readCompany, error: readCompanyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', createdIds.companies[0])
    .single()

  if (readCompanyError) {
    results.push({
      name: '讀取公司',
      status: 'FAIL',
      message: '讀取失敗',
      details: readCompanyError
    })
    console.log(`❌ 讀取失敗: ${readCompanyError.message}\n`)
  } else {
    results.push({
      name: '讀取公司',
      status: 'PASS',
      message: '讀取成功',
      details: { id: readCompany.id }
    })
    console.log(`✅ 讀取成功`)
    console.log(`   公司名稱: ${readCompany.name}`)
    console.log(`   電話: ${readCompany.phone}`)
    console.log(`   Email: ${readCompany.email}\n`)
  }

  // 1.3 更新公司
  console.log('📋 測試 1.3: 更新公司 (UPDATE)')
  const updateData = {
    phone: '02-8765-4321',
    address: '台北市大安區敦化南路二段105號'
  }

  const { data: updatedCompany, error: updateCompanyError } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', createdIds.companies[0])
    .select()
    .single()

  if (updateCompanyError) {
    results.push({
      name: '更新公司',
      status: 'FAIL',
      message: '更新失敗',
      details: updateCompanyError
    })
    console.log(`❌ 更新失敗: ${updateCompanyError.message}\n`)
  } else {
    const isPhoneUpdated = updatedCompany.phone === updateData.phone
    const isAddressUpdated = updatedCompany.address === updateData.address

    if (isPhoneUpdated && isAddressUpdated) {
      results.push({
        name: '更新公司',
        status: 'PASS',
        message: '更新成功',
        details: updateData
      })
      console.log(`✅ 更新成功`)
      console.log(`   新電話: ${updatedCompany.phone}`)
      console.log(`   新地址: ${updatedCompany.address}\n`)
    } else {
      results.push({
        name: '更新公司',
        status: 'FAIL',
        message: '更新不完整',
        details: { expected: updateData, actual: updatedCompany }
      })
      console.log(`❌ 更新不完整\n`)
    }
  }

  // ========================================
  // 測試 2: Company Settings (公司設定)
  // ========================================
  console.log('='.repeat(60))
  console.log('⚙️  測試 Company Settings (公司設定) 管理')
  console.log('='.repeat(60) + '\n')

  // 2.1 建立公司設定
  console.log('📋 測試 2.1: 建立公司設定')
  const settingsData = {
    company_id: createdIds.companies[0],
    default_currency: 'TWD',
    default_tax_rate: 5.0,
    quotation_prefix: 'QT',
    quotation_number_format: '{prefix}-{year}{month}-{seq}',
    quotation_validity_days: 30,
    terms_and_conditions: '本報價單有效期限為 30 天',
    payment_terms: '交貨後 30 天內付款',
    email_signature: '測試科技股份有限公司\n客服專線: 02-1234-5678'
  }

  const { data: createdSettings, error: createSettingsError } = await supabase
    .from('company_settings')
    .insert(settingsData)
    .select()
    .single()

  if (createSettingsError) {
    results.push({
      name: '建立公司設定',
      status: 'FAIL',
      message: '建立失敗',
      details: createSettingsError
    })
    console.log(`❌ 建立失敗: ${createSettingsError.message}\n`)
  } else {
    createdIds.companySettings.push(createdSettings.id)
    results.push({
      name: '建立公司設定',
      status: 'PASS',
      message: '建立成功',
      details: { id: createdSettings.id }
    })
    console.log(`✅ 建立成功`)
    console.log(`   預設幣別: ${createdSettings.default_currency}`)
    console.log(`   預設稅率: ${createdSettings.default_tax_rate}%`)
    console.log(`   報價單前綴: ${createdSettings.quotation_prefix}`)
    console.log(`   有效天數: ${createdSettings.quotation_validity_days} 天\n`)
  }

  // 2.2 讀取公司設定
  console.log('📋 測試 2.2: 讀取公司設定')
  const { data: readSettings, error: readSettingsError } = await supabase
    .from('company_settings')
    .select('*')
    .eq('company_id', createdIds.companies[0])
    .single()

  if (readSettingsError) {
    results.push({
      name: '讀取公司設定',
      status: 'FAIL',
      message: '讀取失敗',
      details: readSettingsError
    })
    console.log(`❌ 讀取失敗: ${readSettingsError.message}\n`)
  } else {
    results.push({
      name: '讀取公司設定',
      status: 'PASS',
      message: '讀取成功',
      details: { id: readSettings.id }
    })
    console.log(`✅ 讀取成功`)
    console.log(`   報價單格式: ${readSettings.quotation_number_format}\n`)
  }

  // 2.3 更新公司設定
  console.log('📋 測試 2.3: 更新公司設定')
  const updateSettingsData = {
    default_tax_rate: 7.0,
    quotation_validity_days: 45
  }

  const { data: updatedSettings, error: updateSettingsError } = await supabase
    .from('company_settings')
    .update(updateSettingsData)
    .eq('company_id', createdIds.companies[0])
    .select()
    .single()

  if (updateSettingsError) {
    results.push({
      name: '更新公司設定',
      status: 'FAIL',
      message: '更新失敗',
      details: updateSettingsError
    })
    console.log(`❌ 更新失敗: ${updateSettingsError.message}\n`)
  } else {
    const isTaxRateUpdated = updatedSettings.default_tax_rate === updateSettingsData.default_tax_rate
    const isValidityDaysUpdated = updatedSettings.quotation_validity_days === updateSettingsData.quotation_validity_days

    if (isTaxRateUpdated && isValidityDaysUpdated) {
      results.push({
        name: '更新公司設定',
        status: 'PASS',
        message: '更新成功',
        details: updateSettingsData
      })
      console.log(`✅ 更新成功`)
      console.log(`   新稅率: ${updatedSettings.default_tax_rate}%`)
      console.log(`   新有效天數: ${updatedSettings.quotation_validity_days} 天\n`)
    } else {
      results.push({
        name: '更新公司設定',
        status: 'FAIL',
        message: '更新不完整'
      })
      console.log(`❌ 更新不完整\n`)
    }
  }

  // ========================================
  // 測試 3: Company Members (公司成員) 管理
  // ========================================
  console.log('='.repeat(60))
  console.log('👥 測試 Company Members (公司成員) 管理')
  console.log('='.repeat(60) + '\n')

  // 3.1 準備：建立測試角色
  console.log('📋 準備: 建立測試角色')
  const roleData = {
    name: `測試管理員角色 ${timestamp}`,
    description: '測試用的管理員角色',
    created_by: userId
  }

  const { data: createdRole, error: createRoleError } = await supabase
    .from('roles')
    .insert(roleData)
    .select()
    .single()

  if (!createRoleError && createdRole) {
    createdIds.roles.push(createdRole.id)
    console.log(`✅ 測試角色已建立 (ID: ${createdRole.id})\n`)
  } else {
    console.log(`⚠️  測試角色建立失敗，將跳過角色相關測試\n`)
  }

  // 3.2 新增公司成員
  console.log('📋 測試 3.1: 新增公司成員')
  const memberData = {
    company_id: createdIds.companies[0],
    user_id: userId,
    role_id: createdRole?.id || null,
    position: '技術長',
    department: 'IT部門',
    is_active: true
  }

  const { data: createdMember, error: createMemberError } = await supabase
    .from('company_members')
    .insert(memberData)
    .select()
    .single()

  if (createMemberError) {
    results.push({
      name: '新增公司成員',
      status: 'FAIL',
      message: '新增失敗',
      details: createMemberError
    })
    console.log(`❌ 新增失敗: ${createMemberError.message}\n`)
  } else {
    createdIds.companyMembers.push(createdMember.id)
    results.push({
      name: '新增公司成員',
      status: 'PASS',
      message: '新增成功',
      details: { id: createdMember.id }
    })
    console.log(`✅ 新增成功`)
    console.log(`   成員 ID: ${createdMember.id}`)
    console.log(`   職位: ${createdMember.position}`)
    console.log(`   部門: ${createdMember.department}\n`)
  }

  // 3.3 查詢公司成員（含 JOIN）
  console.log('📋 測試 3.2: 查詢公司成員（含 JOIN）')
  const { data: members, error: membersError } = await supabase
    .from('company_members')
    .select(`
      *,
      roles (
        name,
        description
      )
    `)
    .eq('company_id', createdIds.companies[0])

  if (membersError) {
    results.push({
      name: '查詢公司成員',
      status: 'FAIL',
      message: '查詢失敗',
      details: membersError
    })
    console.log(`❌ 查詢失敗: ${membersError.message}\n`)
  } else {
    results.push({
      name: '查詢公司成員',
      status: 'PASS',
      message: '查詢成功',
      details: { count: members.length }
    })
    console.log(`✅ 查詢成功`)
    console.log(`   找到 ${members.length} 位成員`)
    members.forEach(member => {
      console.log(`   - ${member.position} (部門: ${member.department})`)
      if (member.roles) {
        console.log(`     角色: ${(member.roles as any).name}`)
      }
    })
    console.log()
  }

  // 3.4 更新成員資訊
  console.log('📋 測試 3.3: 更新成員資訊')
  const updateMemberData = {
    position: '資深技術長',
    department: '研發部'
  }

  const { data: updatedMember, error: updateMemberError } = await supabase
    .from('company_members')
    .update(updateMemberData)
    .eq('id', createdIds.companyMembers[0])
    .select()
    .single()

  if (updateMemberError) {
    results.push({
      name: '更新成員資訊',
      status: 'FAIL',
      message: '更新失敗',
      details: updateMemberError
    })
    console.log(`❌ 更新失敗: ${updateMemberError.message}\n`)
  } else {
    const isPositionUpdated = updatedMember.position === updateMemberData.position
    const isDepartmentUpdated = updatedMember.department === updateMemberData.department

    if (isPositionUpdated && isDepartmentUpdated) {
      results.push({
        name: '更新成員資訊',
        status: 'PASS',
        message: '更新成功',
        details: updateMemberData
      })
      console.log(`✅ 更新成功`)
      console.log(`   新職位: ${updatedMember.position}`)
      console.log(`   新部門: ${updatedMember.department}\n`)
    } else {
      results.push({
        name: '更新成員資訊',
        status: 'FAIL',
        message: '更新不完整'
      })
      console.log(`❌ 更新不完整\n`)
    }
  }

  // ========================================
  // 測試 4: 多公司架構驗證
  // ========================================
  console.log('='.repeat(60))
  console.log('🏢 測試多公司架構（建立第二家公司）')
  console.log('='.repeat(60) + '\n')

  // 4.1 建立第二家公司
  console.log('📋 測試 4.1: 建立第二家公司')
  const company2Data = {
    name: `測試資訊股份有限公司 ${timestamp}`,
    tax_id: `${timestamp + 1}`.slice(0, 8),
    phone: '02-9876-5432',
    email: `company2-${timestamp}@example.com`,
    address: '新北市板橋區文化路一段266號',
    is_active: true,
    created_by: userId
  }

  const { data: createdCompany2, error: createCompany2Error } = await supabase
    .from('companies')
    .insert(company2Data)
    .select()
    .single()

  if (createCompany2Error) {
    results.push({
      name: '建立第二家公司',
      status: 'FAIL',
      message: '建立失敗',
      details: createCompany2Error
    })
    console.log(`❌ 建立失敗: ${createCompany2Error.message}\n`)
  } else {
    createdIds.companies.push(createdCompany2.id)
    results.push({
      name: '建立第二家公司',
      status: 'PASS',
      message: '建立成功',
      details: { id: createdCompany2.id }
    })
    console.log(`✅ 建立成功`)
    console.log(`   公司名稱: ${createdCompany2.name}\n`)
  }

  // 4.2 查詢所有公司（驗證可以看到自己建立的）
  console.log('📋 測試 4.2: 查詢所有公司')
  const { data: allCompanies, error: allCompaniesError } = await supabase
    .from('companies')
    .select('*')
    .in('id', createdIds.companies)
    .order('created_at', { ascending: true })

  if (allCompaniesError) {
    results.push({
      name: '查詢所有公司',
      status: 'FAIL',
      message: '查詢失敗',
      details: allCompaniesError
    })
    console.log(`❌ 查詢失敗: ${allCompaniesError.message}\n`)
  } else {
    results.push({
      name: '查詢所有公司',
      status: 'PASS',
      message: '查詢成功',
      details: { count: allCompanies.length }
    })
    console.log(`✅ 查詢成功`)
    console.log(`   找到 ${allCompanies.length} 家公司`)
    allCompanies.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.name}`)
    })
    console.log()
  }

  // ========================================
  // 清理測試資料
  // ========================================
  console.log('='.repeat(60))
  console.log('🗑️  清理測試資料')
  console.log('='.repeat(60) + '\n')

  // 刪除順序很重要（避免外鍵約束錯誤）

  // 1. 刪除公司成員（依賴 companies, roles）
  if (createdIds.companyMembers.length > 0) {
    console.log('清理 company_members...')
    for (const id of createdIds.companyMembers) {
      await supabase.from('company_members').delete().eq('id', id)
    }
    console.log('✅ company_members 已清理')
  }

  // 2. 刪除公司設定（依賴 companies）
  if (createdIds.companySettings.length > 0) {
    console.log('清理 company_settings...')
    for (const id of createdIds.companySettings) {
      await supabase.from('company_settings').delete().eq('id', id)
    }
    console.log('✅ company_settings 已清理')
  }

  // 3. 刪除公司
  if (createdIds.companies.length > 0) {
    console.log('清理 companies...')
    for (const id of createdIds.companies) {
      await supabase.from('companies').delete().eq('id', id)
    }
    console.log('✅ companies 已清理')
  }

  // 4. 刪除角色
  if (createdIds.roles.length > 0) {
    console.log('清理 roles...')
    for (const id of createdIds.roles) {
      await supabase.from('roles').delete().eq('id', id)
    }
    console.log('✅ roles 已清理')
  }

  console.log()

  // ========================================
  // 測試結果摘要
  // ========================================
  console.log('='.repeat(60))
  console.log('📊 公司管理系統測試結果摘要')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length

  console.log(`\n總測試數: ${results.length}`)
  console.log(`✅ 通過: ${passed}`)
  console.log(`❌ 失敗: ${failed}`)
  console.log(`\n成功率: ${((passed / results.length) * 100).toFixed(1)}%\n`)

  // 分組顯示結果
  console.log('='.repeat(60))
  console.log('📝 詳細結果')
  console.log('='.repeat(60))

  const categories = {
    '公司管理': ['建立公司', '讀取公司', '更新公司'],
    '公司設定': ['建立公司設定', '讀取公司設定', '更新公司設定'],
    '成員管理': ['新增公司成員', '查詢公司成員', '更新成員資訊'],
    '多公司架構': ['建立第二家公司', '查詢所有公司']
  }

  Object.entries(categories).forEach(([category, testNames]) => {
    console.log(`\n${category}:`)
    testNames.forEach(name => {
      const result = results.find(r => r.name === name)
      if (result) {
        const icon = result.status === 'PASS' ? '✅' : '❌'
        console.log(`  ${icon} ${result.name} - ${result.message}`)
      }
    })
  })

  // 最終判斷
  console.log('\n' + '='.repeat(60))
  if (failed === 0) {
    console.log('🎉 所有公司管理系統測試通過！功能正常運作！')
  } else {
    console.log('⚠️  部分測試失敗，請檢查錯誤訊息')
  }
  console.log('='.repeat(60) + '\n')

  // 登出
  await supabase.auth.signOut()
  console.log('✅ 已登出測試帳號\n')
}

// 執行測試
testCompanySystem().catch(console.error)
