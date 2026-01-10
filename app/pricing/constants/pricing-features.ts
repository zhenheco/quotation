/**
 * 訂閱方案功能定義常數
 */

import type { SubscriptionTier } from '@/hooks/use-subscription'

// 功能分組定義
export interface FeatureGroup {
  id: string
  name: string
  features: FeatureDefinition[]
}

export interface FeatureDefinition {
  key: string
  label: string
  description?: string
  availability: Record<SubscriptionTier, string | boolean>
}

// 功能列表（按方案顯示）
export const PLAN_FEATURES: Record<SubscriptionTier, string[]> = {
  FREE: [
    '產品上限 50 個',
    '客戶上限 20 個',
    '每月報價單 10 份',
    '基本報表功能',
    'Email 通知',
  ],
  STARTER: [
    '產品上限 200 個',
    '客戶上限 100 個',
    '每月報價單 50 份',
    '營業稅計算',
    '進階報表功能',
    'Email 優先支援',
  ],
  STANDARD: [
    '產品數量無限制',
    '客戶數量無限制',
    '報價單無限制',
    '401 媒體檔匯出',
    '營所稅申報功能',
    '最多 3 間公司',
    '優先客服支援',
  ],
  PROFESSIONAL: [
    '包含所有標準版功能',
    'AI 現金流分析',
    'AI 應收風險分析',
    'AI 稅務優化建議',
    'API 完整存取',
    '最多 10 間公司',
    '專屬客服經理',
    '客製化報表',
  ],
}

// 功能比較表分組
export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: 'basic',
    name: '基本功能',
    features: [
      {
        key: 'max_products',
        label: '產品數量上限',
        availability: {
          FREE: '50',
          STARTER: '200',
          STANDARD: '無限制',
          PROFESSIONAL: '無限制',
        },
      },
      {
        key: 'max_customers',
        label: '客戶數量上限',
        availability: {
          FREE: '20',
          STARTER: '100',
          STANDARD: '無限制',
          PROFESSIONAL: '無限制',
        },
      },
      {
        key: 'max_quotations',
        label: '每月報價單上限',
        availability: {
          FREE: '10',
          STARTER: '50',
          STANDARD: '無限制',
          PROFESSIONAL: '無限制',
        },
      },
      {
        key: 'max_companies',
        label: '公司數量上限',
        availability: {
          FREE: '1',
          STARTER: '1',
          STANDARD: '3',
          PROFESSIONAL: '10',
        },
      },
    ],
  },
  {
    id: 'tax',
    name: '稅務功能',
    features: [
      {
        key: 'vat_filing',
        label: '營業稅計算',
        description: '自動計算銷項稅額與進項稅額',
        availability: {
          FREE: false,
          STARTER: true,
          STANDARD: true,
          PROFESSIONAL: true,
        },
      },
      {
        key: 'media_401',
        label: '401 媒體檔匯出',
        description: '產生營業稅申報媒體檔',
        availability: {
          FREE: false,
          STARTER: false,
          STANDARD: true,
          PROFESSIONAL: true,
        },
      },
      {
        key: 'income_tax',
        label: '營所稅申報',
        description: '擴大書審稅額計算',
        availability: {
          FREE: false,
          STARTER: false,
          STANDARD: true,
          PROFESSIONAL: true,
        },
      },
    ],
  },
  {
    id: 'ai',
    name: 'AI 智慧分析',
    features: [
      {
        key: 'ai_cash_flow',
        label: 'AI 現金流分析',
        description: '智慧預測未來現金流狀況',
        availability: {
          FREE: false,
          STARTER: false,
          STANDARD: false,
          PROFESSIONAL: true,
        },
      },
      {
        key: 'ai_receivable_risk',
        label: 'AI 應收風險分析',
        description: '評估客戶付款風險',
        availability: {
          FREE: false,
          STARTER: false,
          STANDARD: false,
          PROFESSIONAL: true,
        },
      },
      {
        key: 'ai_tax_optimization',
        label: 'AI 稅務優化建議',
        description: '智慧稅務規劃建議',
        availability: {
          FREE: false,
          STARTER: false,
          STANDARD: false,
          PROFESSIONAL: true,
        },
      },
    ],
  },
  {
    id: 'integration',
    name: '整合功能',
    features: [
      {
        key: 'api_access',
        label: 'API 存取',
        description: '透過 API 整合其他系統',
        availability: {
          FREE: false,
          STARTER: false,
          STANDARD: false,
          PROFESSIONAL: true,
        },
      },
      {
        key: 'custom_reports',
        label: '客製化報表',
        description: '依需求產生專屬報表',
        availability: {
          FREE: false,
          STARTER: false,
          STANDARD: false,
          PROFESSIONAL: true,
        },
      },
    ],
  },
  {
    id: 'support',
    name: '客戶支援',
    features: [
      {
        key: 'email_support',
        label: 'Email 支援',
        availability: {
          FREE: true,
          STARTER: true,
          STANDARD: true,
          PROFESSIONAL: true,
        },
      },
      {
        key: 'priority_support',
        label: '優先客服支援',
        description: '24 小時內回覆',
        availability: {
          FREE: false,
          STARTER: false,
          STANDARD: true,
          PROFESSIONAL: true,
        },
      },
      {
        key: 'dedicated_manager',
        label: '專屬客服經理',
        description: '一對一專屬服務',
        availability: {
          FREE: false,
          STARTER: false,
          STANDARD: false,
          PROFESSIONAL: true,
        },
      },
    ],
  },
]

// 方案描述
export const PLAN_DESCRIPTIONS: Record<SubscriptionTier, { title: string; subtitle: string }> = {
  FREE: {
    title: '免費版',
    subtitle: '適合個人或小型試用',
  },
  STARTER: {
    title: '入門版',
    subtitle: '適合成長中的小型企業',
  },
  STANDARD: {
    title: '標準版',
    subtitle: '適合中小型企業',
  },
  PROFESSIONAL: {
    title: '專業版',
    subtitle: '適合需要進階功能的企業',
  },
}

// Affiliate 佣金設定
export const AFFILIATE_CONFIG = {
  commissionRate: 0.1, // 10% 佣金
  referralDiscount: 0.5, // 被推薦者首月 50% 折扣
  minPayoutAmount: 500, // 最低提領金額 NT$500
  payoutCycle: 'monthly', // 每月結算
}
