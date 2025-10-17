import { redirect } from 'next/navigation'

export default function LoginPage() {
  // 重定向到中文登入頁面
  redirect('/zh/login')
}
