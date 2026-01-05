'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  Receipt,
  Landmark,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  FileText,
  Calculator,
  Download,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 教學類別
type GuideCategory = 'getting-started' | 'vat-filing' | 'income-tax'

// 步驟資料結構
interface GuideStep {
  title: string
  description: string
  icon: React.ReactNode
  tips?: string[]
}

// 教學內容
const guideContent: Record<GuideCategory, { title: string; titleZh: string; description: string; descriptionZh: string; steps: { en: GuideStep; zh: GuideStep }[] }> = {
  'getting-started': {
    title: 'Getting Started',
    titleZh: '新手導覽',
    description: 'Learn the basics of using the quotation system',
    descriptionZh: '快速了解報價系統的基本功能',
    steps: [
      {
        en: {
          title: 'Set Up Your Company',
          description: 'First, complete your company profile with tax ID, address, and contact information. This information will appear on your quotations.',
          icon: <FileText className="h-6 w-6" />,
          tips: ['Navigate to Settings > Company Profile', 'Your tax ID is required for tax filing features'],
        },
        zh: {
          title: '設定公司資料',
          description: '首先，完成公司資料設定，包括統一編號、地址和聯絡資訊。這些資訊將顯示在報價單上。',
          icon: <FileText className="h-6 w-6" />,
          tips: ['前往「設定」>「公司資料」', '統一編號是使用報稅功能的必要資訊'],
        },
      },
      {
        en: {
          title: 'Add Products/Services',
          description: 'Create your product or service catalog. Each item can have a description, unit price, and tax settings.',
          icon: <Calculator className="h-6 w-6" />,
          tips: ['Go to Products/Services menu', 'You can set default tax rates per product'],
        },
        zh: {
          title: '新增產品/服務',
          description: '建立你的產品或服務目錄。每個項目可設定說明、單價和稅務設定。',
          icon: <Calculator className="h-6 w-6" />,
          tips: ['前往「服務/項目」選單', '可為每個產品設定預設稅率'],
        },
      },
      {
        en: {
          title: 'Manage Customers',
          description: 'Add customer information including company name, tax ID, and billing address for easy quotation creation.',
          icon: <FileText className="h-6 w-6" />,
          tips: ['Customer tax ID is required for B2B invoices', 'You can import customers from Excel'],
        },
        zh: {
          title: '管理客戶資料',
          description: '新增客戶資訊，包括公司名稱、統一編號和帳單地址，方便快速建立報價單。',
          icon: <FileText className="h-6 w-6" />,
          tips: ['B2B 發票需要客戶統編', '可從 Excel 匯入客戶'],
        },
      },
      {
        en: {
          title: 'Create Your First Quotation',
          description: 'Now you\'re ready to create quotations! Select a customer, add items, and generate professional PDF quotes.',
          icon: <FileText className="h-6 w-6" />,
          tips: ['Click "New Quotation" to start', 'You can duplicate existing quotations'],
        },
        zh: {
          title: '建立第一張報價單',
          description: '現在可以開始建立報價單了！選擇客戶、新增項目，產生專業的 PDF 報價單。',
          icon: <FileText className="h-6 w-6" />,
          tips: ['點擊「新增報價單」開始', '可複製現有報價單'],
        },
      },
    ],
  },
  'vat-filing': {
    title: 'VAT Filing (401)',
    titleZh: '營業稅申報教學',
    description: 'How to generate and file your bi-monthly VAT return',
    descriptionZh: '學習如何產生和申報雙月營業稅',
    steps: [
      {
        en: {
          title: 'Manage Invoices',
          description: 'Go to Accounting > Invoices to manage your sales (output) and purchase (input) invoices. Make sure all invoices are posted before filing.',
          icon: <Receipt className="h-6 w-6" />,
          tips: ['Only posted invoices are included in tax filing', 'Check invoice status before proceeding'],
        },
        zh: {
          title: '管理發票',
          description: '前往「會計系統」>「發票管理」來管理銷項和進項發票。申報前確保所有發票都已過帳。',
          icon: <Receipt className="h-6 w-6" />,
          tips: ['只有已過帳的發票會納入申報', '申報前請檢查發票狀態'],
        },
      },
      {
        en: {
          title: 'Generate Tax Report',
          description: 'Navigate to Accounting > Financial Reports > VAT. Select the bi-monthly period (e.g., Jan-Feb = Period 1) and click Generate.',
          icon: <Calculator className="h-6 w-6" />,
          tips: ['VAT is filed bi-monthly (6 periods per year)', 'Review the summary before downloading'],
        },
        zh: {
          title: '產生申報資料',
          description: '前往「會計系統」>「財務報表」>「營業稅申報」。選擇雙月期（如 1-2 月 = 第 1 期）並點擊產生。',
          icon: <Calculator className="h-6 w-6" />,
          tips: ['營業稅為雙月申報（每年 6 期）', '下載前請檢視摘要'],
        },
      },
      {
        en: {
          title: 'Review Sales & Purchases',
          description: 'Check the Sales Details and Purchases Details tabs to verify all invoices are correctly categorized (taxable 5%, zero-rated, exempt).',
          icon: <FileText className="h-6 w-6" />,
          tips: ['Verify output tax and input tax amounts', 'Check for any missing invoices'],
        },
        zh: {
          title: '檢視銷項與進項',
          description: '檢查「銷項明細」和「進項明細」分頁，確認發票分類正確（應稅 5%、零稅率、免稅）。',
          icon: <FileText className="h-6 w-6" />,
          tips: ['確認銷項稅額和進項稅額', '檢查是否有遺漏的發票'],
        },
      },
      {
        en: {
          title: 'Download Filing Files',
          description: 'Download the XML file for online filing or the Media File (TXT) for the Ministry of Finance offline filing system.',
          icon: <Download className="h-6 w-6" />,
          tips: ['XML is for online filing portal', 'Media File follows MOF 81-byte format'],
        },
        zh: {
          title: '下載申報檔案',
          description: '下載 XML 檔案進行線上申報，或下載媒體檔（TXT）使用財政部離線申報系統。',
          icon: <Download className="h-6 w-6" />,
          tips: ['XML 用於線上申報入口網站', '媒體檔符合財政部 81 bytes 規格'],
        },
      },
      {
        en: {
          title: 'Upload to Tax Portal',
          description: 'Go to the National Taxation Bureau website and upload your files. Keep the confirmation receipt for your records.',
          icon: <Upload className="h-6 w-6" />,
          tips: ['Filing deadline: 15th of odd months', 'Save confirmation for 5+ years'],
        },
        zh: {
          title: '上傳至報稅網站',
          description: '前往財政部電子申報繳稅網站上傳檔案。保留申報回執聯以備查核。',
          icon: <Upload className="h-6 w-6" />,
          tips: ['申報期限：單月 15 日前', '請保存回執聯至少 5 年'],
        },
      },
    ],
  },
  'income-tax': {
    title: 'Corporate Income Tax',
    titleZh: '營所稅申報教學',
    description: 'How to use the Expanded Audit (擴大書審) calculation',
    descriptionZh: '學習如何使用擴大書審計算營所稅',
    steps: [
      {
        en: {
          title: 'Check Eligibility',
          description: 'Expanded Audit applies to SMEs with annual revenue under NT$30 million. Verify your company qualifies before using this method.',
          icon: <CheckCircle2 className="h-6 w-6" />,
          tips: ['Revenue limit: NT$30 million', 'Must maintain proper accounting records'],
        },
        zh: {
          title: '確認適用資格',
          description: '擴大書審適用於年營業收入 3,000 萬元以下的中小企業。使用前請確認公司符合資格。',
          icon: <CheckCircle2 className="h-6 w-6" />,
          tips: ['營收上限：3,000 萬元', '須保持良好的帳務紀錄'],
        },
      },
      {
        en: {
          title: 'Navigate to Income Tax',
          description: 'Go to Accounting > Income Tax Filing. The system will automatically pull your revenue data from posted invoices.',
          icon: <Landmark className="h-6 w-6" />,
          tips: ['Ensure all sales invoices are posted', 'Review revenue summary first'],
        },
        zh: {
          title: '進入營所稅申報',
          description: '前往「會計系統」>「營所稅申報」。系統會自動從已過帳發票提取營收資料。',
          icon: <Landmark className="h-6 w-6" />,
          tips: ['確保所有銷售發票已過帳', '先檢視營收摘要'],
        },
      },
      {
        en: {
          title: 'Select Industry Category',
          description: 'Choose your industry category from the dropdown. Each industry has a preset profit rate set by the Ministry of Finance.',
          icon: <FileText className="h-6 w-6" />,
          tips: ['Profit rates range from 6% to 20%', 'Choose the most accurate category'],
        },
        zh: {
          title: '選擇行業類別',
          description: '從下拉選單選擇行業類別。每個行業有財政部規定的純益率。',
          icon: <FileText className="h-6 w-6" />,
          tips: ['純益率範圍從 6% 到 20%', '選擇最符合的行業'],
        },
      },
      {
        en: {
          title: 'Review Tax Calculation',
          description: 'The system calculates: Revenue × Profit Rate = Taxable Income. Then applies the 20% tax rate with threshold exemptions.',
          icon: <Calculator className="h-6 w-6" />,
          tips: ['Income under NT$120K is exempt', 'NT$120K-200K is taxed at half rate'],
        },
        zh: {
          title: '檢視稅額計算',
          description: '系統計算：營收 × 純益率 = 課稅所得。然後套用 20% 稅率和起徵額規則。',
          icon: <Calculator className="h-6 w-6" />,
          tips: ['課稅所得 12 萬以下免稅', '12-20 萬半數課稅'],
        },
      },
      {
        en: {
          title: 'Submit Filing',
          description: 'Review the calculated tax amount, then proceed to submit your annual corporate income tax filing.',
          icon: <Upload className="h-6 w-6" />,
          tips: ['Annual filing deadline: May 31', 'Keep all supporting documents'],
        },
        zh: {
          title: '提交申報',
          description: '確認計算的稅額後，即可提交年度營利事業所得稅申報。',
          icon: <Upload className="h-6 w-6" />,
          tips: ['年度申報期限：5 月 31 日', '請保存所有證明文件'],
        },
      },
    ],
  },
}

