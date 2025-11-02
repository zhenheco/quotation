'use client'

import { useState } from 'react'

interface Quotation {
  id: string
  quotation_number: string
  customer_name?: { zh: string; en: string }
  customer_id: string
  status: string
  currency: string
  total_amount?: number
}

interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

export default function TestSendAPIPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: new Date().toLocaleTimeString(), message: '✅ 測試工具已準備就緒', type: 'success' },
    { timestamp: new Date().toLocaleTimeString(), message: '提示：請先登入系統才能測試寄送功能', type: 'warning' },
  ])
  const [quotationId, setQuotationId] = useState('3d9ea7c9-11f1-436e-88c8-4f80515c69bb')

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message, type }])
  }

  const clearLogs = () => {
    setLogs([])
  }

  const fetchQuotations = async () => {
    clearLogs()
    addLog('🔄 正在載入報價單列表...', 'info')

    try {
      const response = await fetch('/api/quotations')

      addLog(`📡 HTTP ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error')

      if (!response.ok) {
        const error = await response.json()
        addLog(`❌ 錯誤: ${error.error || '未知錯誤'}`, 'error')
        return
      }

      const data = await response.json()
      const quotationsList = data.data || data

      setQuotations(quotationsList)
      addLog(`✅ 成功載入 ${quotationsList.length} 筆報價單`, 'success')

      quotationsList.forEach((q: Quotation) => {
        addLog(`  📄 ${q.quotation_number} - ${q.status} - ${q.customer_name?.zh || q.customer_id}`, 'info')
      })

    } catch (error) {
      addLog(`❌ 請求失敗: ${(error as Error).message}`, 'error')
      console.error('Error fetching quotations:', error)
    }
  }

  const sendQuotation = async (id?: string) => {
    const targetId = id || quotationId

    if (!targetId) {
      addLog('❌ 請輸入報價單 ID', 'error')
      return
    }

    clearLogs()
    addLog('🚀 開始測試寄送報價單 API...', 'info')
    addLog(`📋 報價單 ID: ${targetId}`, 'info')

    try {
      const url = `/api/quotations/${targetId}/send`
      addLog(`📡 POST ${url}`, 'info')

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const statusColor = response.ok ? 'success' : 'error'
      addLog(`📊 HTTP ${response.status} ${response.statusText}`, statusColor)

      const data = await response.json()

      addLog(`📄 Response Body:`, 'info')
      addLog(JSON.stringify(data, null, 2), 'info')

      if (response.ok) {
        addLog('✅ API 測試成功！', 'success')
        addLog(`  success: ${data.success}`, 'success')
        addLog(`  message: ${data.message}`, 'success')
        if (data.data) {
          addLog(`  更新後狀態: ${data.data.status}`, 'success')
        }

        setTimeout(() => {
          addLog('🔄 重新載入報價單列表...', 'info')
          fetchQuotations()
        }, 1000)

      } else {
        addLog(`❌ API 錯誤: ${data.error || '未知錯誤'}`, 'error')

        if (response.status === 401) {
          addLog('⚠️  需要登入才能執行此操作', 'warning')
          addLog('請先登入系統：/zh/login', 'warning')
        } else if (response.status === 404) {
          addLog('⚠️  找不到此報價單', 'warning')
        } else if (response.status === 400) {
          addLog('⚠️  客戶郵件地址不存在', 'warning')
        }
      }

    } catch (error) {
      addLog(`❌ 請求失敗: ${(error as Error).message}`, 'error')
      console.error('Error sending quotation:', error)
    }
  }

  return (
    <div style={{ padding: '2rem', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', background: 'white', borderRadius: '8px', padding: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: '1.5rem', color: '#333' }}>🧪 寄送報價單 API 測試工具</h1>

        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f9f9f9', borderRadius: '6px' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: '#555' }}>1️⃣ 取得報價單列表</h2>
          <button
            onClick={fetchQuotations}
            style={{ padding: '0.75rem 1rem', fontSize: '1rem', borderRadius: '4px', border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer', fontWeight: '600' }}
          >
            載入報價單列表
          </button>

          {quotations.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
              {quotations.map((q) => (
                <div key={q.id} style={{ padding: '1rem', background: 'white', border: '1px solid #e5e5e5', borderRadius: '4px' }}>
                  <h3 style={{ marginBottom: '0.5rem', color: '#333' }}>{q.quotation_number}</h3>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                    客戶: {q.customer_name?.zh || q.customer_id}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                    金額: {q.currency} {q.total_amount?.toLocaleString() || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                    狀態: <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      background: q.status === 'draft' ? '#e5e5e5' : q.status === 'sent' ? '#dbeafe' : '#dcfce7',
                      color: q.status === 'draft' ? '#666' : q.status === 'sent' ? '#1e40af' : '#166534'
                    }}>
                      {q.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '0.5rem' }}>
                    ID: {q.id}
                  </div>
                  {q.status === 'draft' && (
                    <button
                      onClick={() => sendQuotation(q.id)}
                      style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', borderRadius: '4px', border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer', fontWeight: '600' }}
                    >
                      寄送此報價單
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f9f9f9', borderRadius: '6px' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: '#555' }}>2️⃣ 測試寄送 API</h2>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={quotationId}
              onChange={(e) => setQuotationId(e.target.value)}
              placeholder="輸入報價單 ID"
              style={{ padding: '0.75rem 1rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ddd', width: '100%', maxWidth: '400px', marginRight: '0.5rem' }}
            />
            <button
              onClick={() => sendQuotation()}
              style={{ padding: '0.75rem 1rem', fontSize: '1rem', borderRadius: '4px', border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer', fontWeight: '600' }}
            >
              寄送報價單
            </button>
          </div>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            預設 ID 是測試資料中的 Q2025-003 (draft 狀態)
          </p>
        </div>

        <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '6px' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: '#555' }}>📊 API 日誌</h2>
          <div style={{ padding: '1rem', background: '#1e1e1e', color: '#d4d4d4', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.9rem', maxHeight: '400px', overflowY: 'auto' }}>
            {logs.map((log, i) => (
              <div
                key={i}
                style={{
                  marginBottom: '0.5rem',
                  color: log.type === 'success' ? '#4ade80' : log.type === 'error' ? '#ef4444' : log.type === 'warning' ? '#fbbf24' : '#60a5fa'
                }}
              >
                [{log.timestamp}] {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
