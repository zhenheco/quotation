'use client';

import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';

interface PaymentTerm {
  id: string
  quotation_id: string
  term_name: string
  percentage: number
  amount: number
  due_date: string | null
  paid_amount: number | null
  paid_date: string | null
  status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  created_at: string
  updated_at: string
}

interface PaymentTermRowProps {
  term: Partial<PaymentTerm>;
  index: number;
  totalAmount: number;
  locale: string;
  onChange: (field: string, value: string | number) => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function PaymentTermRow({
  term,
  index,
  totalAmount,
  locale,
  onChange,
  onDelete,
  dragHandleProps,
}: PaymentTermRowProps) {
  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    onChange('percentage', value);
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange('due_date', e.target.value);
  };

  const calculatedAmount = totalAmount
    ? Math.round((term.percentage || 0) * totalAmount) / 100
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-gray-50">
      {/* Drag Handle */}
      <div
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Term Number */}
      <div className="w-12 text-center font-medium text-gray-700">
        {index + 1}
      </div>

      {/* Percentage Input */}
      <div className="flex-1">
        <div className="relative">
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={term.percentage || ''}
            onChange={handlePercentageChange}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
          />
          <span className="absolute right-3 top-2 text-gray-500">%</span>
        </div>
      </div>

      {/* Calculated Amount */}
      <div className="flex-1 text-right font-medium text-gray-700">
        {formatCurrency(calculatedAmount)}
      </div>

      {/* Due Date Input */}
      <div className="flex-1">
        <input
          type="date"
          value={term.due_date || ''}
          onChange={handleDueDateChange}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Delete Button */}
      <button
        type="button"
        onClick={onDelete}
        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
        aria-label="刪除付款條款"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}
