'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-xl border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-emerald-500 text-white shadow-sm hover:bg-emerald-600',
        secondary:
          'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200',
        destructive:
          'border-transparent bg-red-100 text-red-700 hover:bg-red-200',
        outline: 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50',
        success:
          'border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
        warning:
          'border-transparent bg-amber-100 text-amber-700 hover:bg-amber-200',
        info:
          'border-transparent bg-sky-100 text-sky-700 hover:bg-sky-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
