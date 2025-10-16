/**
 * PDF 報價單的翻譯文本
 */

import { PDFLanguage } from './types'

export const pdfTranslations: Record<'zh' | 'en', PDFLanguage['translations']> = {
  zh: {
    quotation: '報價單',
    quotationNumber: '報價單號碼',
    issueDate: '發出日期',
    validUntil: '有效期限',
    customer: '客戶',
    customerInfo: '客戶資訊',
    billTo: '帳單收件人',
    itemDescription: '項目說明',
    quantity: '數量',
    unitPrice: '單價',
    discount: '折扣',
    subtotal: '小計',
    tax: '稅金',
    total: '總計',
    notes: '備註',
    status: {
      draft: '草稿',
      sent: '已發送',
      accepted: '已接受',
      rejected: '已拒絕',
    },
    footer: '感謝您的業務',
    page: '第',
    of: '頁，共',
  },
  en: {
    quotation: 'Quotation',
    quotationNumber: 'Quotation Number',
    issueDate: 'Issue Date',
    validUntil: 'Valid Until',
    customer: 'Customer',
    customerInfo: 'Customer Information',
    billTo: 'Bill To',
    itemDescription: 'Item Description',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    discount: 'Discount',
    subtotal: 'Subtotal',
    tax: 'Tax',
    total: 'Total',
    notes: 'Notes',
    status: {
      draft: 'Draft',
      sent: 'Sent',
      accepted: 'Accepted',
      rejected: 'Rejected',
    },
    footer: 'Thank you for your business',
    page: 'Page',
    of: 'of',
  },
}
