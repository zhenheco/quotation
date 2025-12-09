import { createBrowserClient } from '@supabase/ssr'

// Hardcoded for Cloudflare Workers build compatibility
// Note: Anon key is designed to be public (same as exposed in frontend JS)
// Data security is protected by Supabase RLS policies
const SUPABASE_URL = 'https://oubsycwrxzkuviakzahi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91YnN5Y3dyeHprdXZpYWt6YWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDM5MDUsImV4cCI6MjA3OTQ3OTkwNX0.Ltz-HSAlcWHV6nsEkckD88ERbCVZSE9C8vNhbW7ELGA'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
