/**
 * 應用程式 Providers
 *
 * 包裝所有全域 providers，包含：
 * - React Query Provider
 * - React Query Devtools（開發環境）
 */

'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getQueryClient } from '@/lib/api/queryClient'
import { useState } from 'react'

interface ProvidersProps {
  children: React.ReactNode
}

/**
 * 應用程式 Providers
 */
export function Providers({ children }: ProvidersProps) {
  // 使用 useState 確保在客戶端只建立一次 QueryClient
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  )
}
