'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import FormInput from '@/components/ui/FormInput'
import BilingualFormInput from '@/components/ui/BilingualFormInput'
import { useCreateCustomer, useUpdateCustomer, type Customer } from '@/hooks/useCustomers'
import OwnerSelect from '@/components/team/OwnerSelect'
import { getSelectedCompanyId } from '@/lib/utils/company-context'
import BusinessCardScanner from './BusinessCardScanner'
import BusinessCardPreview, { type BusinessCardFormData } from './BusinessCardPreview'
import type { BusinessCardData } from '@/lib/services/business-card-ocr'

interface CustomerFormProps {
  customer?: Customer
}

export default function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter()

  // 使用 hooks
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer(customer?.id || '')

  // 表單狀態
  const name = customer?.name as { zh: string; en: string } | undefined
  const address = customer?.address as { zh: string; en: string } | null | undefined

  const [formData, setFormData] = useState({
    customerNumber: (customer as { customer_number?: string } | undefined)?.customer_number || '',
    nameZh: name?.zh || '',
    nameEn: name?.en || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    fax: customer?.fax || '',
    tax_id: customer?.tax_id || '',
    addressZh: address?.zh || '',
    addressEn: address?.en || '',
    ownerId: (customer as { owner_id?: string } | undefined)?.owner_id || '',
  })

  // 名片掃描相關狀態
  const [scanData, setScanData] = useState<BusinessCardData | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  /**
   * 處理名片掃描完成
   */
  const handleScanComplete = useCallback((data: BusinessCardData) => {
    setScanData(data)
    setIsPreviewOpen(true)
  }, [])

  /**
   * 確認預覽資料，填入表單
   */
  const handlePreviewConfirm = useCallback((previewData: BusinessCardFormData) => {
    setFormData(prev => ({
      ...prev,
      nameZh: previewData.nameZh || prev.nameZh,
      nameEn: previewData.nameEn || prev.nameEn,
      email: previewData.email || prev.email,
      phone: previewData.phone || prev.phone,
      fax: previewData.fax || prev.fax,
      addressZh: previewData.addressZh || prev.addressZh,
      addressEn: previewData.addressEn || prev.addressEn,
    }))
    setIsPreviewOpen(false)
    setScanData(null)
    toast.success('名片資訊已填入表單')
  }, [])

  /**
   * 取消預覽
   */
  const handlePreviewCancel = useCallback(() => {
    setIsPreviewOpen(false)
    setScanData(null)
  }, [])

  // 新客戶時自動生成編號
  useEffect(() => {
    async function fetchGeneratedNumber() {
      if (!customer) {
        const companyId = getSelectedCompanyId()
        if (companyId) {
          try {
            const response = await fetch(`/api/customers/generate-number?company_id=${companyId}`)
            if (response.ok) {
              const data = await response.json() as { customer_number?: string }
              if (data.customer_number) {
                setFormData(prev => ({ ...prev, customerNumber: data.customer_number }))
              }
            }
          } catch (error) {
            console.error('Failed to generate customer number:', error)
          }
        }
      }
    }
    fetchGeneratedNumber()
  }, [customer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const companyId = getSelectedCompanyId()
      const customerData = {
        name: {
          zh: formData.nameZh.trim(),
          en: formData.nameEn.trim() || '',
        },
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        fax: formData.fax.trim() || undefined,
        tax_id: formData.tax_id.trim() || undefined,
        address: formData.addressZh.trim() || formData.addressEn.trim() ? {
          zh: formData.addressZh.trim() || '',
          en: formData.addressEn.trim() || '',
        } : undefined,
        owner_id: formData.ownerId || undefined,
        customer_number: formData.customerNumber.trim() || undefined,
        company_id: companyId || undefined,
      }

      if (customer) {
        // 更新現有客戶
        await updateCustomer.mutateAsync(customerData)
        toast.success('客戶資料已更新')
      } else {
        // 建立新客戶
        await createCustomer.mutateAsync(customerData)
        toast.success('客戶已建立')
      }

      router.push(`/customers`)
    } catch (err) {
      console.error('Error saving customer:', err)
      const errorMessage = err instanceof Error ? err.message : '儲存客戶資料失敗'
      toast.error(errorMessage)
    }
  }

  const isSubmitting = customer ? updateCustomer.isPending : createCustomer.isPending

  return (
    <>
      {/* 名片掃描預覽對話框 */}
      {scanData && (
        <BusinessCardPreview
          data={scanData}
          isOpen={isPreviewOpen}
          onConfirm={handlePreviewConfirm}
          onCancel={handlePreviewCancel}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 名片掃描按鈕 */}
        <BusinessCardScanner
          onScanComplete={handleScanComplete}
          disabled={isSubmitting}
        />

        {/* 客戶編號 */}
        <FormInput
        label="客戶編號"
        name="customerNumber"
        type="text"
        value={formData.customerNumber}
        onChange={(value) => setFormData({ ...formData, customerNumber: value })}
        placeholder="CUS202512-0001"
      />

      <BilingualFormInput
        label="客戶名稱"
        name="name"
        valueZh={formData.nameZh}
        valueEn={formData.nameEn}
        onChangeZh={(value) => setFormData({ ...formData, nameZh: value })}
        onChangeEn={(value) => setFormData({ ...formData, nameEn: value })}
        placeholderZh="請輸入中文名稱"
        placeholderEn="Please enter English name"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormInput
          label="電子郵件"
          name="email"
          type="email"
          value={formData.email}
          onChange={(value) => setFormData({ ...formData, email: value })}
          placeholder="example@company.com"
        />

        <FormInput
          label="統一編號"
          name="tax_id"
          type="text"
          value={formData.tax_id}
          onChange={(value) => setFormData({ ...formData, tax_id: value })}
          placeholder="12345678"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormInput
          label="電話"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={(value) => setFormData({ ...formData, phone: value })}
          placeholder="02-1234-5678"
        />

        <FormInput
          label="傳真"
          name="fax"
          type="tel"
          value={formData.fax}
          onChange={(value) => setFormData({ ...formData, fax: value })}
          placeholder="02-1234-5679"
        />
      </div>

      <BilingualFormInput
        label="地址"
        name="address"
        type="textarea"
        valueZh={formData.addressZh}
        valueEn={formData.addressEn}
        onChangeZh={(value) => setFormData({ ...formData, addressZh: value })}
        onChangeEn={(value) => setFormData({ ...formData, addressEn: value })}
        placeholderZh="請輸入中文地址"
        placeholderEn="Please enter English address"
        rows={3}
      />

      {/* 負責人選擇 */}
      <div>
        <label htmlFor="ownerId" className="block text-sm font-semibold text-gray-900 mb-1">
          負責人
        </label>
        <OwnerSelect
          companyId={getSelectedCompanyId() || ''}
          value={formData.ownerId}
          onChange={(ownerId) => setFormData({ ...formData, ownerId })}
        />
        <p className="mt-1 text-xs text-gray-500">選擇負責此客戶的團隊成員</p>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push(`/customers`)}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '儲存中...' : '儲存'}
        </button>
      </div>
      </form>
    </>
  )
}
