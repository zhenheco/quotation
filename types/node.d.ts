/// <reference types="node" />

// 確保 Node.js 全域型別在所有 scripts 中可用
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    NEXT_PUBLIC_SUPABASE_URL?: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
    SUPABASE_SERVICE_ROLE_KEY?: string
    POSTGRES_URL?: string
    DATABASE_URL?: string
    [key: string]: string | undefined
  }
}
