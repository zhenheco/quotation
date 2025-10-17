/**
 * 報價單 PDF 模板組件
 * 使用 @react-pdf/renderer 生成雙語 PDF
 */

import React from 'react'
import path from 'path'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import { QuotationPDFData } from './types'
import { pdfTranslations } from './translations'

// 註冊 Noto Sans TC 字體以支援繁體中文
// 使用檔案系統絕對路徑來載入本地字體檔案

Font.register({
  family: 'Noto Sans TC',
  fonts: [
    {
      src: path.join(process.cwd(), 'public', 'fonts', 'NotoSansTC-Regular.ttf'),
      fontWeight: 'normal',
    },
  ],
})

// PDF 樣式定義
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Noto Sans TC',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #2563EB',
    paddingBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  quotationNumber: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  infoSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 3,
    lineHeight: 1.4,
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  customerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  customerBox: {
    width: '48%',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    border: '1 solid #E2E8F0',
  },
  table: {
    marginBottom: 25,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 10,
    fontWeight: 'bold',
    fontSize: 9,
    color: '#334155',
    borderBottom: '1 solid #CBD5E1',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottom: '1 solid #E2E8F0',
    fontSize: 9,
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  colDescription: {
    width: '35%',
    paddingRight: 8,
  },
  colQuantity: {
    width: '12%',
    textAlign: 'center',
  },
  colUnitPrice: {
    width: '18%',
    textAlign: 'right',
  },
  colDiscount: {
    width: '15%',
    textAlign: 'right',
  },
  colSubtotal: {
    width: '20%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  productName: {
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  productDescription: {
    color: '#64748B',
    fontSize: 8,
    // fontStyle: 'italic', // 移除 italic，因為 Noto Sans TC 不支援
  },
  totalsSection: {
    marginLeft: 'auto',
    width: '45%',
    marginTop: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    fontSize: 10,
  },
  totalLabel: {
    color: '#475569',
  },
  totalValue: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  grandTotal: {
    borderTop: '2 solid #2563EB',
    paddingTop: 10,
    marginTop: 8,
    fontSize: 12,
  },
  grandTotalLabel: {
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  grandTotalValue: {
    fontWeight: 'bold',
    color: '#2563EB',
    fontSize: 14,
  },
  notesSection: {
    marginTop: 25,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderLeft: '3 solid #F59E0B',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: '#78350F',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#94A3B8',
    borderTop: '1 solid #E2E8F0',
    paddingTop: 10,
  },
  statusBadge: {
    padding: '6 12',
    borderRadius: 12,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
  },
  statusDraft: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
  },
  statusSent: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  statusAccepted: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
})

interface QuotationPDFTemplateProps {
  data: QuotationPDFData
  locale: 'zh' | 'en'
  showBothLanguages?: boolean
}

/**
 * 報價單 PDF 文檔組件
 */
