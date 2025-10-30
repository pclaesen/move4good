import { createBrowserClient } from '@supabase/ssr'

// Factory function to create a Supabase client for browser usage
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Default export for convenience
export default createClient