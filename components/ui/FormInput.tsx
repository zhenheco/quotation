'use client'

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
  const baseClasses = `block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed ${
    error ? 'border-red-300' : 'border-gray-300'
  }`

  const isDateInput = type === 'date'

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
      className={`${baseClasses} cursor-pointer text-gray-900`}
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
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-gray-900 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {suffix ? (
        <div className="relative">
          {inputElement}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">{suffix}</span>
          </div>
        </div>
      ) : (
        inputElement
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
