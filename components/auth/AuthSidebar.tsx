'use client'

import { useTranslations } from 'next-intl'

export default function AuthSidebar() {
  const t = useTranslations('auth.sidebar')

  const stats = [
    { value: '10,000+', labelKey: 'quotationsCreated' },
    { value: '500+', labelKey: 'happyCustomers' },
    { value: '99.9%', labelKey: 'uptime' },
  ]

  const testimonials = [
    {
      quote: 'testimonial1.quote',
      author: 'testimonial1.author',
      role: 'testimonial1.role',
    },
    {
      quote: 'testimonial2.quote',
      author: 'testimonial2.author',
      role: 'testimonial2.role',
    },
  ]

  return (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 via-cyan-600 to-cyan-900 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="white"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
        {/* Logo and tagline */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-3">{t('title')}</h2>
          <p className="text-lg text-cyan-100">{t('subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-cyan-200">{t(stat.labelKey)}</div>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <svg
            className="w-8 h-8 text-teal-300 mb-4"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <p className="text-lg mb-4 leading-relaxed">
            {t(testimonials[0].quote)}
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-400 rounded-full flex items-center justify-center text-white font-bold">
              {t(testimonials[0].author).charAt(0)}
            </div>
            <div>
              <div className="font-semibold">{t(testimonials[0].author)}</div>
              <div className="text-sm text-cyan-200">{t(testimonials[0].role)}</div>
            </div>
          </div>
        </div>

        {/* Features list */}
        <div className="mt-12 space-y-3">
          {['feature1', 'feature2', 'feature3'].map((key) => (
            <div key={key} className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-green-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-teal-100">{t(key)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
