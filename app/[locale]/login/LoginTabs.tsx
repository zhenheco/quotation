'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface LoginTabsProps {
  googleTab: React.ReactNode
  emailTab: React.ReactNode
}

export default function LoginTabs({
  googleTab,
  emailTab,
}: LoginTabsProps) {
  const t = useTranslations('login')
  const [activeTab, setActiveTab] = useState<'google' | 'email'>('email')

  return (
    <div>
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('email')}
          className={`flex-1 pb-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'email'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('emailTab')}
        </button>
        <button
          onClick={() => setActiveTab('google')}
          className={`flex-1 pb-3 px-4 text-center font-medium transition-colors ${
            activeTab === 'google'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('googleTab')}
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'email' && <div>{emailTab}</div>}
        {activeTab === 'google' && (
          <div className="flex flex-col items-center justify-center py-12">
            {googleTab}
            <p className="mt-6 text-sm text-gray-500 text-center max-w-sm">
              {t('googleLoginDescription')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
