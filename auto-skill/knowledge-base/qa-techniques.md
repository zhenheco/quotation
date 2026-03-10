# 測試手法與盲點知識庫

> 上次更新：2026-03-10
> 來源：destructive-qa skill 自動進化

---

## 🎯 Invalid Date 傳入測試
**日期：** 2026-03-10
**有效性：** 高
**適用場景：** 任何使用 `new Date(str)` 解析用戶輸入或外部資料的函數
**操作方式：**
- 傳入空字串 `""`
- 傳入無效格式 `"invalid-date"`, `"abc"`, `"2026-13-01"`
- 傳入 `undefined` / `null`（若 TypeScript 允許）
**為什麼有效：** `new Date("invalid")` 不拋錯，回傳 Invalid Date 物件。後續 `getFullYear()` 等方法回傳 `NaN`，在字串拼接中產生 `"NaN"` 造成長度異常。
**實際案例：** Z-quotation-system 媒體申報檔，Invalid Date 導致年月欄位從 5 位變 6 位 ("NaNNaN")，破壞 81 bytes 固定長度記錄。
**keywords：** date, validation, NaN, fixed-length, format

---

## 🎯 數字超過固定寬度欄位測試
**日期：** 2026-03-10
**有效性：** 高
**適用場景：** 使用 `padStart` 補零的固定寬度數字欄位（金額、流水號、序號）
**操作方式：**
- 傳入超過欄位寬度的數字（12 位欄位傳 13 位數字）
- 傳入邊界值（欄位上限 + 1）
- 傳入負數（看是否正確取絕對值）
**為什麼有效：** `String(n).padStart(width, '0')` 在數字已超過寬度時不會截斷，只會回傳原始長度字串。
**實際案例：** Z-quotation-system padNumber(9999999999999, 12) 回傳 13 位字串，破壞固定長度記錄。
**keywords：** overflow, padStart, fixed-width, truncation, boundary

---

## 🎯 固定長度格式的位元位置逐一驗證
**日期：** 2026-03-10
**有效性：** 高
**適用場景：** 政府/金融系統的固定長度報表檔案（如 TXT 媒體申報檔、EDI 電文）
**操作方式：**
- 對每個指標欄位（flag fields）寫獨立測試，驗證具體 index 的字元值
- 用不同狀態的資料（彙總/逐筆、零稅率/應稅）驗證 flag 位置
- 對照官方法規逐欄位驗證
**為什麼有效：** 固定長度格式中任何欄位的偏移都會導致後續欄位全部錯位，而且錯誤不會在 JS 層面報錯。
**實際案例：** Z-quotation-system 媒體檔遺漏「特種稅額稅率」欄位導致位置 74-76 全部偏移 1 位。
**keywords：** fixed-length, byte-position, offset, government-format, flag-fields

---

## 🔍 盲點：日期字串的 falsy 判斷不等於有效日期
**日期：** 2026-03-10
**發現方式：** `"invalid-date"` 是 truthy 字串，通過了 `if (invoice.date)` 檢查但 `new Date()` 產生 Invalid Date
**根因：** 開發者常用 `if (str)` 判斷字串是否可用，但 truthy 不代表是合法日期
**對策：** 對所有 Date 解析結果加 `isNaN(date.getTime())` 檢查
**適用場景：** 任何從外部資料（DB、API、用戶輸入）解析日期的場景
