# workers-traces Specification

## Purpose
提供輕量級請求追蹤（簡化版，存 D1）

## ADDED Requirements

### Requirement: System SHALL track slow requests

System SHALL record execution timeline for requests > 2 seconds to D1.

#### Scenario: 追蹤慢請求
**Given**: 請求處理 > 2 秒  
**When**: 請求完成  
**Then**: 記錄各步驟時間到 D1 traces 表

### Requirement: System MUST provide trace viewer

System MUST display request timeline in UI.

#### Scenario: 查看 trace
**Given**: 使用者查詢慢請求  
**When**: 點擊查看詳情  
**Then**: 顯示時間軸：API → DB → External calls
