'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { isValidReferralCode, setReferralCodeCookie } from '@/lib/services/affiliate-tracking'

/**
 * 推薦追蹤元件
 *
 * 讀取 URL 參數 ?ref=XXX，驗證後存入 cookie。
 * 放在定價頁面（或 layout）中即可自動追蹤。
 */
export function ReferralTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref') || searchParams.get('referral')
    if (ref && isValidReferralCode(ref)) {
      setReferralCodeCookie(ref.toUpperCase(), { days: 30 })
    }
  }, [searchParams])

  return null
}
