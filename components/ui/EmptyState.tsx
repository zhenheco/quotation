import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-16 px-6', className)}>
      {/* 圖標容器 - 漸層背景 */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-50 mb-6">
        <span className="text-4xl">{icon}</span>
      </div>

      <h3 className="text-xl font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 mb-8 max-w-sm mx-auto">{description}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center justify-center px-6 py-3 bg-emerald-500 text-white rounded-2xl font-medium shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 hover:shadow-xl transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
