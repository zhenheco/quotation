# business-analytics-dashboard Spec (NEW CAPABILITY)

## Purpose
提供業務數據分析儀表板，顯示營收趨勢、貨幣分布、報價單狀態等業務指標。所有數據來自 Cloudflare D1 業務資料庫，確保與報價單列表等其他頁面的資料一致性。

## ADDED Requirements

### Requirement: Dashboard SHALL display revenue trends from D1

Dashboard MUST show monthly revenue trends calculated from D1 quotations table.

#### Scenario: Load revenue trend chart
**Given**: User opens dashboard page
**When**: Revenue trend component loads
**Then**: Calls GET /api/analytics/revenue-trend
**And**: API queries D1 using `getRevenueTrend(db, userId, months)`
**And**: Returns array of monthly revenue data
**And**: Chart displays revenue line graph for past N months

---

### Requirement: Dashboard SHALL display currency distribution

Dashboard MUST show revenue distribution by currency from signed quotations in D1.

#### Scenario: Load currency pie chart
**Given**: User has signed quotations in multiple currencies
**When**: Currency distribution component loads
**Then**: Calls GET /api/analytics/currency-distribution
**And**: API queries D1 for signed quotations grouped by currency
**And**: Returns array of {currency, value, count}
**And**: Pie chart displays currency breakdown

---

### Requirement: Dashboard SHALL display status statistics

Dashboard MUST show quotation count and total value by status.

#### Scenario: Load status bar chart
**Given**: User has quotations in various statuses
**When**: Status statistics component loads
**Then**: Calls GET /api/analytics/status-statistics
**And**: API queries D1 grouping by quotation status
**And**: Returns array of {status, count, value}
**And**: Bar chart displays status breakdown

---

### Requirement: Dashboard SHALL show summary metrics

Dashboard MUST display key metrics: current month revenue, growth rate, conversion rate.

#### Scenario: Load dashboard summary cards
**Given**: User opens dashboard
**When**: Summary component loads
**Then**: Calls GET /api/analytics/dashboard-summary
**And**: API calculates metrics from D1 quotations
**And**: Returns {currentMonthRevenue, revenueGrowth, conversionRate, ...}
**And**: Displays metrics in stat cards

---

### Requirement: Dashboard data MUST match list pages

All dashboard metrics MUST calculate from same D1 data as quotation/contract lists.

#### Scenario: Dashboard and list consistency
**Given**: Dashboard shows "10 quotations this month"
**When**: User clicks through to quotations list
**Then**: List displays exactly 10 quotations
**And**: List items match dashboard calculation criteria
**And**: No discrepancy between views
