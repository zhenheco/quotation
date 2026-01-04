'use client'

import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Annotation } from './guide-data'

interface AnnotationOverlayProps {
  annotations: Annotation[]
}

/**
 * 截圖標註覆蓋層
 * 在截圖上顯示箭頭、圓圈、文字等視覺標註
 */
export default function AnnotationOverlay({ annotations }: AnnotationOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {annotations.map((anno, i) => (
        <div
          key={i}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${anno.x}%`, top: `${anno.y}%` }}
        >
          {anno.type === 'circle' && (
            <CircleAnnotation text={anno.text} />
          )}
          {anno.type === 'arrow' && (
            <ArrowAnnotation direction={anno.direction} text={anno.text} />
          )}
          {anno.type === 'text' && (
            <TextAnnotation text={anno.text} />
          )}
        </div>
      ))}
    </div>
  )
}

// 圓圈標註 - 閃爍的紅色圓圈
function CircleAnnotation({ text }: { text?: string }) {
  return (
    <div className="relative flex items-center gap-2">
      {/* 外圈動畫 */}
      <div className="absolute w-10 h-10 rounded-full bg-red-500/20 animate-ping" />
      {/* 內圈 */}
      <div className="relative w-10 h-10 rounded-full border-3 border-red-500 bg-red-500/10 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-red-500" />
      </div>
      {/* 文字標籤 */}
      {text && (
        <div className="absolute left-12 whitespace-nowrap bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
          {text}
        </div>
      )}
    </div>
  )
}

// 箭頭標註
function ArrowAnnotation({
  direction = 'right',
  text,
}: {
  direction?: 'up' | 'down' | 'left' | 'right'
  text?: string
}) {
  const ArrowIcon = {
    up: ArrowUp,
    down: ArrowDown,
    left: ArrowLeft,
    right: ArrowRight,
  }[direction]

  const textPosition = {
    up: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    down: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  }[direction]

  return (
    <div className="relative flex items-center justify-center">
      {/* 箭頭圖示 */}
      <div
        className={cn(
          'w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg',
          'animate-bounce'
        )}
      >
        <ArrowIcon className="w-6 h-6 text-white" />
      </div>
      {/* 文字標籤 */}
      {text && (
        <div
          className={cn(
            'absolute whitespace-nowrap bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg',
            textPosition
          )}
        >
          {text}
        </div>
      )}
    </div>
  )
}

// 文字標註
function TextAnnotation({ text }: { text?: string }) {
  if (!text) return null

  return (
    <div className="bg-amber-400 text-amber-900 text-sm font-medium px-4 py-2 rounded-lg shadow-lg">
      {text}
    </div>
  )
}
