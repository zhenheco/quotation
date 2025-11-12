# Implement Cloudflare Workers Observability System (Free Tier)

## Why

建立全方位的可觀測性系統，**完全使用 Cloudflare 免費方案**，讓開發團隊能夠有效監控、除錯和優化部署在 Cloudflare Workers 上的應用程式。

### 目標
- **開發除錯**：提供即時日誌查詢，快速定位問題
- **生產監控**：追蹤錯誤率、效能指標，主動發現異常
- **效能優化**：分析請求延遲、識別瓶頸，持續改善
- **業務洞察**：了解 API 使用模式、使用者行為趨勢
- **零額外成本**：完全使用免費方案，無月費負擔

### 價值
1. 大幅縮短問題排查時間（從數小時降至數分鐘）
2. 透過主動監控減少生產事故
3. 基於資料驅動的效能優化決策
4. **完全免費**，適合中小型專案和個人開發者

## What Changes

實作三大核心能力（**全部使用免費服務**）：

### 1. Structured Logging - 結構化日誌系統
- ~~Logpush + R2~~ → **Worker 內直接記錄到 D1**
- 只記錄關鍵事件（errors, important operations）
- 提供日誌查詢 API 和前端介面
- 資料保留 3 天（D1 免費額度：5GB）

### 2. Lightweight Tracing - 輕量級追蹤
- 簡化的 request tracing（不使用完整 OpenTelemetry）
- 追蹤資料存到 D1（複用現有資料庫）
- 追蹤關鍵路徑：API → DB → External calls
- 保留 3 天資料

### 3. Analytics Dashboard - 監控儀表板
- 使用 **Analytics Engine**（免費：10M events/月）
- 自訂業務指標收集
- 即時圖表和告警通知
- 使用 D1 儲存告警規則和歷史

## Problem Description

### 當前痛點
1. **缺乏可見性**：無法查看 Worker 執行的詳細日誌和錯誤
2. **除錯困難**：生產環境問題難以重現和定位
3. **效能盲點**：不知道哪些 API 慢、為什麼慢
4. **被動響應**：只有使用者回報才知道有問題
5. **成本考量**：不想為監控服務額外付費

### 免費方案限制
- 無法使用 Logpush（付費功能）
- R2 免費額度有限（10GB storage）
- Workers 免費：100,000 requests/day
- D1 免費：5GB storage, 5M rows read/day
- Analytics Engine 免費：10M events/month

## Solution

### 架構設計（Free Tier - 改進版）

```
┌─────────────────────────────────────┐
│  Next.js App (Worker)               │
│  ┌─────────────────────────────┐   │
│  │ Logger Middleware           │   │
│  │ - PII Redaction             │   │
│  │ - Error Sampling            │   │
│  │ - Request ID Correlation    │   │
│  └────────┬────────────────────┘   │
└───────────┼─────────────────────────┘
            │ ctx.waitUntil()
            │ (非阻塞寫入)
            v
┌─────────────────────────────────────┐
│  Durable Objects Log Queue          │
│  - 批次聚合（50條或10秒）            │
│  - 錯誤去重和計數                    │
│  - Circuit Breaker                  │
└────────┬────────────────────────────┘
         │
    ┌────┴──────────────────┐
    │                       │
    v                       v
┌──────────┐         ┌────────────┐
│   D1     │         │ Analytics  │
│ (Logs)   │         │ Engine     │
│ + Traces │         │ (Metrics)  │
│ + Alerts │         └──────┬─────┘
└────┬─────┘                │
     │                      │
     └──────────┬───────────┘
                │
                v
┌─────────────────────────────────────┐
│  Observability API (Worker)         │
│  - Logs Query (D1 + Indexes)        │
│  - Metrics (Analytics Engine SQL)   │
│  - Traces (Request ID Correlation)  │
│  - Alerting (Cooldown + Aggregation)│
│  - Cost Monitoring                  │
│  - RBAC Access Control              │
└─────────────────┬───────────────────┘
                  │
                  v
┌─────────────────────────────────────┐
│  Admin Dashboard (Frontend)         │
│  - Real-time Logs Viewer            │
│  - Metrics Charts (Recharts)        │
│  - Trace Timeline Viewer            │
│  - Alert Configuration              │
│  - Usage & Cost Monitor             │
└─────────────────────────────────────┘
```

