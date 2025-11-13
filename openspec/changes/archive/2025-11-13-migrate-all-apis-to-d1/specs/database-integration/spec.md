# database-integration Spec Delta

## ADDED Requirements

### Requirement: System SHALL use Cloudflare D1 as primary business database

All business data APIs (quotations, customers, products, contracts, payments) MUST query Cloudflare D1 database instead of Supabase PostgreSQL.

**Rationale**:
- Eliminate data inconsistency between dashboard and list views
- Improve performance with co-located database (D1 runs in same Cloudflare datacenter as Workers)
- Reduce infrastructure complexity and costs

#### Scenario: Analytics APIs query D1
**Given**: User requests dashboard analytics data
**When**: API handler processes the request
**Then**: System queries D1 database using DAL functions
**And**: Returns business metrics (revenue, quotation counts, etc.)
**And**: Does NOT query Supabase for business data

#### Scenario: Batch operations use D1
**Given**: User performs batch update on quotations
**When**: API handler processes batch request
**Then**: System executes batch operations on D1 database
**And**: All quotation status updates persist to D1
**And**: Does NOT update Supabase quotations table

#### Scenario: Dashboard data consistency
**Given**: User views dashboard showing revenue statistics
**When**: User navigates to quotations list
**Then**: Quotations list shows same data used in dashboard calculations
**And**: No discrepancy between dashboard metrics and actual list data

---

### Requirement: System MUST implement DAL layer for all D1 queries

All D1 database queries MUST be implemented in Data Access Layer (DAL) modules under `lib/dal/`.

**Rationale**:
- Centralize database logic for easier testing and maintenance
- Provide type-safe interfaces for all queries
- Enable future database migrations with minimal code changes

#### Scenario: Analytics queries use DAL
**Given**: New analytics endpoint needs revenue trend data
**When**: Endpoint is implemented
**Then**: Uses `getRevenueTrend()` from `lib/dal/analytics.ts`
**And**: Does NOT write raw SQL in route handler
**And**: DAL function handles all query complexity

#### Scenario: Payments statistics use DAL
**Given**: Payment statistics API needs aggregated data
**When**: API handler processes request
**Then**: Calls `getPaymentStatistics()` from `lib/dal/payments.ts`
**And**: DAL function replaces previous Supabase RPC call
**And**: Returns identical data structure as before

---

## MODIFIED Requirements

### Requirement: API 回應資料格式一致性 (Updated)

All API endpoints MUST return consistent data formats. Business data MUST come from D1; only authentication uses Supabase.

#### Scenario: 成功回應格式 from D1
```gherkin
Given API queries D1 for business data
When 回傳資料到前端
Then response contains data from D1
And format matches existing interface definitions
And no Supabase business data is returned
```

#### Scenario: Mixed auth and data sources
```gherkin
Given API endpoint needs user authentication
When processing request
Then uses Supabase for auth: supabase.auth.getUser()
And uses D1 for business data queries
And both work together seamlessly
```
