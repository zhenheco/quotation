import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetPassword(email: string, newPassword: string) {
  try {
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    const user = users.users.find(u => u.email === email)
    if (!user) {
      console.error(`❌ 找不到用戶：${email}`)
      process.exit(1)
    }

    console.log(`📧 找到用戶：${user.email}`)
    console.log(`🆔 用戶 ID：${user.id}`)

    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) throw updateError

    console.log(`✅ 密碼已重設成功`)
    console.log(`   Email: ${email}`)
    console.log(`   新密碼: ${newPassword}`)
  } catch (error) {
    console.error('❌ 重設密碼失敗:', error)
    process.exit(1)
  }
}

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('用法: npx tsx scripts/reset-password.ts <email> <password>')
  process.exit(1)
}

resetPassword(email, password)
