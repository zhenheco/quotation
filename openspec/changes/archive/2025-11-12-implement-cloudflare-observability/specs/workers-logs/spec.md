# workers-logs Specification

## Purpose
提供輕量級結構化日誌系統（完全使用 D1，無需 Logpush/R2）

## ADDED Requirements

### Requirement: System SHALL collect critical logs in D1

Worker SHALL record critical events (errors, slow requests) directly to D1 database.

#### Scenario: 記錄錯誤到 D1
**Given**: Worker 執行發生錯誤  
**When**: 返回 500 錯誤  
**Then**: 批次寫入 D1 logs 表，延遲 < 100ms

### Requirement: System MUST provide log query API

Log query API MUST support time range and level filtering.

#### Scenario: 查詢錯誤日誌
**Given**: D1 包含過去 7 天日誌  
**When**: 請求 `/api/logs?level=error`  
**Then**: 查詢 < 1 秒，回傳 JSON 陣列

### Requirement: System SHALL auto-cleanup old logs

System SHALL delete logs older than 7 days (errors: 14 days) daily.

#### Scenario: 自動清理
**Given**: Cron job 每日執行  
**When**: 執行清理  
**Then**: 刪除過期日誌，保持 D1 < 500MB
