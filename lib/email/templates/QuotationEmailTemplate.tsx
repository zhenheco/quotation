import * as React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Link,
  Hr,
  Button,
  Img,
  Preview,
} from '@react-email/components'

interface QuotationEmailTemplateProps {
  locale: 'zh' | 'en'
  recipientName: string
  recipientEmail: string
  quotationNumber: string
  issueDate: string
  validUntil: string
  currency: string
  items: Array<{
    name: string
    description?: string
    quantity: number
    unitPrice: number
    discount: number
    subtotal: number
  }>
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  notes?: string
  companyName: string
  senderName: string
  senderEmail: string
  viewUrl: string
  downloadUrl: string
}

// 翻譯文本
const translations = {
  zh: {
    subject: '報價單',
    preview: '您有一份新的報價單',
    greeting: '您好',
    intro: '請查收我們為您準備的報價單。',
    quotationNumber: '報價單編號',
    issueDate: '開立日期',
    validUntil: '有效期限',
    currency: '幣別',
    itemsTitle: '報價項目',
    product: '產品/服務',
    quantity: '數量',
    unitPrice: '單價',
    discount: '折扣',
    subtotal: '小計',
    tax: '稅金',
    total: '總計',
    notes: '備註',
    viewButton: '線上查看',
    downloadButton: '下載 PDF',
    footer: '此郵件由系統自動發送，請勿直接回覆。如有任何問題，請聯繫：',
    thanks: '感謝您的支持！',
    bestRegards: '祝好',
  },
  en: {
    subject: 'Quotation',
    preview: 'You have a new quotation',
    greeting: 'Dear',
    intro: 'Please find your quotation below.',
    quotationNumber: 'Quotation Number',
    issueDate: 'Issue Date',
    validUntil: 'Valid Until',
    currency: 'Currency',
    itemsTitle: 'Quotation Items',
    product: 'Product/Service',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    discount: 'Discount',
    subtotal: 'Subtotal',
    tax: 'Tax',
    total: 'Total',
    notes: 'Notes',
    viewButton: 'View Online',
    downloadButton: 'Download PDF',
    footer: 'This is an automated email. Please do not reply. For any questions, contact:',
    thanks: 'Thank you for your business!',
    bestRegards: 'Best regards',
  },
}

