'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { LogOut, Settings, UserCircle, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-foreground">
          {locale === 'zh' ? '報價管理系統' : 'Quotation System'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Company Selector */}
        <CompanySelector locale={locale} />

        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLocale}
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{locale === 'en' ? '中文' : 'English'}</span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="cursor-pointer">
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
                <UserCircle className="h-6 w-6" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userEmail || (locale === 'zh' ? '未登錄' : 'Not logged in')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push(`/${locale}/settings`)}
            >
              <UserCircle className="mr-2 h-4 w-4" />
              <span>{locale === 'zh' ? '個人資料' : 'Profile'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push(`/${locale}/settings`)}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>{locale === 'zh' ? '設定' : 'Settings'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{locale === 'zh' ? '登出' : 'Sign Out'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