export const QuotationPDFTemplate: React.FC<QuotationPDFTemplateProps> = ({
  data,
  locale,
  showBothLanguages = false,
}) => {
  const t = pdfTranslations[locale]
  const altLocale = locale === 'zh' ? 'en' : 'zh'
  const tAlt = pdfTranslations[altLocale]

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return locale === 'zh'
      ? date.toLocaleDateString('zh-TW')
      : date.toLocaleDateString('en-US')
  }

  // 格式化金額
  const formatCurrency = (amount: number) => {
    return `${data.quotation.currency} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // 取得狀態樣式
  const getStatusStyle = () => {
    const { status } = data.quotation
    switch (status) {
      case 'draft':
        return styles.statusDraft
      case 'sent':
        return styles.statusSent
      case 'accepted':
        return styles.statusAccepted
      case 'rejected':
        return styles.statusRejected
      default:
        return styles.statusDraft
    }
  }

  // 取得文本（雙語或單語）
  const getText = (primary: string, secondary?: string) => {
    if (showBothLanguages && secondary) {
      return `${primary} / ${secondary}`
    }
    return primary
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 標題與基本資訊 */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>{t.quotation}</Text>
              <Text style={styles.quotationNumber}>
                {t.quotationNumber}: {data.quotation.quotation_number}
              </Text>
            </View>
            <View style={[styles.statusBadge, getStatusStyle()]}>
              <Text>{t.status[data.quotation.status]}</Text>
            </View>
          </View>
        </View>

        {/* 日期資訊 */}
        <View style={styles.headerRow}>
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>{t.issueDate}:</Text>{' '}
              {formatDate(data.quotation.issue_date)}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>{t.validUntil}:</Text>{' '}
              {formatDate(data.quotation.valid_until)}
            </Text>
          </View>
        </View>

        {/* 客戶資訊 */}
        <View style={styles.customerSection}>
          <View style={styles.customerBox}>
            <Text style={styles.sectionTitle}>{t.billTo}</Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>
                {getText(
                  data.customer.name[locale],
                  showBothLanguages ? data.customer.name[altLocale] : undefined
                )}
              </Text>
            </Text>
            <Text style={styles.infoText}>{data.customer.email}</Text>
            {data.customer.phone && (
              <Text style={styles.infoText}>{data.customer.phone}</Text>
            )}
            {data.customer.address && (
              <Text style={styles.infoText}>
                {getText(
                  data.customer.address[locale],
                  showBothLanguages ? data.customer.address[altLocale] : undefined
                )}
              </Text>
            )}
          </View>

          {/* 公司資訊（如果有） */}
          {data.company && (
            <View style={styles.customerBox}>
              <Text style={styles.sectionTitle}>From</Text>
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>
                  {getText(
                    data.company.name[locale],
                    showBothLanguages ? data.company.name[altLocale] : undefined
                  )}
                </Text>
              </Text>
              {data.company.email && (
                <Text style={styles.infoText}>{data.company.email}</Text>
              )}
              {data.company.phone && (
                <Text style={styles.infoText}>{data.company.phone}</Text>
              )}
              {data.company.address && (
                <Text style={styles.infoText}>
                  {getText(
                    data.company.address[locale],
                    showBothLanguages ? data.company.address[altLocale] : undefined
                  )}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* 項目表格 */}
        <View style={styles.table}>
          {/* 表頭 */}
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>{t.itemDescription}</Text>
            <Text style={styles.colQuantity}>{t.quantity}</Text>
            <Text style={styles.colUnitPrice}>{t.unitPrice}</Text>
            <Text style={styles.colDiscount}>{t.discount}</Text>
            <Text style={styles.colSubtotal}>{t.subtotal}</Text>
          </View>

          {/* 項目行 */}
          {data.items.map((item, index) => (
            <View
              key={item.id}
              style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
            >
              <View style={styles.colDescription}>
                <Text style={styles.productName}>
                  {getText(
                    item.product.name[locale],
                    showBothLanguages ? item.product.name[altLocale] : undefined
                  )}
                </Text>
                {item.product.description && (
                  <Text style={styles.productDescription}>
                    {getText(
                      item.product.description[locale],
                      showBothLanguages
                        ? item.product.description[altLocale]
                        : undefined
                    )}
                  </Text>
                )}
              </View>
              <Text style={styles.colQuantity}>{item.quantity}</Text>
              <Text style={styles.colUnitPrice}>
                {formatCurrency(item.unit_price)}
              </Text>
              <Text style={styles.colDiscount}>
                {item.discount > 0 ? formatCurrency(item.discount) : '-'}
              </Text>
              <Text style={styles.colSubtotal}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        {/* 總計區域 */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t.subtotal}:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.quotation.subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {t.tax} ({data.quotation.tax_rate}%):
            </Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.quotation.tax_amount)}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>{t.total}:</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(data.quotation.total_amount)}
            </Text>
          </View>
        </View>

        {/* 備註 */}
        {data.quotation.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>{t.notes}</Text>
            <Text style={styles.notesText}>
              {getText(
                data.quotation.notes[locale],
                showBothLanguages ? data.quotation.notes[altLocale] : undefined
              )}
            </Text>
          </View>
        )}

        {/* 頁尾 */}
        <View style={styles.footer}>
          <Text>{t.footer}</Text>
        </View>
      </Page>
    </Document>
  )
}
