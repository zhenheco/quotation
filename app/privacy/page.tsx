import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '隱私權政策',
  description: 'Quote24 隱私權政策',
}

export default async function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <div className="mb-8">
          <a
            href="/login"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回登入頁
          </a>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            隱私權政策
          </h1>
          <p className="text-gray-600">最後更新日期：2024 年 12 月</p>
        </div>

        <div className="prose prose-blue max-w-none">
          <p className="text-gray-700 leading-relaxed mb-8">
            Quote24（以下簡稱「本服務」）非常重視您的隱私權。本隱私權政策說明我們如何收集、使用、保護您的個人資料。
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              1. 資料收集
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              我們可能收集以下類型的資料：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>帳戶資訊（姓名、電子郵件地址）</li>
              <li>公司資訊（公司名稱、統一編號、地址）</li>
              <li>使用紀錄（登入時間、功能使用情況）</li>
              <li>裝置資訊（瀏覽器類型、IP 位址）</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. 資料使用目的
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              我們收集的資料將用於：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>提供、維護及改善本服務</li>
              <li>處理您的交易和請求</li>
              <li>與您溝通服務相關事項</li>
              <li>遵守法律義務</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              3. 資料保護
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              我們採取適當的安全措施保護您的資料：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>使用 SSL/TLS 加密傳輸</li>
              <li>定期安全性審查</li>
              <li>存取控制與身份驗證</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. 資料分享
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              除以下情況外，我們不會將您的資料分享給第三方：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>經您同意</li>
              <li>法律要求</li>
              <li>保護我們的權利</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              5. 您的權利
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              您有權：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>查詢您的個人資料</li>
              <li>要求更正或刪除資料</li>
              <li>撤回同意</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              6. Cookie 使用
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              我們使用 Cookie 來：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>維持您的登入狀態</li>
              <li>記住您的偏好設定</li>
              <li>分析網站使用情況</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7. 政策變更
            </h2>
            <p className="text-gray-700 leading-relaxed">
              我們可能會不時更新本隱私權政策。如有重大變更，我們會透過電子郵件或網站公告通知您。
            </p>
          </section>

          <section className="mb-8 bg-blue-50 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              8. 聯絡我們
            </h2>
            <p className="text-gray-700 leading-relaxed">
              如有任何問題或需要行使您的權利，請聯絡我們：support@quote24.cc
            </p>
          </section>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex justify-center">
            <a
              href="/login"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回登入頁
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
