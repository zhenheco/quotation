'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { LogOut, Settings, UserCircle } from 'lucide-react'
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

export default function Header() {
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
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = '/login'
    }
  }

  const displayName = userProfile?.display_name || userProfile?.full_name || userEmail.split('@')[0] || '使用者'
  const avatarUrl = getImageUrl(userProfile?.avatar_url)

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-end gap-3 border-b border-slate-200 bg-white px-6">
      {/* 右側工具列 */}
      <div className="flex items-center gap-2">
        {/* Company Selector */}
        <CompanySelector />

        {/* User Menu - 專業簡潔樣式 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 transition-colors hover:bg-slate-50 cursor-pointer">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={28}
                  height={28}
                  className="rounded-md object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-50">
                  <UserCircle className="h-4 w-4 text-teal-700" />
                </div>
              )}
              <span className="text-[13px] font-medium text-slate-700 hidden sm:inline">
                {displayName.length > 10 ? displayName.substring(0, 10) + '...' : displayName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-lg p-1.5">
            <DropdownMenuLabel className="font-normal px-2.5 py-2">
              <div className="flex flex-col space-y-0.5">
                <p className="text-[13px] font-medium leading-none text-slate-800">{displayName}</p>
                <p className="text-xs leading-none text-slate-500">
                  {userEmail || '未登錄'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="cursor-pointer rounded-md px-2.5 py-2 text-[13px]"
              onClick={() => router.push('/settings')}
            >
              <UserCircle className="mr-2.5 h-4 w-4 text-slate-400" />
              <span>個人資料</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-md px-2.5 py-2 text-[13px]"
              onClick={() => router.push('/settings')}
            >
              <Settings className="mr-2.5 h-4 w-4 text-slate-400" />
              <span>設定</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="cursor-pointer rounded-md px-2.5 py-2 text-[13px] text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2.5 h-4 w-4" />
              <span>登出</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