const QuotationEmailTemplate: React.FC<QuotationEmailTemplateProps> = ({
  locale,
  recipientName,
  recipientEmail,
  quotationNumber,
  issueDate,
  validUntil,
  currency,
  items,
  subtotal,
  taxRate,
  taxAmount,
  totalAmount,
  notes,
  companyName,
  senderName,
  senderEmail,
  viewUrl,
  downloadUrl,
}) => {
  const t = translations[locale]

  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toLocaleString(locale === 'zh' ? 'zh-TW' : 'en-US')}`
  }

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={companyTitle}>{companyName}</Text>
            <Text style={quotationTitle}>{t.subject}</Text>
          </Section>

          {/* Greeting */}
          <Section style={content}>
            <Text style={greeting}>
              {t.greeting} {recipientName},
            </Text>
            <Text style={paragraph}>{t.intro}</Text>
          </Section>

          {/* Quotation Details */}
          <Section style={detailsSection}>
            <Row>
              <Column style={detailColumn}>
                <Text style={detailLabel}>{t.quotationNumber}</Text>
                <Text style={detailValue}>{quotationNumber}</Text>
              </Column>
              <Column style={detailColumn}>
                <Text style={detailLabel}>{t.issueDate}</Text>
                <Text style={detailValue}>{issueDate}</Text>
              </Column>
            </Row>
            <Row>
              <Column style={detailColumn}>
                <Text style={detailLabel}>{t.validUntil}</Text>
                <Text style={detailValue}>{validUntil}</Text>
              </Column>
              <Column style={detailColumn}>
                <Text style={detailLabel}>{t.currency}</Text>
                <Text style={detailValue}>{currency}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Items Table */}
          <Section style={content}>
            <Text style={sectionTitle}>{t.itemsTitle}</Text>
            <table style={itemsTable}>
              <thead>
                <tr>
                  <th style={tableHeader}>{t.product}</th>
                  <th style={tableHeaderRight}>{t.quantity}</th>
                  <th style={tableHeaderRight}>{t.unitPrice}</th>
                  <th style={tableHeaderRight}>{t.discount}</th>
                  <th style={tableHeaderRight}>{t.subtotal}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td style={tableCell}>
                      <Text style={itemName}>{item.name}</Text>
                      {item.description && (
                        <Text style={itemDescription}>{item.description}</Text>
                      )}
                    </td>
                    <td style={tableCellRight}>{item.quantity}</td>
                    <td style={tableCellRight}>{formatCurrency(item.unitPrice)}</td>
                    <td style={tableCellRight}>
                      {item.discount > 0 ? formatCurrency(item.discount) : '-'}
                    </td>
                    <td style={tableCellRight}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* Totals */}
          <Section style={totalsSection}>
            <Row>
              <Column style={totalLabelColumn}>
                <Text style={totalLabel}>{t.subtotal}:</Text>
              </Column>
              <Column style={totalValueColumn}>
                <Text style={totalValue}>{formatCurrency(subtotal)}</Text>
              </Column>
            </Row>
            <Row>
              <Column style={totalLabelColumn}>
                <Text style={totalLabel}>
                  {t.tax} ({taxRate}%):
                </Text>
              </Column>
              <Column style={totalValueColumn}>
                <Text style={totalValue}>{formatCurrency(taxAmount)}</Text>
              </Column>
            </Row>
            <Hr style={totalDivider} />
            <Row>
              <Column style={totalLabelColumn}>
                <Text style={grandTotalLabel}>{t.total}:</Text>
              </Column>
              <Column style={totalValueColumn}>
                <Text style={grandTotalValue}>{formatCurrency(totalAmount)}</Text>
              </Column>
            </Row>
          </Section>

          {/* Notes */}
          {notes && (
            <Section style={content}>
              <Text style={sectionTitle}>{t.notes}</Text>
              <Text style={notesText}>{notes}</Text>
            </Section>
          )}

          {/* Action Buttons */}
          <Section style={buttonSection}>
            <Row>
              <Column align="center">
                <Button style={primaryButton} href={viewUrl}>
                  {t.viewButton}
                </Button>
              </Column>
              <Column align="center">
                <Button style={secondaryButton} href={downloadUrl}>
                  {t.downloadButton}
                </Button>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>{t.thanks}</Text>
            <Text style={footerText}>
              {t.bestRegards},<br />
              {senderName}
            </Text>
            <Text style={footerNote}>
              {t.footer} {senderEmail}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  padding: '32px 48px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#f8f9fa',
}

const companyTitle = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1a1a1a',
  margin: '0 0 8px',
}

const quotationTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#6b7280',
  margin: '0',
}

const content = {
  padding: '0 48px',
}

const greeting = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '8px',
}

const paragraph = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#6b7280',
  marginBottom: '24px',
}

const detailsSection = {
  padding: '24px 48px',
  backgroundColor: '#f8f9fa',
}

const detailColumn = {
  width: '50%',
  paddingBottom: '12px',
}

const detailLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#6b7280',
  margin: '0 0 4px',
}

const detailValue = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#1a1a1a',
  margin: '0',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}

const sectionTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '16px',
}

const itemsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const tableHeader = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#6b7280',
  padding: '8px 0',
  borderBottom: '2px solid #e5e7eb',
  textAlign: 'left' as const,
}

const tableHeaderRight = {
  ...tableHeader,
  textAlign: 'right' as const,
}

const tableCell = {
  fontSize: '14px',
  color: '#1a1a1a',
  padding: '12px 0',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'top' as const,
}

const tableCellRight = {
  ...tableCell,
  textAlign: 'right' as const,
}

const itemName = {
  fontWeight: '500',
  margin: '0',
}

const itemDescription = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '4px 0 0',
}

const totalsSection = {
  padding: '24px 48px',
}

const totalLabelColumn = {
  textAlign: 'right' as const,
  paddingRight: '16px',
}

const totalValueColumn = {
  textAlign: 'right' as const,
}

const totalLabel = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 8px',
}

const totalValue = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#1a1a1a',
  margin: '0 0 8px',
}

const totalDivider = {
  borderColor: '#e5e7eb',
  margin: '12px 0',
}

const grandTotalLabel = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1a1a1a',
  margin: '0',
}

const grandTotalValue = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#1a1a1a',
  margin: '0',
}

const notesText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#6b7280',
  whiteSpace: 'pre-wrap' as const,
}

const buttonSection = {
  padding: '32px 48px',
}

const primaryButton = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  marginBottom: '12px',
}

const secondaryButton = {
  backgroundColor: '#fff',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
}

const footer = {
  padding: '0 48px',
}

const footerText = {
  fontSize: '14px',
  color: '#6b7280',
  marginBottom: '8px',
}

const footerNote = {
  fontSize: '12px',
  color: '#9ca3af',
  marginTop: '16px',
}

export default QuotationEmailTemplate