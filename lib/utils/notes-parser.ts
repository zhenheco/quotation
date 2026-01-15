/**
 * 備註解析工具函數
 * 處理各種格式的備註資料，統一輸出為可顯示的字串
 */

type BilingualNotes = {
  zh?: string
  en?: string
}

/**
 * 解析備註資料，處理 JSON 字串化和換行符問題
 *
 * @param notes - 備註資料，可能是：
 *   - null/undefined
 *   - 純字串
 *   - JSON 字串 (例如 '{"zh":"內容","en":"content"}')
 *   - 物件 (例如 { zh: "內容", en: "content" })
 * @returns 解析後的中文備註字串，換行符已正確處理
 *
 * @example
 * parseNotes(null) // ""
 * parseNotes("備註") // "備註"
 * parseNotes('{"zh":"備註"}') // "備註"
 * parseNotes({ zh: "備註" }) // "備註"
 * parseNotes("第一行\\n第二行") // "第一行\n第二行"
 */
export function parseNotes(notes: unknown): string {
  // 處理空值
  if (notes === null || notes === undefined) {
    return ''
  }

  // 處理字串
  if (typeof notes === 'string') {
    if (!notes) return ''

    // 嘗試解析 JSON
    if (notes.startsWith('{') && notes.endsWith('}')) {
      try {
        const parsed = JSON.parse(notes) as BilingualNotes
        if (typeof parsed === 'object' && parsed !== null && 'zh' in parsed && parsed.zh) {
          return normalizeNewlines(parsed.zh)
        }
        // 解析成功但沒有 zh 欄位，返回原始字串
        return notes
      } catch {
        // JSON 解析失敗，當作普通字串處理
        return normalizeNewlines(notes)
      }
    }

    // 普通字串，處理換行符
    return normalizeNewlines(notes)
  }

  // 處理物件
  if (typeof notes === 'object' && notes !== null) {
    // 排除陣列
    if (Array.isArray(notes)) {
      return ''
    }

    const notesObj = notes as BilingualNotes
    if ('zh' in notesObj && typeof notesObj.zh === 'string') {
      return normalizeNewlines(notesObj.zh)
    }

    return ''
  }

  // 處理其他類型（數字、布林等）
  return String(notes)
}

/**
 * 將跳脫的換行符 \\n 轉換為實際換行符 \n
 */
function normalizeNewlines(str: string): string {
  // 先處理雙重跳脫 \\n -> \n
  return str.replace(/\\n/g, '\n')
}
