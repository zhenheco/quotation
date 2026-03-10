'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '@/lib/api-client'
import { toast } from 'sonner'

interface GuangmaoSettingsProps {
  companyId: string
}

interface GuangmaoStatus {
  enabled: boolean
  tax_id: string | null
}

export default function GuangmaoSettings({ companyId }: GuangmaoSettingsProps) {
  const [status, setStatus] = useState<GuangmaoStatus>({ enabled: false, tax_id: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [taxId, setTaxId] = useState('')
  const [appKey, setAppKey] = useState('')

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    apiGet<GuangmaoStatus>(`/api/accounting/guangmao/status?company_id=${companyId}`)
      .then(setStatus)
      .catch((err) => {
        console.error('Failed to load guangmao status:', err)
        toast.error('載入電子發票設定失敗')
        setStatus({ enabled: false, tax_id: null })
      })
      .finally(() => setLoading(false))
  }, [companyId])

  const handleSetup = async () => {
    if (!taxId || !appKey) {
      toast.error('請填寫統一編號和 APP KEY')
      return
    }
    if (!/^\d{8}$/.test(taxId)) {
      toast.error('統一編號格式錯誤（需為 8 位數字）')
      return
    }

    setSaving(true)
    try {
      await apiPost('/api/accounting/guangmao/setup', {
        company_id: companyId,
        tax_id: taxId,
        app_key: appKey,
      })
      toast.success('光貿整合設定完成')
      setStatus({ enabled: true, tax_id: taxId })
      setShowSetup(false)
      setAppKey('') // 清除敏感資料
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '設定失敗')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-slate-200 rounded w-40" />
          <div className="h-4 bg-slate-100 rounded w-60" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">電子發票整合</h3>
            <p className="text-sm text-slate-500 mt-1">
              串接光貿加值平台，自動開立電子發票
            </p>
          </div>
          {status.enabled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              已啟用
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600">
              未設定
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {status.enabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-slate-500">統一編號</p>
                <p className="font-medium text-slate-800">{status.tax_id}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">平台</p>
                <p className="font-medium text-slate-800">光貿 (Amego)</p>
              </div>
            </div>
            <button
              onClick={() => setShowSetup(true)}
              className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              更新設定
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-500 mb-4">
              尚未設定電子發票整合。設定後可在訂單中一鍵開立發票。
            </p>
            <button
              onClick={() => setShowSetup(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
            >
              開始設定
            </button>
          </div>
        )}

        {/* Setup Form */}
        {showSetup && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="text-sm font-medium text-slate-700 mb-4">光貿 API 設定</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">統一編號</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="例：83446730"
                  maxLength={8}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">APP KEY</label>
                <input
                  type="password"
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  placeholder="從光貿後台取得"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  登入{' '}
                  <a
                    href="https://invoice.amego.tw/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    invoice.amego.tw
                  </a>
                  {' '}取得 API Key
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSetup}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? '驗證連線中...' : '儲存並驗證'}
                </button>
                <button
                  onClick={() => {
                    setShowSetup(false)
                    setAppKey('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 cursor-pointer"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
