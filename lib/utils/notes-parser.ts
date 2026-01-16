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
 *   - 雙重 JSON 字串 (例如 '"{\"zh\":\"內容\"}"')
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

    // 嘗試解析 JSON（可能需要多次解析處理雙重序列化）
    let current: unknown = notes
    let maxAttempts = 3 // 防止無限迴圈

    while (typeof current === 'string' && maxAttempts > 0) {
      // 檢查是否是 JSON 物件格式
      if (current.startsWith('{') && current.endsWith('}')) {
        try {
          current = JSON.parse(current)
        } catch {
          break // JSON 解析失敗，停止嘗試
        }
      } else if (current.startsWith('"') && current.endsWith('"')) {
        // 處理被額外引號包裹的字串
        try {
          current = JSON.parse(current)
        } catch {
          break
        }
      } else {
        break // 不是 JSON 格式，停止嘗試
      }
      maxAttempts--
    }

    // 如果解析結果是物件，提取 zh 欄位
    if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
      const obj = current as BilingualNotes
      if ('zh' in obj && typeof obj.zh === 'string') {
        return normalizeNewlines(obj.zh)
      }
      if ('en' in obj && typeof obj.en === 'string') {
        return normalizeNewlines(obj.en)
      }
    }

    // 如果還是字串，處理換行符
    if (typeof current === 'string') {
      return normalizeNewlines(current)
    }

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
    if ('en' in notesObj && typeof notesObj.en === 'string') {
      return normalizeNewlines(notesObj.en)
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
