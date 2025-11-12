# analytics-dashboard Specification

## Purpose
使用 Analytics Engine（免費 10M events/月）收集和視覺化指標

## ADDED Requirements

### Requirement: System SHALL use Analytics Engine for metrics

System SHALL collect API performance metrics using Analytics Engine.

#### Scenario: 記錄 API 指標
**Given**: API 請求完成  
**When**: 回應返回  
**Then**: 寫入 Analytics event（path, method, status, duration）

### Requirement: System MUST provide metrics dashboard

System MUST display charts for error rate, latency, request volume.

#### Scenario: 載入儀表板
**Given**: 使用者開啟 dashboard  
**When**: 頁面載入  
**Then**: 顯示過去 24h 的錯誤率、延遲、請求量圖表

### Requirement: System SHALL send email alerts

System SHALL trigger email when error rate > 5% for 5 minutes.

#### Scenario: 觸發告警
**Given**: 錯誤率 > 5%  
**When**: Alert Worker 評估  
**Then**: 發送 email 給管理員
