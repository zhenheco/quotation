import { StyleSheet } from '@react-pdf/renderer'
import type { BrandColors } from '@/types/brand.types'

export function createPDFStyles(colors: BrandColors) {
  return StyleSheet.create({
    page: {
      padding: 40,
      fontFamily: 'NotoSansTC',
      fontSize: 10,
      color: colors.text,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 30,
      paddingBottom: 20,
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    logo: {
      width: 80,
      height: 80,
      objectFit: 'contain',
    },
    companyInfo: {
      textAlign: 'right',
    },
    companyName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 4,
    },
    companyDetail: {
      fontSize: 9,
      marginBottom: 2,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
      textAlign: 'center',
      marginBottom: 20,
    },
    infoSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    infoBlock: {
      width: '48%',
    },
    infoLabel: {
      fontSize: 8,
      color: '#6b7280',
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 10,
      marginBottom: 6,
    },
    customerBox: {
      backgroundColor: colors.secondary,
      padding: 12,
      borderRadius: 4,
    },
    customerName: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    table: {
      marginTop: 20,
      marginBottom: 20,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      color: '#ffffff',
      padding: 8,
      fontSize: 9,
      fontWeight: 'bold',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      padding: 8,
      fontSize: 9,
    },
    tableRowAlt: {
      backgroundColor: colors.secondary,
    },
    colDescription: { width: '40%' },
    colQuantity: { width: '15%', textAlign: 'right' },
    colUnitPrice: { width: '15%', textAlign: 'right' },
    colDiscount: { width: '15%', textAlign: 'right' },
    colSubtotal: { width: '15%', textAlign: 'right' },
    summarySection: {
      marginTop: 10,
      alignItems: 'flex-end',
    },
    summaryRow: {
      flexDirection: 'row',
      width: 200,
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    summaryLabel: {
      fontSize: 10,
    },
    summaryValue: {
      fontSize: 10,
      textAlign: 'right',
    },
    totalRow: {
      borderTopWidth: 2,
      borderTopColor: colors.primary,
      paddingTop: 6,
      marginTop: 6,
    },
    totalLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.primary,
    },
    totalValue: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.primary,
    },
    paymentSection: {
      marginTop: 30,
      padding: 15,
      backgroundColor: colors.secondary,
      borderRadius: 4,
    },
    paymentTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 10,
    },
    paymentRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    paymentLabel: {
      width: 80,
      fontSize: 9,
      color: '#6b7280',
    },
    paymentValue: {
      flex: 1,
      fontSize: 9,
    },
    passbookImage: {
      width: 150,
      marginTop: 10,
      borderRadius: 4,
    },
    notesSection: {
      marginTop: 20,
    },
    notesTitle: {
      fontSize: 11,
      fontWeight: 'bold',
      marginBottom: 6,
    },
    notesText: {
      fontSize: 9,
      color: '#4b5563',
      lineHeight: 1.5,
    },
    signatureSection: {
      marginTop: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    signatureBlock: {
      width: '45%',
      alignItems: 'center',
    },
    signatureLine: {
      width: '100%',
      borderBottomWidth: 1,
      borderBottomColor: '#d1d5db',
      marginBottom: 6,
    },
    signatureLabel: {
      fontSize: 9,
      color: '#6b7280',
    },
    signatureImage: {
      width: 100,
      height: 50,
      marginBottom: 6,
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      textAlign: 'center',
      fontSize: 8,
      color: '#9ca3af',
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
      paddingTop: 10,
    },
  })
}
