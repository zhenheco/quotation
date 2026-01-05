import { redirect } from 'next/navigation'

export default function RootPage() {
  // 重定向到登入頁面
  redirect('/login')
}
