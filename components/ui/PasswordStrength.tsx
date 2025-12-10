'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

interface PasswordStrengthProps {
  password: string
}

interface PasswordRule {
  key: string
  test: (password: string) => boolean
}

const PASSWORD_RULES: PasswordRule[] = [
  { key: 'minLength', test: (p) => p.length >= 8 },
  { key: 'uppercase', test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', test: (p) => /[a-z]/.test(p) },
  { key: 'number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
]

export function validatePassword(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password))
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const t = useTranslations('auth.passwordStrength')

  const results = useMemo(() => {
    return PASSWORD_RULES.map((rule) => ({
      key: rule.key,
      passed: rule.test(password),
    }))
  }, [password])

  const passedCount = results.filter((r) => r.passed).length
  const strengthPercent = (passedCount / PASSWORD_RULES.length) * 100

  const strengthColor =
    strengthPercent <= 20
      ? 'bg-red-500'
      : strengthPercent <= 40
        ? 'bg-orange-500'
        : strengthPercent <= 60
          ? 'bg-yellow-500'
          : strengthPercent <= 80
            ? 'bg-lime-500'
            : 'bg-green-500'

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${strengthColor}`}
          style={{ width: `${strengthPercent}%` }}
        />
      </div>

      {/* Rules checklist */}
      <ul className="text-xs space-y-1">
        {results.map(({ key, passed }) => (
          <li
            key={key}
            className={`flex items-center gap-1.5 ${passed ? 'text-green-600' : 'text-gray-500'}`}
          >
            {passed ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="3" />
              </svg>
            )}
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
