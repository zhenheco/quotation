import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

const TRUST_BADGES = ['14 天免費試用', '無需信用卡', '5 分鐘上手'] as const

export function FinalCTA() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-teal-600 via-teal-700 to-blue-700 dark:from-teal-700 dark:via-teal-800 dark:to-blue-800 text-white relative overflow-hidden">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)`,
        backgroundSize: '32px 32px',
      }} />
      <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl" />

      <div className="relative max-w-3xl mx-auto text-center">
        {/* 故事回扣 */}
        <p className="text-teal-200/80 text-sm font-mono mb-6">
          星期一，早上 9:03
        </p>

        <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
          你的下一個星期一，<br />
          可以不一樣。
        </h2>

        <p className="text-xl text-white/80 mb-4 max-w-xl mx-auto leading-relaxed">
          不用再嘆氣打開 Excel，不用再手動複製貼上，<br className="hidden md:block" />
          不用再加班對帳到深夜。
        </p>

        <p className="text-teal-200 font-medium mb-10">
          下個月的你，會感謝今天的決定。
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button
            size="lg"
            className="group text-lg px-10 py-7 bg-white text-teal-700 hover:bg-white/90 font-bold shadow-lg shadow-black/20"
            asChild
          >
            <Link href="/login">
              免費試用 14 天
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="text-lg px-8 py-7 bg-transparent border-white/50 text-white hover:bg-white/10 hover:border-white"
            asChild
          >
            <Link href="/pricing">查看方案與價格</Link>
          </Button>
        </div>

        {/* 信任標語 */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/70">
          {TRUST_BADGES.map((badge) => (
            <span key={badge} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-300" />
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