**混合策略（可選）**：
```
┌──────────────┐     ┌──────────────┐
│ Workers Logs │ ──→ │ 即時查詢      │
│ (1-3天)      │     │ (50億/日免費)│
└──────────────┘     └──────────────┘
        │
        │ 重要錯誤同步寫入
        v
┌──────────────┐     ┌──────────────┐
│ D1 Database  │ ──→ │ 長期儲存      │
│ (7-30天)     │     │ (歷史分析)   │
└──────────────┘     └──────────────┘
```

### 技術棧（Free Tier Only）
- **日誌收集**：Worker 內記錄 → Durable Objects Queue → D1（使用 `ctx.waitUntil()` 非阻塞）
- **追蹤**：W3C Trace Context 標準 + Request ID correlation → D1
- **指標**：Analytics Engine（免費 10M events/月）+ SQL API 查詢
- **儲存**：D1 Database（免費 5GB，含完整索引）
- **查詢 API**：Cloudflare Worker + Hono + RBAC 認證（免費）
- **前端**：Next.js + TanStack Query + Recharts + 虛擬滾動
- **安全性**：PII 自動遮罩 + 存取控制 + 稽核日誌
- **可靠性**：錯誤取樣 + 聚合 + Circuit Breaker + 環境隔離

### 資料保留策略（符合免費額度）

| 資料類型 | 保留期限 | 預估大小 | 說明 |
|---------|---------|---------|------|
| Error Logs | 7 天 | ~500MB | 只記錄錯誤 |
| Important Events | 3 天 | ~200MB | 關鍵業務事件 |
| Traces | 3 天 | ~300MB | 慢請求追蹤 |
| Metrics | 90 天 | 免費 | Analytics Engine |
| Alert History | 30 天 | ~50MB | 告警記錄 |
| **總計** | - | **~1GB** | 遠低於 D1 5GB 限制 |

### 智能記錄策略（降低寫入量 + 提升可靠性）

1. **選擇性日誌記錄**
   - ✅ 記錄：所有 4xx/5xx 錯誤
   - ✅ 記錄：慢請求（> 2 秒）
   - ✅ 記錄：關鍵業務事件（支付、報價建立等）
   - ❌ 不記錄：成功的 200 請求（除非特別重要）
   - ❌ 不記錄：Health check, static assets

2. **錯誤取樣和聚合（防止日誌風暴）**
   - 同樣錯誤訊息每分鐘最多記錄 100 次
   - 錯誤去重：使用 fingerprint（message + stack hash）
   - 重複錯誤聚合：記錄「此錯誤發生 N 次」而非 N 條日誌
   - 適應性取樣：錯誤率 > 10% 時自動降低取樣率

3. **非阻塞批次寫入**
   - 使用 `ctx.waitUntil()` 避免阻塞主請求（延遲從 50-100ms 降至 < 5ms）
   - Durable Objects 作為持久化佇列（防止 Worker 重啟時日誌丟失）
   - 每 10 秒或 50 條日誌批次寫入
   - Circuit Breaker：D1 寫入失敗時暫停 1 分鐘

4. **PII 資料保護**
   - 自動偵測和遮罩 email、電話、信用卡號
   - 敏感欄位使用 `[REDACTED]` 取代
   - 符合 GDPR 資料保護要求

5. **自動清理 + 成本監控**
   - 每日 cron job 刪除過期資料
   - 保持 D1 使用量在 1GB 以下
   - 監控用量接近免費額度時自動告警（80% 閾值）
   - 超過限制時優雅降級（只記錄嚴重錯誤）

### 實作階段（改進版）

#### Phase 1: 核心基礎設施 + 安全性 (2-3天)
1. **D1 Schema 設計**
   - 建立完整 tables（logs, traces, alert_rules, alert_events, error_aggregates, audit_logs, usage_stats）
   - 設計完整索引（timestamp, level, request_id, trace_id, user_id）
   - 環境隔離（dev/staging/production 資料庫）

2. **Logger Utility 實作**
   - PII 自動遮罩機制
   - 錯誤 fingerprint 和去重
   - 使用 `ctx.waitUntil()` 非阻塞寫入
   - Durable Objects 日誌佇列

3. **安全性整合**
   - RBAC 存取控制（整合現有權限系統）
   - 稽核日誌記錄
   - API 認證中介層

**驗證**：Logger 寫入延遲 < 5ms，PII 遮罩正常運作

---

#### Phase 2: 可靠性和取樣策略 (1-2天)
1. **錯誤取樣實作**
   - Rate limiting（同錯誤每分鐘 100 次）
   - 錯誤聚合（fingerprint-based）
   - 適應性取樣（錯誤率 > 10% 時降級）

