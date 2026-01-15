/**
 * 利潤率計算工具函數
 * 提供毛利率和成本加成率的計算功能
 */

/**
 * 四捨五入到兩位小數
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * 計算毛利率 (Gross Margin)
 * 公式：(售價 - 成本) / 售價 × 100%
 *
 * @param cost - 成本
 * @param sellingPrice - 售價
 * @returns 毛利率百分比（例如 33.33 表示 33.33%）
 *
 * @example
 * calculateGrossMargin(100, 150) // 33.33
 * calculateGrossMargin(100, 200) // 50
 */
export function calculateGrossMargin(cost: number, sellingPrice: number): number {
  // 售價為 0 時，毛利率為 0
  if (sellingPrice === 0) {
    return 0
  }

  // 成本為 0 時，毛利率為 100%
  if (cost === 0) {
    return 100
  }

  const margin = ((sellingPrice - cost) / sellingPrice) * 100
  return roundToTwoDecimals(margin)
}

/**
 * 計算成本加成率 (Markup)
 * 公式：(售價 - 成本) / 成本 × 100%
 *
 * @param cost - 成本
 * @param sellingPrice - 售價
 * @returns 成本加成率百分比（例如 50 表示 50%）
 *
 * @example
 * calculateMarkup(100, 150) // 50
 * calculateMarkup(100, 200) // 100
 */
export function calculateMarkup(cost: number, sellingPrice: number): number {
  // 成本為 0 時，無法計算加成率
  if (cost === 0) {
    return 0
  }

  const markup = ((sellingPrice - cost) / cost) * 100
  return roundToTwoDecimals(markup)
}

/**
 * 從毛利率計算售價
 * 公式：售價 = 成本 / (1 - 毛利率/100)
 *
 * @param cost - 成本
 * @param grossMargin - 毛利率百分比
 * @returns 計算出的售價
 *
 * @example
 * calculateSellingPriceFromMargin(100, 50) // 200
 * calculateSellingPriceFromMargin(100, 33.33) // ~150
 */
export function calculateSellingPriceFromMargin(cost: number, grossMargin: number): number {
  // 毛利率 100% 時會導致除以零
  if (grossMargin >= 100) {
    return 0
  }

  // 毛利率 0% 時，售價等於成本
  if (grossMargin === 0) {
    return cost
  }

  const sellingPrice = cost / (1 - grossMargin / 100)
  return roundToTwoDecimals(sellingPrice)
}

/**
 * 從成本加成率計算售價
 * 公式：售價 = 成本 × (1 + 加成率/100)
 *
 * @param cost - 成本
 * @param markup - 成本加成率百分比
 * @returns 計算出的售價
 *
 * @example
 * calculateSellingPriceFromMarkup(100, 50) // 150
 * calculateSellingPriceFromMarkup(100, 100) // 200
 */
export function calculateSellingPriceFromMarkup(cost: number, markup: number): number {
  const sellingPrice = cost * (1 + markup / 100)
  return roundToTwoDecimals(sellingPrice)
}
