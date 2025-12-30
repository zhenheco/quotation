'use client'

import { useTranslations } from 'next-intl'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import InvoiceForm from '../InvoiceForm'
import InvoiceUpload from '../InvoiceUpload'
import InvoiceScan from './InvoiceScan'

interface InvoiceFormTabsProps {
  locale: string
}

/**
 * 發票輸入方式 Tab 介面
 * 整合手動輸入、Excel 上傳、AI 掃描三種方式
 */
export default function InvoiceFormTabs({ locale }: InvoiceFormTabsProps) {
  const t = useTranslations()

  return (
    <Tabs defaultValue="manual" className="w-full">
      <TabsList className="w-full grid grid-cols-3 mb-6 bg-slate-100 p-1 rounded-xl">
        <TabsTrigger
          value="manual"
          className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          {t('accounting.tabs.manual')}
        </TabsTrigger>

        <TabsTrigger
          value="excel"
          className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {t('accounting.tabs.excel')}
        </TabsTrigger>

        <TabsTrigger
          value="scan"
          className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {t('accounting.tabs.scan')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="manual" className="focus:outline-none">
        <InvoiceForm locale={locale} />
      </TabsContent>

      <TabsContent value="excel" className="focus:outline-none">
        <InvoiceUpload />
      </TabsContent>

      <TabsContent value="scan" className="focus:outline-none">
        <InvoiceScan locale={locale} />
      </TabsContent>
    </Tabs>
  )
}
