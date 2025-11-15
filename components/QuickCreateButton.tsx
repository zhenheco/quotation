'use client'

import Link from 'next/link'

interface QuickCreateButtonProps {
  href: string
  icon: string
  title: string
  variant?: 'primary' | 'secondary'
}

export default function QuickCreateButton({
  href,
  icon,
  title,
  variant = 'secondary',
}: QuickCreateButtonProps) {
  const baseClasses = 'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all'
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'border border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600',
  }

  return (
    <Link href={href} className={`${baseClasses} ${variantClasses[variant]}`}>
      <span className="text-xl">{icon}</span>
      <span>{title}</span>
    </Link>
  )
}
