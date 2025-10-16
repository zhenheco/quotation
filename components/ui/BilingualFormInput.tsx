'use client'

interface BilingualFormInputProps {
  label: string
  name: string
  type?: string
  valueZh: string
  valueEn: string
  onChangeZh: (value: string) => void
  onChangeEn: (value: string) => void
  placeholderZh?: string
  placeholderEn?: string
  required?: boolean
  error?: string
  disabled?: boolean
  rows?: number
}

export default function BilingualFormInput({
  label,
  name,
  type = 'text',
  valueZh,
  valueEn,
  onChangeZh,
  onChangeEn,
  placeholderZh,
  placeholderEn,
  required = false,
  error,
  disabled = false,
  rows,
}: BilingualFormInputProps) {
  const isTextarea = type === 'textarea'
  const baseClasses = `block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed ${
    error ? 'border-red-300' : 'border-gray-300'
  }`

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${name}_zh`} className="block text-xs text-gray-500 mb-1">
            中文
          </label>
          {isTextarea ? (
            <textarea
              id={`${name}_zh`}
              name={`${name}_zh`}
              value={valueZh}
              onChange={(e) => onChangeZh(e.target.value)}
              placeholder={placeholderZh}
              required={required}
              disabled={disabled}
              rows={rows || 3}
              className={baseClasses}
            />
          ) : (
            <input
              type={type}
              id={`${name}_zh`}
              name={`${name}_zh`}
              value={valueZh}
              onChange={(e) => onChangeZh(e.target.value)}
              placeholder={placeholderZh}
              required={required}
              disabled={disabled}
              className={baseClasses}
            />
          )}
        </div>
        <div>
          <label htmlFor={`${name}_en`} className="block text-xs text-gray-500 mb-1">
            English
          </label>
          {isTextarea ? (
            <textarea
              id={`${name}_en`}
              name={`${name}_en`}
              value={valueEn}
              onChange={(e) => onChangeEn(e.target.value)}
              placeholder={placeholderEn}
              required={required}
              disabled={disabled}
              rows={rows || 3}
              className={baseClasses}
            />
          ) : (
            <input
              type={type}
              id={`${name}_en`}
              name={`${name}_en`}
              value={valueEn}
              onChange={(e) => onChangeEn(e.target.value)}
              placeholder={placeholderEn}
              required={required}
              disabled={disabled}
              className={baseClasses}
            />
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