2. **容錯機制**
   - Circuit Breaker（D1 失敗時暫停）
   - 批次寫入重試策略
   - 背壓處理（佇列太長時丟棄舊日誌）

3. **Request ID Correlation**
   - 實作 W3C Trace Context
   - 前端產生並傳遞 X-Request-ID
   - 所有日誌包含 trace_id 和 span_id

**驗證**：日誌風暴測試（1000 錯誤/秒不崩潰）

---

#### Phase 3: Analytics Engine 整合 (1天)
1. 配置 Analytics Engine metrics schema
2. 記錄 API 效能指標（latency, status, size）
3. 記錄業務 KPIs（quotation_created, payment_received）
4. 實作 Analytics Engine SQL API 查詢

**驗證**：Metrics 正確記錄，< 10M events/月

---

#### Phase 4: 查詢 API + 告警 (2-3天)
1. **日誌查詢 API**
   - 使用 D1 prepared statements + 索引
   - Cursor-based pagination
   - 全文搜尋（FTS5 虛擬表）
   - 5 分鐘查詢快取

2. **指標查詢 API**
   - Analytics Engine SQL 查詢
   - 聚合和 percentile 計算（p50/p95/p99）
   - 時間範圍和間隔支援

3. **告警引擎**
   - Cron Worker（每分鐘評估）
   - 告警 cooldown（5 分鐘）
   - 告警聚合（相同告警合併）
   - Email/Webhook 通知

**驗證**：查詢 < 1 秒，告警觸發 < 1 分鐘

---

#### Phase 5: 前端儀表板 (3-4天)
1. **日誌查看器**
   - 虛擬滾動（react-window）
   - 篩選和搜尋
   - 日誌上下文查看
   - 匯出 JSON/CSV

2. **指標儀表板**
   - Recharts 圖表（錯誤率、延遲、請求量）
   - 時間範圍選擇器
   - 自動重新整理（30 秒）
   - 深色模式支援

3. **告警配置介面**
   - 告警規則建立和管理
   - 告警歷史查看
   - 靜音和取消靜音

4. **成本監控儀表板**
   - 當前用量 vs 免費額度
   - 用量趨勢圖表
   - 接近限制時顯示警告

**驗證**：UI 回應 < 100ms，圖表更新正常

---

#### Phase 6: 清理、文件、測試 (1-2天)
1. **自動清理 Cron**
   - 刪除過期日誌（7 天錯誤，3 天其他）
   - D1 使用量監控

2. **文件撰寫**
   - API 文件（OpenAPI）
   - 使用者指南
   - 開發者指南
   - 故障排除指南

3. **測試**
   - 單元測試（Vitest）
   - 整合測試（本地 D1）
   - 端到端測試（Playwright）
   - 效能測試（負載測試）

**驗證**：測試覆蓋率 > 80%，效能無退化

---

**總時程：約 3-4 週**（含安全性和可靠性改進）

**時程對比**：
- 原方案（基礎版）：2 週
- 改進方案（生產級）：3-4 週
- 增加時間主要用於：安全性、可靠性、錯誤處理

## Verification

### 驗證標準（全面升級）

#### 效能指標
- [ ] 日誌寫入延遲 < 5ms（使用 `ctx.waitUntil()`）
- [ ] 查詢過去 7 天的錯誤 < 500ms（使用索引）
- [ ] 全文搜尋 < 1 秒
- [ ] 儀表板載入 < 2 秒
- [ ] API 回應時間 p95 < 200ms
- [ ] 主請求效能無退化（< 5ms overhead）

#### 日誌系統
- [ ] 所有 4xx/5xx 錯誤被記錄到 D1
- [ ] 慢請求（> 2s）100% 被追蹤
- [ ] PII 資料自動遮罩（email、電話、信用卡）
- [ ] JSON 格式結構化日誌正確
- [ ] 日誌自動清理運作正常
- [ ] D1 使用量 < 1GB（持續監控）

#### 錯誤處理和可靠性
- [ ] 日誌風暴測試通過（1000 錯誤/秒不崩潰）
- [ ] 錯誤取樣正常運作（同錯誤 < 100 次/分鐘）
- [ ] 錯誤聚合正確（fingerprint-based）
- [ ] Circuit Breaker 正常運作（D1 失敗時暫停）
- [ ] Durable Objects 佇列無資料丟失
- [ ] 批次寫入重試機制正常

