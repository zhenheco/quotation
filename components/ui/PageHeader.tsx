import Link from 'next/link'

type PageHeaderAction = {
  label: string
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
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-2 text-sm text-gray-600">{description}</p>
          )}
        </div>
        {action && (
          'href' in action ? (
            <Link
              href={action.href}
              className="w-full sm:w-auto text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="w-full sm:w-auto text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {action.label}
            </button>
          )
        )}
      </div>
    </div>
  )
}
