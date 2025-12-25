import Link from 'next/link'
import { Plus } from 'lucide-react'

type PageHeaderAction = {
  label: string
  icon?: React.ReactNode
} & (
  | { href: string; onClick?: never }
  | { onClick: () => void; href?: never }
)

interface PageHeaderProps {
  title: string
  description?: string
  action?: PageHeaderAction
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  const buttonClasses = "inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-emerald-500 text-white rounded-2xl font-medium shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 hover:shadow-xl transition-all duration-200 active:scale-[0.98]"

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{title}</h1>
          {description && (
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {action && (
          'href' in action ? (
            <Link href={action.href} className={buttonClasses}>
              {action.icon || <Plus className="h-5 w-5" />}
              {action.label}
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className={buttonClasses}>
              {action.icon || <Plus className="h-5 w-5" />}
              {action.label}
            </button>
          )
        )}
      </div>
    </div>
  )
}
