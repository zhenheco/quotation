interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  'data-testid'?: string
}

export default function LoadingSpinner({ size = 'md', 'data-testid': testId }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div className="flex items-center justify-center p-8" data-testid={testId}>
      <div
        className={`${sizeClasses[size]} border-indigo-600 border-t-transparent rounded-full animate-spin`}
      />
    </div>
  )
}
