import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateQuotationPDF } from '@/lib/pdf/generator'
import JSZip from 'jszip'
import { batchRateLimiter } from '@/lib/middleware/rate-limiter'

export async function POST(request: NextRequest) {
  return batchRateLimiter(request, async () => {
    try {
    const supabase = await createClient()

    // 驗證用戶
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 獲取要匯出的報價單 IDs 和語言
    const { ids, locale = 'zh' } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids array required' },
        { status: 400 }
      )
    }

    if (ids.length > 20) {
      return NextResponse.json(
        { error: 'Too many quotations. Maximum 20 quotations per export.' },
        { status: 400 }
      )
    }

    // 獲取所有報價單詳細資料
    const { data: quotations, error: fetchError } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone,
          address
        )
      `)
      .eq('user_id', user.id)
      .in('id', ids)

    if (fetchError) {
      console.error('Error fetching quotations:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch quotations' },
        { status: 500 }
      )
    }

    if (!quotations || quotations.length !== ids.length) {
      return NextResponse.json(
        { error: 'Some quotations not found or unauthorized' },
        { status: 403 }
      )
    }

    // 為每個報價單生成 PDF
    const zip = new JSZip()
    const errors: string[] = []

    for (const quotation of quotations) {
      try {
        // 獲取報價單項目
        const { data: items } = await supabase
          .from('quotation_items')
          .select(`
            *,
            products (
              id,
              name,
              description,
              price,
              currency
            )
          `)
          .eq('quotation_id', quotation.id)
          .order('id')

        // 生成 PDF
        const pdfBlob = await generateQuotationPDF({
          quotation,
          items: items || [],
          locale: locale as 'zh' | 'en'
        })

        // 將 PDF 添加到 ZIP
        const filename = `${quotation.quotation_number}_${locale}.pdf`
        zip.file(filename, pdfBlob)
      } catch (error) {
        console.error(`Error generating PDF for quotation ${quotation.quotation_number}:`, error)
        errors.push(quotation.quotation_number)
      }
    }

    if (errors.length === quotations.length) {
      return NextResponse.json(
        { error: 'Failed to generate any PDFs' },
        { status: 500 }
      )
    }

    // 生成 ZIP 文件
    const zipBlob = await zip.generateAsync({ type: 'blob' })

    // 返回 ZIP 文件
    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="quotations_${new Date().toISOString().split('T')[0]}.zip"`
      }
    })
  } catch (error) {
    console.error('Batch export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  })
}