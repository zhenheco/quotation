/**
 * API 回應格式遷移腳本
 * 
 * 這個腳本會掃描所有 API 路由並識別需要更新的錯誤回應格式
 * 並提供建議的修改方式
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

interface ApiIssue {
  file: string
  line: number
  issue: string
  suggestion: string
}

/**
 * 掃描 API 文件中的問題
 */
function scanApiFile(filePath: string): ApiIssue[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const issues: ApiIssue[] = []

  lines.forEach((line, index) => {
    const lineNumber = index + 1

    // 檢查不一致的錯誤回應格式
    if (line.includes('NextResponse.json') && line.includes('error:')) {
      // 檢查是否沒有使用 success: false
      if (!line.includes('success:')) {
        issues.push({
          file: filePath,
          line: lineNumber,
          issue: 'Inconsistent error response format - missing success field',
          suggestion: 'Use createErrorResponse() from @/lib/api/response-utils'
        })
      }
    }

    // 檢查直接使用 NextResponse.json 而不是統一工具
    if (line.includes('NextResponse.json') && !line.includes('createErrorResponse') && !line.includes('createSuccessResponse')) {
      // 跳過已經有 success 欄位的回應
      if (!line.includes('success:')) {
        issues.push({
          file: filePath,
          line: lineNumber,
          issue: 'Using NextResponse.json directly without security headers',
          suggestion: 'Use createSuccessResponse() or createErrorResponse() for automatic security headers'
        })
      }
    }

    // 檢查常見的錯誤回應模式
    const errorPatterns = [
      { pattern: /error.*Unauthorized/, suggestion: "Use ErrorResponses.unauthorized()" },
      { pattern: /error.*[Ff]orbidden|Access denied/, suggestion: "Use ErrorResponses.forbidden()" },
      { pattern: /error.*not found/, suggestion: "Use ErrorResponses.notFound()" },
      { pattern: /error.*[Ii]nvalid.*request/, suggestion: "Use ErrorResponses.badRequest()" },
      { pattern: /error.*[Ii]nvalid.*input/, suggestion: "Use ErrorResponses.invalidInput()" },
    ]

    errorPatterns.forEach(({ pattern, suggestion }) => {
      if (pattern.test(line)) {
        issues.push({
          file: filePath,
          line: lineNumber,
          issue: 'Could use standardized error response',
          suggestion: suggestion
        })
      }
    })
  })

  return issues
}

/**
 * 主函數
 */
async function main() {
  console.log('🔍 Scanning API routes for response format issues...\n')

  // 找出所有 API 路由文件
  const apiFiles = glob.sync('app/api/**/route.ts', {
    cwd: process.cwd(),
    absolute: true
  })

  let totalIssues = 0

  for (const file of apiFiles) {
    const issues = scanApiFile(file)
    
    if (issues.length > 0) {
      const relativePath = path.relative(process.cwd(), file)
      console.log(`📁 ${relativePath}`)
      
      issues.forEach(issue => {
        console.log(`   ⚠️  Line ${issue.line}: ${issue.issue}`)
        console.log(`      💡 ${issue.suggestion}`)
        console.log('')
      })
      
      totalIssues += issues.length
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Total files scanned: ${apiFiles.length}`)
  console.log(`   Total issues found: ${totalIssues}`)

  if (totalIssues > 0) {
    console.log(`\n🔧 Next steps:`)
    console.log(`1. Import response utilities in affected files:`)
    console.log(`   import { createErrorResponse, createSuccessResponse, ErrorResponses } from '@/lib/api/response-utils'`)
    console.log(`2. Replace direct NextResponse.json calls with utility functions`)
    console.log(`3. Run this script again to verify fixes`)
  } else {
    console.log(`\n✅ All API routes are using consistent response formats!`)
  }
}

// 如果直接執行這個腳本
if (require.main === module) {
  main().catch(console.error)
}

export { scanApiFile, main }