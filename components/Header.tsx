'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { LogOut, Settings, UserCircle, Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { apiGet, apiPost } from '@/lib/api-client'
import CompanySelector from './CompanySelector'

interface UserProfile {
  full_name?: string
  display_name?: string
  avatar_url?: string
}

function getImageUrl(url: string | undefined): string | null {
  if (!url) return null
  if (url.startsWith('/api/')) return url
  if (url.includes('supabase.co/storage')) {
    const match = url.match(/company-files\/(.+)$/)
    if (match) {
      return `/api/storage/company-files?path=${encodeURIComponent(match[1])}`
    }
  }
  return url
}

interface HeaderProps {
  locale: string
}

export default function Header({ locale }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')

  const loadUserProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setUserEmail(user.email || '')

        try {
          const profile = await apiGet<UserProfile>('/api/rbac/user-profile')
          setUserProfile(profile)
        } catch {
          // Profile fetch failed
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }, [supabase])

  useEffect(() => {
    loadUserProfile()
  }, [loadUserProfile])

  const handleSignOut = async () => {
    try {
      localStorage.clear()
      await apiPost('/api/auth/logout')
      window.location.href = `/${locale}/login`
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = `/${locale}/login`
    }
  }

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'zh' : 'en'
    const currentPath = window.location.pathname
    const newPath = currentPath.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
  }

  const displayName = userProfile?.display_name || userProfile?.full_name || userEmail.split('@')[0] || (locale === 'zh' ? '使用者' : 'User')
  const avatarUrl = getImageUrl(userProfile?.avatar_url)

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-3 border-b border-slate-100 bg-white/80 backdrop-blur-xl px-6">
      {/* 右側工具列 */}
      <div className="flex items-center gap-3">
        {/* Company Selector */}
        <CompanySelector locale={locale} />

        {/* Language Toggle - 藥丸樣式 */}
        <button
          onClick={toggleLocale}
          className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-200 hover:text-slate-800"
        >
          <Globe className="h-4 w-4" />
          <span>{locale === 'en' ? '中文' : 'EN'}</span>
        </button>

        {/* User Menu - 更圓潤的樣式 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full bg-slate-100 p-1.5 pr-4 transition-all hover:bg-slate-200 cursor-pointer">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <UserCircle className="h-5 w-5 text-emerald-600" />
                </div>
              )}
              <span className="text-sm font-medium text-slate-700 hidden sm:inline">
                {displayName.length > 10 ? displayName.substring(0, 10) + '...' : displayName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
            <DropdownMenuLabel className="font-normal px-3 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-slate-800">{displayName}</p>
                <p className="text-xs leading-none text-slate-500">
                  {userEmail || (locale === 'zh' ? '未登錄' : 'Not logged in')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="cursor-pointer rounded-xl px-3 py-2.5"
              onClick={() => router.push(`/${locale}/settings`)}
            >
              <UserCircle className="mr-3 h-4 w-4 text-slate-500" />
              <span>{locale === 'zh' ? '個人資料' : 'Profile'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-xl px-3 py-2.5"
              onClick={() => router.push(`/${locale}/settings`)}
            >
              <Settings className="mr-3 h-4 w-4 text-slate-500" />
              <span>{locale === 'zh' ? '設定' : 'Settings'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="cursor-pointer rounded-xl px-3 py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span>{locale === 'zh' ? '登出' : 'Sign Out'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
