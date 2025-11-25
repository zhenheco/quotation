'use client'
/* eslint-disable jsx-a11y/alt-text */

import { Document, Page, View, Text, Image } from '@react-pdf/renderer'
import type { PDFDocumentProps } from '../types'
import { createPDFStyles } from '../styles'

interface QuotationPDFDocumentProps extends PDFDocumentProps {
  title?: string
}

export function QuotationPDFDocument({
  quotation,
  company,
  locale,
  title,
}: QuotationPDFDocumentProps) {
  const styles = createPDFStyles(company.brand_colors)
  const showZh = locale === 'zh' || locale === 'both'

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(showZh ? 'zh-TW' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (showZh) {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    }
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const getLocalizedCompanyName = () => {
    if (locale === 'both') return `${company.name.zh}\n${company.name.en}`
    return showZh ? company.name.zh : company.name.en
  }

  const getLocalizedAddress = () => {
    if (!company.address) return null
    if (locale === 'both') return `${company.address.zh}\n${company.address.en}`
    return showZh ? company.address.zh : company.address.en
  }

  const getLocalizedDescription = (item: { description: { zh: string; en: string } }) => {
    if (locale === 'both') return `${item.description.zh}\n${item.description.en}`
    return showZh ? item.description.zh : item.description.en
  }

  const getLocalizedNotes = () => {
    if (!quotation.notes) return null
    if (locale === 'both') return `${quotation.notes.zh}\n${quotation.notes.en}`
    return showZh ? quotation.notes.zh : quotation.notes.en
  }

  const documentTitle = title || (showZh ? '報價單' : 'Quotation')

  const labels = {
    quotationNumber: showZh ? '報價單編號' : 'Quotation No.',
    issueDate: showZh ? '開立日期' : 'Issue Date',
    validUntil: showZh ? '有效期限' : 'Valid Until',
    currency: showZh ? '幣別' : 'Currency',
    contact: showZh ? '聯絡人' : 'Contact',
    tel: showZh ? '電話' : 'Tel',
    email: showZh ? '信箱' : 'Email',
    address: showZh ? '地址' : 'Address',
    taxId: showZh ? '統編' : 'Tax ID',
    description: showZh ? '品項說明' : 'Description',
    qty: showZh ? '數量' : 'Qty',
    unitPrice: showZh ? '單價' : 'Unit Price',
    discount: showZh ? '折扣' : 'Discount',
    subtotal: showZh ? '小計' : 'Subtotal',
    tax: showZh ? '稅金' : 'Tax',
    total: showZh ? '總計' : 'Total',
    paymentInfo: showZh ? '付款資訊' : 'Payment Information',
    paymentMethod: showZh ? '付款方式' : 'Method',
    bank: showZh ? '銀行名稱' : 'Bank',
    bankCode: showZh ? '銀行代碼' : 'Bank Code',
    account: showZh ? '帳號' : 'Account',
    paymentNotes: showZh ? '備註' : 'Notes',
    notes: showZh ? '備註' : 'Notes',
    companySignature: showZh ? '公司簽章' : 'Company Signature',
    customerSignature: showZh ? '客戶簽章' : 'Customer Signature',
    date: showZh ? '日期' : 'Date',
    thankYou: showZh ? '感謝您的惠顧！' : 'Thank you for your business!',
  }

  const hasPaymentInfo = company.bank_name || company.bank_account || quotation.payment_method

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {company.logo_url && (
            <Image src={company.logo_url} style={styles.logo} />
          )}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{getLocalizedCompanyName()}</Text>
            {company.tax_id && (
              <Text style={styles.companyDetail}>
                {showZh ? '統一編號：' : 'Tax ID: '}{company.tax_id}
              </Text>
            )}
            {company.address && (
              <Text style={styles.companyDetail}>{getLocalizedAddress()}</Text>
            )}
            {company.phone && (
              <Text style={styles.companyDetail}>{labels.tel}: {company.phone}</Text>
            )}
            {company.email && (
              <Text style={styles.companyDetail}>{labels.email}: {company.email}</Text>
            )}
            {company.website && (
              <Text style={styles.companyDetail}>{company.website}</Text>
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{documentTitle}</Text>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <View style={styles.customerBox}>
              <Text style={styles.customerName}>{quotation.customer.name}</Text>
              {quotation.customer.contact_person && (
                <Text style={styles.infoValue}>{labels.contact}: {quotation.customer.contact_person}</Text>
              )}
              {quotation.customer.phone && (
                <Text style={styles.infoValue}>{labels.tel}: {quotation.customer.phone}</Text>
              )}
              {quotation.customer.email && (
                <Text style={styles.infoValue}>{labels.email}: {quotation.customer.email}</Text>
              )}
              {quotation.customer.address && (
                <Text style={styles.infoValue}>{labels.address}: {quotation.customer.address}</Text>
              )}
              {quotation.customer.tax_id && (
                <Text style={styles.infoValue}>{labels.taxId}: {quotation.customer.tax_id}</Text>
              )}
            </View>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>{labels.quotationNumber}</Text>
            <Text style={styles.infoValue}>{quotation.quotation_number}</Text>
            <Text style={styles.infoLabel}>{labels.issueDate}</Text>
            <Text style={styles.infoValue}>{formatDate(quotation.issue_date)}</Text>
            <Text style={styles.infoLabel}>{labels.validUntil}</Text>
            <Text style={styles.infoValue}>{formatDate(quotation.valid_until)}</Text>
            <Text style={styles.infoLabel}>{labels.currency}</Text>
            <Text style={styles.infoValue}>{quotation.currency}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>{labels.description}</Text>
            <Text style={styles.colQuantity}>{labels.qty}</Text>
            <Text style={styles.colUnitPrice}>{labels.unitPrice}</Text>
            <Text style={styles.colDiscount}>{labels.discount}</Text>
            <Text style={styles.colSubtotal}>{labels.subtotal}</Text>
          </View>
          {quotation.items.map((item, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.colDescription}>{getLocalizedDescription(item)}</Text>
              <Text style={styles.colQuantity}>{item.quantity}</Text>
              <Text style={styles.colUnitPrice}>{quotation.currency} {formatAmount(item.unit_price)}</Text>
              <Text style={styles.colDiscount}>{item.discount > 0 ? `${item.discount}%` : '-'}</Text>
              <Text style={styles.colSubtotal}>{quotation.currency} {formatAmount(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{labels.subtotal}</Text>
            <Text style={styles.summaryValue}>{quotation.currency} {formatAmount(quotation.subtotal)}</Text>
          </View>
          {quotation.tax_rate > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{labels.tax} ({quotation.tax_rate}%)</Text>
              <Text style={styles.summaryValue}>{quotation.currency} {formatAmount(quotation.tax_amount)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{labels.total}</Text>
            <Text style={styles.totalValue}>{quotation.currency} {formatAmount(quotation.total_amount)}</Text>
          </View>
        </View>

        {/* Payment Info */}
        {hasPaymentInfo && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>{labels.paymentInfo}</Text>
            {quotation.payment_method && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{labels.paymentMethod}</Text>
                <Text style={styles.paymentValue}>{quotation.payment_method}</Text>
              </View>
            )}
            {company.bank_name && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{labels.bank}</Text>
                <Text style={styles.paymentValue}>{company.bank_name}</Text>
              </View>
            )}
            {company.bank_code && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{labels.bankCode}</Text>
                <Text style={styles.paymentValue}>{company.bank_code}</Text>
              </View>
            )}
            {company.bank_account && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{labels.account}</Text>
                <Text style={styles.paymentValue}>{company.bank_account}</Text>
              </View>
            )}
            {quotation.payment_notes && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{labels.paymentNotes}</Text>
                <Text style={styles.paymentValue}>{quotation.payment_notes}</Text>
              </View>
            )}
            {company.passbook_url && (
              <Image src={company.passbook_url} style={styles.passbookImage} />
            )}
          </View>
        )}

        {/* Notes */}
        {quotation.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>{labels.notes}</Text>
            <Text style={styles.notesText}>{getLocalizedNotes()}</Text>
          </View>
        )}

        {/* Signature */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            {company.signature_url && (
              <Image src={company.signature_url} style={styles.signatureImage} />
            )}
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{labels.companySignature}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{labels.customerSignature}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{labels.thankYou}</Text>
          {company.website && <Text>{company.website}</Text>}
          <Text render={({ pageNumber, totalPages }) =>
            showZh ? `第 ${pageNumber} 頁，共 ${totalPages} 頁` : `Page ${pageNumber} of ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}
