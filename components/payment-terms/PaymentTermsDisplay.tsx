'use client';

import React from 'react';

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

interface PaymentTermsDisplayProps {
  terms: PaymentTerm[];
  currency: string;
  locale: string;
}

export function PaymentTermsDisplay({
  terms,
  currency,
  locale,
}: PaymentTermsDisplayProps) {
  if (!terms || terms.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { zh: string; en: string; className: string }> = {
      unpaid: {
        zh: '未付款',
        en: 'Unpaid',
        className: 'bg-gray-100 text-gray-700',
      },
      partial: {
        zh: '部分付款',
        en: 'Partially Paid',
        className: 'bg-blue-100 text-blue-700',
      },
      paid: {
        zh: '已付款',
        en: 'Paid',
        className: 'bg-green-100 text-green-700',
      },
      overdue: {
        zh: '逾期',
        en: 'Overdue',
        className: 'bg-red-100 text-red-700',
      },
    };

    const label = labels[status] || labels.unpaid;
    return {
      text: locale === 'zh' ? label.zh : label.en,
      className: label.className,
    };
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        {locale === 'zh' ? '付款條款' : 'Payment Terms'}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                {locale === 'zh' ? '期數' : 'Term'}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                {locale === 'zh' ? '百分比' : 'Percentage'}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                {locale === 'zh' ? '金額' : 'Amount'}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                {locale === 'zh' ? '到期日' : 'Due Date'}
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                {locale === 'zh' ? '狀態' : 'Status'}
              </th>
            </tr>
          </thead>
          <tbody>
            {terms.map((term) => {
              const status = getStatusLabel(term.payment_status);
              return (
                <tr key={term.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {locale === 'zh' ? `第 ${term.term_number} 期` : `Term ${term.term_number}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {term.percentage}%
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {formatCurrency(term.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDate(term.due_date)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.className}`}
                    >
                      {status.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="p-4 bg-gray-50 border rounded-md">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">
              {locale === 'zh' ? '總期數' : 'Total Terms'}
            </span>
            <p className="font-semibold text-gray-900">{terms.length}</p>
          </div>
          <div>
            <span className="text-gray-600">
              {locale === 'zh' ? '百分比總和' : 'Total Percentage'}
            </span>
            <p className="font-semibold text-gray-900">
              {terms.reduce((sum, term) => sum + term.percentage, 0).toFixed(2)}%
            </p>
          </div>
          <div>
            <span className="text-gray-600">
              {locale === 'zh' ? '已付款' : 'Paid'}
            </span>
            <p className="font-semibold text-green-600">
              {terms.filter((t) => t.payment_status === 'paid').length} / {terms.length}
            </p>
          </div>
          <div>
            <span className="text-gray-600">
              {locale === 'zh' ? '逾期' : 'Overdue'}
            </span>
            <p className="font-semibold text-red-600">
              {terms.filter((t) => t.payment_status === 'overdue').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