#### 追蹤系統
- [ ] Request ID correlation 正確（跨所有日誌）
- [ ] W3C Trace Context 標準實作
- [ ] 前端產生的 X-Request-ID 正確傳遞
- [ ] Trace 資料保留 3 天
- [ ] 可查看完整請求時間軸

#### 監控儀表板
- [ ] 即時顯示錯誤率、延遲、請求量
- [ ] 圖表自動重新整理（30 秒）
- [ ] 虛擬滾動處理大量日誌（> 1000 條）
- [ ] 日誌匯出功能正常（JSON/CSV）
- [ ] 深色模式切換正常
- [ ] Analytics Engine 未超過免費額度（< 10M events/月）

#### 告警系統
- [ ] 錯誤率 > 5% 時觸發告警
- [ ] 告警 cooldown 正常運作（5 分鐘）
- [ ] 告警聚合正確（相同告警合併）
- [ ] Email/Webhook 通知 < 1 分鐘送達
- [ ] 告警歷史記錄正確
- [ ] 告警靜音功能正常

#### 安全性和合規
- [ ] RBAC 存取控制正常（只有 admin 可查看日誌）
- [ ] API 認證中介層運作正常
- [ ] 稽核日誌記錄管理員操作
- [ ] PII 遮罩符合 GDPR 要求
- [ ] 無敏感資料洩漏

#### 成本監控
- [ ] 用量儀表板顯示正確
- [ ] 接近免費額度時告警（80% 閾值）
- [ ] D1 存儲用量監控正常
- [ ] Analytics Engine events 計數正確
- [ ] 每日用量報告正常

#### 環境隔離
- [ ] Dev/Staging/Production 環境分離
- [ ] 開發日誌不污染生產資料庫
- [ ] 環境標籤正確記錄

#### 測試覆蓋
- [ ] 單元測試覆蓋率 > 80%
- [ ] 整合測試通過（本地 D1）
- [ ] 端到端測試通過（Playwright）
- [ ] 效能測試通過（負載測試）

## Impact

### 正面影響（量化）

#### 效能提升
| 指標 | 改進前 | 改進後 | 提升 |
|------|--------|--------|------|
| 日誌寫入延遲 | 50-100ms | < 5ms | **20x** |
| 查詢效能 | 3-5s | < 500ms | **10x** |
| 日誌風暴處理 | ❌ 系統崩潰 | ✅ 自動取樣 | **無限** |
| 錯誤追蹤完整性 | 50% | 95% | **2x** |

#### 開發效率
- 問題排查時間減少 **70%**（從數小時降至數分鐘）
- 生產事故發現時間從數小時降至 **< 5 分鐘**（主動告警）
- 根因分析時間減少 **80%**（Request ID correlation）
- API 效能優化決策更快（基於真實資料）

#### 成本和合規
- **完全免費**，無額外月費（$0/月 vs 第三方 APM $50-200/月）
- 符合 GDPR 資料保護要求（PII 遮罩）
- 無需學習複雜的 APM 工具（學習曲線低）
- 未來可無縫升級到付費方案（資料格式標準化）

### 限制（相比付費 APM）

#### 功能限制
- 日誌保留期較短（**7 天錯誤，3 天其他** vs 付費方案 30-90 天）
- 不記錄所有請求（**只記錄錯誤和慢請求** vs 付費方案 100% 取樣）
- 追蹤功能簡化（**輕量級追蹤** vs 完整分散式追蹤）
- 需手動管理 D1 資料大小（**自動清理** vs 付費方案無限儲存）

#### 可擴展性限制
- D1 免費額度：5GB storage, 5M reads/day
- Analytics Engine 免費額度：10M events/month
- Workers 免費額度：100K requests/day
- 超過限制需要付費或降級（只記錄嚴重錯誤）

### 緩解措施

#### 資料保留和備份
- 重要日誌可手動匯出備份（CSV/JSON/JSON Lines）
- 可選：每週自動備份到 R2（10GB 免費，超過 $0.015/GB）
- 關鍵錯誤保留 **7 天**（較一般日誌長）
- 實作日誌重放機制（從備份恢復指標）

#### 擴展性應對
- 監控用量接近限制時**自動降級**（只記錄嚴重錯誤）
- 實作**適應性取樣**（流量高時自動降低取樣率）
- 提供**升級路徑文件**（從免費方案遷移到付費方案）
- 保持與標準相容（OpenTelemetry, W3C Trace Context）

