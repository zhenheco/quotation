# quotations-batch-operations Spec (NEW CAPABILITY)

## Purpose
支援報價單批次操作（批次更新狀態、批次刪除），使用 Cloudflare D1 資料庫執行批次作業，提供使用者高效管理多個報價單的能力。

## ADDED Requirements

### Requirement: System SHALL support batch status updates on D1

System MUST allow users to update status of multiple quotations in a single API call, persisting changes to D1.

#### Scenario: Batch update quotation status
**Given**: User selects 5 quotations with status "draft"
**When**: User clicks "Mark as Sent" for selected items
**Then**: Frontend calls POST /api/quotations/batch/status with {ids: [...], status: "sent"}
**And**: API uses `batchUpdateQuotationStatus(db, userId, ids, status)` DAL function
**And**: D1 updates all 5 quotations to "sent" status in single transaction
**And**: Returns {updatedCount: 5}
**And**: Frontend refreshes quotations list

---

### Requirement: System SHALL support batch delete on D1

System MUST allow users to delete multiple quotations, including their quotation_items, in a single operation.

#### Scenario: Batch delete quotations
**Given**: User selects 3 quotations to delete
**When**: User confirms batch delete action
**Then**: Frontend calls POST /api/quotations/batch/delete with {ids: [...]}
**And**: API uses `batchDeleteQuotations(db, userId, ids)` DAL function
**And**: D1 deletes quotation_items for all 3 quotations
**And**: D1 deletes all 3 quotations in single transaction
**And**: Returns {deletedCount: 3}
**And**: Frontend removes items from list

---

### Requirement: Batch operations MUST verify ownership

All batch operations MUST verify that all target quotations belong to the requesting user before proceeding.

#### Scenario: Prevent unauthorized batch update
**Given**: User A attempts batch update on quotations including one owned by User B
**When**: API validates ownership
**Then**: DAL function checks all quotation IDs against user_id
**And**: Finds mismatch (one quotation owned by User B)
**And**: API returns 403 Forbidden
**And**: No quotations are updated

#### Scenario: Successful batch operation after ownership check
**Given**: User A owns all 5 selected quotations
**When**: Batch delete is requested
**Then**: DAL verifies all IDs belong to User A
**And**: Proceeds with deletion in D1
**And**: All 5 quotations and their items are removed
**And**: Returns success response
