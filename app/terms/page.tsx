import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '服務條款',
  description: 'Quote24 服務條款',
}

export default async function TermsPage() {
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
            服務條款
          </h1>
          <p className="text-gray-600">最後更新日期：2024 年 12 月</p>
        </div>

        <div className="prose prose-blue max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              1. 服務說明
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Quote24 是一個報價管理系統，提供報價單建立、客戶管理、產品管理及會計功能。
            </p>
            <p className="text-gray-700 leading-relaxed">
              使用本服務即表示您同意遵守本服務條款。如您不同意本條款，請勿使用本服務。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. 使用者責任
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              使用本服務時，您同意：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>提供真實、準確的資訊</li>
              <li>保管好您的帳戶密碼</li>
              <li>不進行任何違法行為</li>
              <li>不干擾或破壞本服務</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              3. 智慧財產權
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              本服務的所有內容、功能和技術均受智慧財產權保護：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>您不得複製、修改或散布本服務的任何部分</li>
              <li>您保留您輸入資料的所有權</li>
              <li>您授權我們為提供服務而使用您的資料</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. 服務變更與終止
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              我們保留以下權利：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>隨時修改或終止服務</li>
              <li>因違反條款而終止您的帳戶</li>
              <li>修改服務費用（將提前通知）</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              5. 免責聲明
            </h2>
            <p className="text-gray-700 leading-relaxed">
              本服務按「現狀」提供，我們不保證服務不會中斷或無錯誤。在法律允許的範圍內，我們不對任何間接損失負責。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              6. 賠償責任限制
            </h2>
            <p className="text-gray-700 leading-relaxed">
              在任何情況下，我們的賠償責任不超過您過去 12 個月支付的服務費用總額。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7. 準據法
            </h2>
            <p className="text-gray-700 leading-relaxed">
              本條款依中華民國法律解釋，任何爭議應由台灣台北地方法院管轄。
            </p>
          </section>

          <section className="mb-8 bg-blue-50 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              8. 聯絡我們
            </h2>
            <p className="text-gray-700 leading-relaxed">
              如有任何問題，請聯絡我們：support@quote24.cc
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