/**
 * 教學儀表板
 */
export default function GuideDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<GuideCategory | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const categories: { id: GuideCategory; icon: React.ReactNode }[] = [
    { id: 'getting-started', icon: <BookOpen className="h-8 w-8" /> },
    { id: 'vat-filing', icon: <Receipt className="h-8 w-8" /> },
    { id: 'income-tax', icon: <Landmark className="h-8 w-8" /> },
  ]

  const handleSelectCategory = (category: GuideCategory) => {
    setSelectedCategory(category)
    setCurrentStep(0)
  }

  const handleBack = () => {
    setSelectedCategory(null)
    setCurrentStep(0)
  }

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleNextStep = () => {
    if (selectedCategory && currentStep < guideContent[selectedCategory].steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  // 類別選擇畫面
  if (!selectedCategory) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">教學指南</h1>
          <p className="text-muted-foreground mt-2">選擇一個主題開始學習</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {categories.map((cat) => {
            const content = guideContent[cat.id]
            return (
              <Card
                key={cat.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:border-emerald-300"
                onClick={() => handleSelectCategory(cat.id)}
              >
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                    {cat.icon}
                  </div>
                  <CardTitle className="text-lg">
                    {content.titleZh}
                  </CardTitle>
                  <CardDescription>
                    {content.descriptionZh}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {content.steps.length} 個步驟
                  </p>
                  <Button variant="ghost" className="mt-4 gap-2">
                    開始學習
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // 步驟教學畫面
  const content = guideContent[selectedCategory]
  const step = content.steps[currentStep]
  const stepData = step.zh
  const totalSteps = content.steps.length

  return (
    <div className="space-y-6">
      {/* 標題列 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          返回類別
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">
            {content.titleZh}
          </h1>
        </div>
      </div>

      {/* 進度指示器 */}
      <div className="flex items-center gap-2">
        {content.steps.map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-2 flex-1 rounded-full transition-colors',
              index <= currentStep ? 'bg-emerald-500' : 'bg-slate-200'
            )}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground text-center">
        第 {currentStep + 1} 步，共 {totalSteps} 步
      </p>

      {/* 步驟卡片 */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              {stepData.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{stepData.title}</CardTitle>
              <CardDescription className="mt-1">步驟 {currentStep + 1}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-slate-700 leading-relaxed mb-6">
            {stepData.description}
          </p>

          {/* 提示區 */}
          {stepData.tips && stepData.tips.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <h4 className="font-medium text-amber-800 mb-2">小提示</h4>
              <ul className="space-y-1">
                {stepData.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-amber-700">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 導航按鈕 */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevStep}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          上一步
        </Button>

        {currentStep < totalSteps - 1 ? (
          <Button onClick={handleNextStep} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            下一步
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleBack} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            完成
          </Button>
        )}
      </div>
    </div>
  )
}
