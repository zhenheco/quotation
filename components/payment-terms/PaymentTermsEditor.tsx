'use client';

import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { PaymentTermRow } from './PaymentTermRow';
import { validatePercentages } from '@/lib/services/payment-terms.client';

interface PaymentTerm {
  id: string
  quotation_id: string
  term_number: number
  term_name: string
  percentage: number
  amount: number
  due_date: string | null
  paid_amount: number | null
  paid_date: string | null
  status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  created_at: string
  updated_at: string
}

interface PaymentTermsEditorProps {
  terms: Partial<PaymentTerm>[];
  totalAmount: number;
  currency: string;
  locale: string;
  onChange: (terms: Partial<PaymentTerm>[]) => void;
}

const QUICK_TEMPLATES = [
  { name: '30%-70%', values: [30, 70] },
  { name: '50%-50%', values: [50, 50] },
  { name: '30%-50%-20%', values: [30, 50, 20] },
  { name: '25%-25%-25%-25%', values: [25, 25, 25, 25] },
];

export function PaymentTermsEditor({
  terms,
  totalAmount,
  currency,
  locale,
  onChange,
}: PaymentTermsEditorProps) {
  const [localTerms, setLocalTerms] = useState<Partial<PaymentTerm>[]>(terms);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    setLocalTerms(terms);
  }, [terms]);

  useEffect(() => {
    const validation = validatePercentages(
      localTerms.map((t) => ({ percentage: t.percentage || 0 }))
    );
    setWarning(validation.warning || null);
  }, [localTerms]);

  const handleAddTerm = () => {
    const newTerm: Partial<PaymentTerm> = {
      term_number: localTerms.length + 1,
      percentage: 0,
      amount: 0,
      payment_status: 'unpaid',
    };
    const newTerms = [...localTerms, newTerm];
    setLocalTerms(newTerms);
    onChange(newTerms);
  };

  const handleUpdateTerm = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const newTerms = [...localTerms];
    newTerms[index] = {
      ...newTerms[index],
      [field]: value,
    };
    setLocalTerms(newTerms);
    onChange(newTerms);
  };

  const handleDeleteTerm = (index: number) => {
    const newTerms = localTerms.filter((_, i) => i !== index);
    const reorderedTerms = newTerms.map((term, i) => ({
      ...term,
      term_number: i + 1,
    }));
    setLocalTerms(reorderedTerms);
    onChange(reorderedTerms);
  };

  const handleApplyTemplate = (template: { name: string; values: number[] }) => {
    const newTerms: Partial<PaymentTerm>[] = template.values.map((percentage, i) => ({
      term_number: i + 1,
      percentage,
      amount: Math.round((percentage / 100) * totalAmount * 100) / 100,
      payment_status: 'unpaid',
    }));
    setLocalTerms(newTerms);
    onChange(newTerms);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {locale === 'zh' ? '付款條款' : 'Payment Terms'}
        </h3>
        <div className="flex gap-2">
          {/* Quick Templates */}
          <div className="flex gap-2">
            {QUICK_TEMPLATES.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => handleApplyTemplate(template)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {template.name}
              </button>
            ))}
          </div>
          {/* Add Term Button */}
          <button
            type="button"
            onClick={handleAddTerm}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {locale === 'zh' ? '新增期數' : 'Add Term'}
          </button>
        </div>
      </div>

      {/* Warning */}
      {warning && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">{warning}</p>
        </div>
      )}

      {/* Total Amount Display */}
      <div className="p-3 bg-gray-50 border rounded-md">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {locale === 'zh' ? '報價單總金額' : 'Quotation Total'}
          </span>
          <span className="text-lg font-semibold text-gray-900">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* Column Headers */}
      {localTerms.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-100 border rounded-md text-sm font-medium text-gray-600">
          <div className="w-5" />
          <div className="w-12 text-center">
            {locale === 'zh' ? '期數' : 'Term'}
          </div>
          <div className="flex-1">
            {locale === 'zh' ? '百分比' : 'Percentage'}
          </div>
          <div className="flex-1 text-right">
            {locale === 'zh' ? '金額' : 'Amount'}
          </div>
          <div className="flex-1">
            {locale === 'zh' ? '到期日' : 'Due Date'}
          </div>
          <div className="w-10" />
        </div>
      )}

      {/* Terms List */}
      <div className="space-y-2">
        {localTerms.map((term, index) => (
          <PaymentTermRow
            key={index}
            term={term}
            index={index}
            totalAmount={totalAmount}
            locale={locale}
            onChange={(field, value) => handleUpdateTerm(index, field, value)}
            onDelete={() => handleDeleteTerm(index)}
          />
        ))}
      </div>

      {/* Empty State */}
      {localTerms.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">
            {locale === 'zh'
              ? '尚未新增付款條款'
              : 'No payment terms added yet'}
          </p>
          <p className="text-sm">
            {locale === 'zh'
              ? '點擊「新增期數」或選擇快速模板開始'
              : 'Click "Add Term" or choose a quick template to start'}
          </p>
        </div>
      )}
    </div>
  );
}
