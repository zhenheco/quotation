'use client'

import Image from 'next/image'
import { CheckCircle2, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import AnnotationOverlay from './AnnotationOverlay'
import type { GuideStep } from './guide-data'

interface GuideStepCardProps {
  step: GuideStep
  stepNumber: number
  totalSteps: number
  locale: string
}

/**
 * 教學步驟卡片
 * 左側：步驟說明與提示
 * 右側：截圖與標註
 */
export default function GuideStepCard({
  step,
  stepNumber,
  totalSteps,
  locale,
}: GuideStepCardProps) {
  const Icon = step.icon

  return (
    <div className="grid md:grid-cols-2 gap-6 h-full">
      {/* 左側：說明區 */}
      <div className="flex flex-col">
        {/* 步驟標題 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">
              {locale === 'zh' ? `步驟 ${stepNumber} / ${totalSteps}` : `Step ${stepNumber} of ${totalSteps}`}
            </div>
            <h3 className="text-xl font-semibold text-slate-800">
              {step.title}
            </h3>
          </div>
        </div>

        {/* 描述文字 */}
        <p className="text-slate-600 leading-relaxed mb-6">
          {step.description}
        </p>

        {/* 提示區塊 */}
        {step.tips && step.tips.length > 0 && (
          <div className="mt-auto bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-amber-700 font-medium mb-3">
              <Lightbulb className="w-5 h-5" />
              <span>{locale === 'zh' ? '小提示' : 'Tips'}</span>
            </div>
            <ul className="space-y-2">
              {step.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 右側：截圖區 */}
      <div className="flex items-center justify-center">
        {step.screenshot ? (
          <div className="relative w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden shadow-lg border border-slate-200">
            <Image
              src={step.screenshot.src}
              alt={step.screenshot.alt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
              onError={(e) => {
                // 如果圖片載入失敗，顯示佔位符
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
            {/* 標註層 */}
            {step.screenshot.annotations && step.screenshot.annotations.length > 0 && (
              <AnnotationOverlay annotations={step.screenshot.annotations} />
            )}
            {/* 圖片載入失敗時的佔位符 */}
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400">
              <div className="text-center">
                <Icon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {locale === 'zh' ? '截圖準備中...' : 'Screenshot loading...'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className={cn(
            'w-full aspect-video rounded-2xl',
            'bg-gradient-to-br from-slate-100 to-slate-50',
            'flex items-center justify-center',
            'border border-slate-200'
          )}>
            <div className="text-center text-slate-400">
              <Icon className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {locale === 'zh' ? '此步驟無截圖' : 'No screenshot for this step'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
