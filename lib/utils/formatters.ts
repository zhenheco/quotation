/**
 * 安全的數值格式化工具
 * 處理 undefined、null、NaN 等邊緣情況
 */

/**
 * 安全的 toLocaleString 包裝函數
 * @param value - 要格式化的數值（可能為 undefined 或 null）
 * @param options - Intl.NumberFormat 選項
 * @returns 格式化後的字串，預設使用 zh-TW 語系
 */
export function safeToLocaleString(
  value: number | undefined | null,
  options?: Intl.NumberFormatOptions
): string {
  const validValue = value ?? 0;
  if (!isFinite(validValue)) return '0';
  return validValue.toLocaleString('zh-TW', options);
}

/**
 * 格式化金額（根據貨幣決定是否顯示小數）
 * TWD 顯示整數，其他貨幣保留 2 位小數
 * @param value - 金額（可能為 undefined 或 null）
 * @param currency - 貨幣代碼
 * @returns 格式化後的金額字串
 */
export function formatAmount(
  value: number | undefined | null,
  currency: string = 'TWD'
): string {
  const validValue = value ?? 0;
  if (!isFinite(validValue)) return '0';

  if (currency === 'TWD') {
    return Math.round(validValue).toLocaleString('zh-TW', { maximumFractionDigits: 0 });
  }
  return validValue.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 格式化貨幣金額
 * @param amount - 金額（可能為 undefined 或 null）
 * @param currency - 貨幣代碼（預設為 TWD）
 * @returns 格式化後的貨幣字串，如 "TWD 1,234"
 */
export function formatCurrency(
  amount: number | undefined | null,
  currency: string = 'TWD'
): string {
  const validAmount = amount ?? 0;
  return `${currency} ${safeToLocaleString(validAmount)}`;
}

/**
 * 格式化百分比
 * @param value - 百分比數值（可能為 undefined 或 null）
 * @param decimals - 小數位數（預設為 1）
 * @returns 格式化後的百分比字串，如 "12.3%"
 */
export function formatPercentage(
  value: number | undefined | null,
  decimals: number = 1
): string {
  const validValue = value ?? 0;
  if (!isFinite(validValue)) return '0%';
  return `${validValue.toFixed(decimals)}%`;
}