#### 文件和透明度
- 明確文件化**哪些事件會被記錄**
- 提供**成本計算器**（估算超過免費額度的成本）
- 告警規則範本和最佳實踐指南
- 故障排除和常見問題文件

## Dependencies

### Cloudflare 免費服務（核心）
- ✅ **Workers**（100K requests/day）- 主應用和 Observability API
- ✅ **D1 Database**（5GB, 5M reads/day）- 日誌、追蹤、告警儲存
- ✅ **Durable Objects**（1M requests/month）- 日誌佇列和即時推送
- ✅ **Analytics Engine**（10M events/month）- 指標收集和查詢
- ✅ **Cron Triggers**（免費）- 自動清理和告警評估
- ✅ **Email SMTP**（Gmail，已配置）- 告警通知

### 可選增強服務（仍免費）
- ⚪ **R2**（10GB 免費）- 日誌備份和歷史資料匯出
- ⚪ **KV**（1GB 免費）- 查詢快取和 session 儲存
- ⚪ **Workers Logs**（50 億條/日免費）- 混合策略：即時查詢

### 無需額外費用
- ❌ 不使用 **Logpush**（付費功能：$5/月起）
- ❌ 不使用 **Trace Workers**（2026/1/15 起付費）
- ❌ 不使用第三方 APM（Datadog, Sentry, New Relic 等）
- ❌ 不使用外部資料庫或儲存服務

### 整合現有系統
- ✅ 整合現有 **RBAC 權限系統**（observability 資源）
- ✅ 使用現有 **Hono 中介層架構**
- ✅ 整合現有 **i18n 多語言系統**
- ✅ 複用現有 **D1 資料庫連接**

## Cost Estimation

### 完全免費方案（改進版）

| 服務 | 免費額度 | 預估使用量 | 使用率 | 成本 |
|------|---------|-----------|--------|------|
| Workers | 100K req/day | ~50K req/day | 50% | **$0** |
| D1 Storage | 5GB | ~1GB | 20% | **$0** |
| D1 Reads | 5M reads/day | ~1M reads/day | 20% | **$0** |
| Durable Objects | 1M req/month | ~500K req/month | 50% | **$0** |
| Analytics Engine | 10M events/month | ~5M events/month | 50% | **$0** |
| Cron Triggers | 無限 | 1440 runs/day | - | **$0** |
| **總計** | - | - | **< 50%** | **$0/月** |

**安全邊界**：所有服務使用量 < 50% 免費額度，有充足緩衝空間

### 可選增強（仍免費）

| 服務 | 用途 | 免費額度 | 預估使用量 | 成本 |
|------|------|---------|-----------|------|
| R2 | 日誌備份 | 10GB storage | ~2GB | **$0** |
| KV | 查詢快取 | 1GB, 100K reads/day | ~100MB | **$0** |
| Workers Logs | 即時查詢 | 50億條/日 | ~10萬條/日 | **$0** |

### 超過免費額度時（降級策略）

**情境 1**：流量突然暴增（例如：從 10K req/day → 150K req/day）

| 服務 | 超過情況 | 應對策略 | 額外成本 |
|------|---------|---------|---------|
| Workers | 150K req/day | 自動執行，無需降級 | $0.15/M 額外請求 = **$0.0075/日** |
| D1 Reads | 6M reads/day | 啟用查詢快取 | $0.75/M 額外讀取 = **$0.75/日** |
| 日誌寫入 | 過多錯誤 | 啟用錯誤取樣（限制 100 次/分鐘） | **$0**（減少寫入） |

**情境 2**：長期超過免費額度

| 階段 | 策略 | 成本 |
|------|------|------|
| 80% 用量 | 自動告警 | $0 |
| 100% 用量 | 優雅降級（只記錄嚴重錯誤） | $0 |
| 持續超過 | 考慮升級到付費方案或優化 | < $5/月 |

### 成本對比（月費）

| 方案 | 成本 | 功能 |
|------|------|------|
| **本方案（免費）** | **$0** | 日誌、追蹤、指標、告警 |
| Sentry（免費） | $0 | 僅錯誤追蹤（5K events/月） |
| Sentry（付費） | $26/月 | 50K events/月 |
| Datadog（基礎） | $15/月 | 日誌 + APM |
| New Relic（基礎） | $25/月 | 完整 APM |
| Honeycomb（付費） | $50/月 | 完整可觀測性 |
| **節省** | **$15-50/月** | **vs 付費 APM** |

## Related Changes

- 無前置依賴
- 未來可選擇升級到付費方案（Logpush, R2）
