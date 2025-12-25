'use client'

import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormInputProps {
  label: string
  name: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
  rows?: number
  step?: string
  suffix?: string
}

export default function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  disabled = false,
  rows,
  step,
  suffix,
}: FormInputProps) {
  const isTextarea = type === 'textarea'
  const hasValue = value && value.trim() !== ''
  const isDateInput = type === 'date'

  // 現代圓潤風格的基礎樣式
  const baseClasses = cn(
    'block w-full px-4 py-3 text-sm',
    'border-2 rounded-2xl',
    'bg-white text-slate-800',
    'placeholder:text-slate-400',
    'transition-all duration-200',
    'focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10',
    'hover:border-slate-300',
    'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200',
    hasValue && 'font-medium',
    error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200'
  )

  const inputElement = isTextarea ? (
    <textarea
      id={name}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      rows={rows || 3}
      className={baseClasses}
    />
  ) : isDateInput ? (
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={cn(baseClasses, 'cursor-pointer')}
    />
  ) : (
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      step={step}
      className={baseClasses}
    />
  )

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="flex items-center gap-1 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {suffix ? (
        <div className="relative">
          {inputElement}
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            <span className="text-slate-400 text-sm">{suffix}</span>
          </div>
        </div>
      ) : (
        inputElement
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
