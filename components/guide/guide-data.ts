import {
  FileText,
  Calculator,
  Download,
  Upload,
  Building2,
  Users,
  Receipt,
  Landmark,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'

// 標註類型
export interface Annotation {
  type: 'arrow' | 'circle' | 'text'
  x: number // 百分比位置 (0-100)
  y: number // 百分比位置 (0-100)
  text?: string
  direction?: 'up' | 'down' | 'left' | 'right'
}

// 教學步驟
export interface GuideStep {
  title: string
  description: string
  icon: LucideIcon
  tips: string[]
  screenshot?: {
    src: string
    alt: string
    annotations: Annotation[]
  }
}

// 教學類別
export type GuideCategory = 'getting-started' | 'vat-filing' | 'income-tax'

export interface GuideCategoryInfo {
  id: GuideCategory
  title: { en: string; zh: string }
  description: { en: string; zh: string }
  icon: LucideIcon
  color: string
  steps: {
    en: GuideStep
    zh: GuideStep
  }[]
}

// 教學資料
export const guideCategories: GuideCategoryInfo[] = [
  {
    id: 'getting-started',
    title: { en: 'Getting Started', zh: '新手導覽' },
    description: {
      en: 'Learn the basics of the quotation system',
      zh: '快速了解報價系統的基本操作',
    },
    icon: Building2,
    color: 'from-blue-500 to-indigo-600',
    steps: [
      {
        en: {
          title: 'Set Up Company Information',
          description:
            'Start by entering your company details including name, tax ID, and contact information. This information will appear on all your quotations.',
          icon: Building2,
          tips: [
            'Ensure tax ID is correct for invoice generation',
            'Upload your company logo for professional quotations',
          ],
        },
        zh: {
          title: '設定公司資料',
          description:
            '首先設定您的公司基本資料，包括公司名稱、統一編號、聯絡資訊等。這些資訊會顯示在您的報價單上。',
          icon: Building2,
          tips: ['確保統一編號正確，以利後續發票開立', '上傳公司 Logo 讓報價單更專業'],
        },
      },
      {
        en: {
          title: 'Add Products & Services',
          description:
            'Create your product catalog with pricing. You can set different price tiers and manage inventory.',
          icon: FileText,
          tips: [
            'Use categories to organize products',
            'Set default tax rates for quick quotation',
          ],
        },
        zh: {
          title: '新增產品與服務',
          description:
            '建立您的產品目錄與定價。可以設定不同的價格級距，並管理庫存數量。',
          icon: FileText,
          tips: ['使用分類來整理產品項目', '設定預設稅率加速報價流程'],
        },
      },
      {
        en: {
          title: 'Manage Customers',
          description:
            'Add customer information including company details, contacts, and billing addresses.',
          icon: Users,
          tips: [
            'Import customers from Excel',
            'Set payment terms per customer',
          ],
        },
        zh: {
          title: '管理客戶資料',
          description:
            '新增客戶的公司資訊、聯絡人、帳單地址等。可以設定各客戶的付款條件。',
          icon: Users,
          tips: ['支援從 Excel 匯入客戶資料', '可為不同客戶設定專屬付款條件'],
        },
      },
      {
        en: {
          title: 'Create Your First Quotation',
          description:
            'Select a customer, add products, and generate a professional quotation in minutes.',
          icon: Receipt,
          tips: [
            'Use templates to speed up creation',
            'Preview before sending to customers',
          ],
        },
        zh: {
          title: '建立第一張報價單',
          description:
            '選擇客戶、加入產品項目，幾分鐘內即可產生專業的報價單。',
          icon: Receipt,
          tips: ['使用範本加速建立流程', '發送前可預覽報價單效果'],
        },
      },
    ],
  },
  {
    id: 'vat-filing',
    title: { en: 'VAT Filing', zh: '營業稅申報' },
    description: {
      en: 'Step-by-step guide for VAT tax filing',
      zh: '手把手教您完成營業稅申報流程',
    },
    icon: Receipt,
    color: 'from-emerald-500 to-teal-600',
    steps: [
      {
        en: {
          title: 'Access Invoice Management',
          description:
            'Go to Accounting > Invoices to view all your sales and purchase invoices for the period.',
          icon: FileText,
          tips: [
            'Filter by date range for the filing period',
            'Ensure all invoices are correctly categorized',
          ],
        },
        zh: {
          title: '進入發票管理',
          description:
            '前往「會計系統」>「發票管理」查看當期所有銷售發票與進貨發票。',
          icon: FileText,
          tips: [
            '使用日期篩選器選擇申報期間',
            '確認所有發票已正確分類',
          ],
          screenshot: {
            src: '/guide/vat-step-1.png',
            alt: '發票管理頁面',
            annotations: [
              { type: 'circle', x: 15, y: 30, text: '點擊「會計系統」' },
              { type: 'arrow', x: 25, y: 45, direction: 'right', text: '選擇「發票管理」' },
            ],
          },
        },
      },
      {
        en: {
          title: 'Generate Tax Report',
          description:
            'Click "Generate VAT Report" to create the tax filing document with calculated amounts.',
          icon: Calculator,
          tips: [
            'Review output tax (sales) and input tax (purchases)',
            'Check for any discrepancies before proceeding',
          ],
        },
        zh: {
          title: '產生稅務報表',
          description:
            '點擊「產生營業稅報表」，系統會自動計算銷項稅額與進項稅額。',
          icon: Calculator,
          tips: [
            '檢查銷項稅額（銷售）與進項稅額（進貨）是否正確',
            '確認金額無誤後再進行下一步',
          ],
          screenshot: {
            src: '/guide/vat-step-2.png',
            alt: '產生營業稅報表',
            annotations: [
              { type: 'circle', x: 80, y: 20, text: '點擊「產生報表」' },
            ],
          },
        },
      },
      {
        en: {
          title: 'Review Output & Input Tax',
          description:
            'Verify the calculated amounts match your records. Make corrections if needed.',
          icon: CheckCircle2,
          tips: [
            'Output tax = Sales × 5%',
            'Input tax = Purchases × 5%',
          ],
        },
        zh: {
          title: '檢視銷項與進項稅額',
          description:
            '核對系統計算的金額與您的紀錄是否相符，如有差異可進行調整。',
          icon: CheckCircle2,
          tips: [
            '銷項稅額 = 銷售額 × 5%',
            '進項稅額 = 進貨額 × 5%',
            '應納稅額 = 銷項稅額 - 進項稅額',
          ],
          screenshot: {
            src: '/guide/vat-step-3.png',
            alt: '銷項進項稅額明細',
            annotations: [
              { type: 'text', x: 50, y: 40, text: '銷項稅額' },
              { type: 'text', x: 50, y: 60, text: '進項稅額' },
            ],
          },
        },
      },
      {
        en: {
          title: 'Download Filing File',
          description:
            'Download the 401 or 403 filing format file for upload to the tax authority website.',
          icon: Download,
          tips: [
            '401 form: Regular businesses',
            '403 form: Special industries',
          ],
        },
        zh: {
          title: '下載申報檔案',
          description:
            '下載 401 或 403 申報格式檔案，準備上傳至財政部電子申報網站。',
          icon: Download,
          tips: [
            '401 表單：一般營業人適用',
            '403 表單：特殊行業適用',
            '檔案格式為 .txt 或 .xml',
          ],
          screenshot: {
            src: '/guide/vat-step-4.png',
            alt: '下載申報檔案',
            annotations: [
              { type: 'circle', x: 75, y: 50, text: '點擊下載' },
            ],
          },
        },
      },
      {
        en: {
          title: 'Upload to Tax Authority',
          description:
            'Visit the Ministry of Finance e-filing website and upload your filing document.',
          icon: Upload,
          tips: [
            'Use a valid digital certificate',
            'Keep confirmation receipt for your records',
          ],
        },
        zh: {
          title: '上傳至財政部網站',
          description:
            '前往財政部電子申報繳稅服務網站，上傳您的申報檔案完成申報。',
          icon: Upload,
          tips: [
            '需使用有效的工商憑證或自然人憑證',
            '申報完成後請保存回執聯',
            '申報期限：每單月 15 日前',
          ],
          screenshot: {
            src: '/guide/vat-step-5.png',
            alt: '財政部電子申報網站',
            annotations: [
              { type: 'circle', x: 30, y: 40, text: '選擇「營業稅」' },
              { type: 'arrow', x: 50, y: 60, direction: 'down', text: '上傳申報檔' },
            ],
          },
        },
      },
    ],
  },
  {
    id: 'income-tax',
    title: { en: 'Corporate Income Tax', zh: '營所稅申報' },
    description: {
      en: 'Guide for annual corporate income tax filing',
      zh: '年度營利事業所得稅擴大書審申報教學',
    },
    icon: Landmark,
    color: 'from-purple-500 to-violet-600',
    steps: [
      {
        en: {
          title: 'Verify Eligibility',
          description:
            'Check if your business qualifies for the simplified book audit method based on annual revenue.',
          icon: CheckCircle2,
          tips: [
            'Annual revenue under 30 million NTD qualifies',
            'Must maintain proper accounting records',
          ],
        },
        zh: {
          title: '確認擴大書審資格',
          description:
            '確認您的公司是否符合擴大書審申報資格，主要依年度營收判定。',
          icon: CheckCircle2,
          tips: [
            '年營業額 3,000 萬以下適用',
            '需有完整的帳簿憑證',
            '部分行業有特殊規定',
          ],
          screenshot: {
            src: '/guide/income-tax-step-1.png',
            alt: '擴大書審資格說明',
            annotations: [
              { type: 'text', x: 50, y: 30, text: '確認年營收資格' },
            ],
          },
        },
      },
      {
        en: {
          title: 'Access Income Tax Module',
          description:
            'Navigate to Accounting > Income Tax to access the corporate tax filing module.',
          icon: Landmark,
          tips: [
            'System calculates based on your financial data',
            'Review before generating the filing',
          ],
        },
        zh: {
          title: '進入營所稅申報頁面',
          description:
            '前往「會計系統」>「營所稅申報」進入年度營所稅申報模組。',
          icon: Landmark,
          tips: [
            '系統會根據您的財務資料自動計算',
            '產生申報前請先檢視各項數據',
          ],
          screenshot: {
            src: '/guide/income-tax-step-2.png',
            alt: '營所稅申報頁面',
            annotations: [
              { type: 'circle', x: 15, y: 55, text: '點擊「營所稅申報」' },
            ],
          },
        },
      },
      {
        en: {
          title: 'Select Industry Category',
          description:
            'Choose your business industry category. This determines the profit ratio for calculation.',
          icon: Building2,
          tips: [
            'Industry category affects tax rate',
            'Consult with accountant if unsure',
          ],
        },
        zh: {
          title: '選擇行業類別',
          description:
            '選擇您公司的行業類別代碼，這會影響擴大書審的純益率計算。',
          icon: Building2,
          tips: [
            '行業類別影響純益率標準',
            '不確定可諮詢會計師',
            '系統提供常見行業快速選擇',
          ],
          screenshot: {
            src: '/guide/income-tax-step-3.png',
            alt: '選擇行業類別',
            annotations: [
              { type: 'circle', x: 60, y: 45, text: '選擇行業代碼' },
            ],
          },
        },
      },
      {
        en: {
          title: 'Review Tax Calculation',
          description:
            'Review the calculated income tax amount based on revenue and profit ratio.',
          icon: Calculator,
          tips: [
            'Tax = Revenue × Profit Ratio × Tax Rate',
            'Current corporate tax rate: 20%',
          ],
        },
        zh: {
          title: '檢視稅額計算',
          description:
            '查看系統根據營收與純益率計算出的應納營所稅額。',
          icon: Calculator,
          tips: [
            '應納稅額 = 營收 × 純益率 × 稅率',
            '現行營所稅率：20%',
            '可享有各項扣除額',
          ],
          screenshot: {
            src: '/guide/income-tax-step-4.png',
            alt: '稅額計算結果',
            annotations: [
              { type: 'text', x: 50, y: 50, text: '應納稅額明細' },
            ],
          },
        },
      },
      {
        en: {
          title: 'Submit Filing',
          description:
            'Generate the filing document and submit through the tax authority online system.',
          icon: Upload,
          tips: [
            'Filing deadline: May 31 annually',
            'Keep all supporting documents for 5 years',
          ],
        },
        zh: {
          title: '提交申報',
          description:
            '產生申報書表，透過財政部電子申報系統完成年度營所稅申報。',
          icon: Upload,
          tips: [
            '申報期限：每年 5 月 31 日前',
            '相關憑證需保存 5 年備查',
            '可透過網路申報或臨櫃申報',
          ],
          screenshot: {
            src: '/guide/income-tax-step-5.png',
            alt: '財政部營所稅申報網站',
            annotations: [
              { type: 'circle', x: 40, y: 35, text: '選擇營所稅申報' },
              { type: 'arrow', x: 50, y: 55, direction: 'down', text: '上傳申報檔' },
            ],
          },
        },
      },
    ],
  },
]

// 輔助函數：取得類別資訊（繁體中文）
export function getCategoryInfo(
  category: GuideCategory
): {
  title: string
  description: string
  icon: LucideIcon
  color: string
  steps: GuideStep[]
} | null {
  const cat = guideCategories.find((c) => c.id === category)
  if (!cat) return null

  return {
    title: cat.title.zh,
    description: cat.description.zh,
    icon: cat.icon,
    color: cat.color,
    steps: cat.steps.map((s) => s.zh),
  }
}
