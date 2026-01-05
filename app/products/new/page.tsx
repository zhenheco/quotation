'use client'

import PageHeader from '@/components/ui/PageHeader'
import ProductForm from '../ProductForm'

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="新增產品" />

      <div className="bg-white rounded-lg shadow p-6">
        <ProductForm />
      </div>
    </div>
  )
}
