import { createBrowserClient } from '@supabase/ssr'

// Client-side Supabase instance for use in components
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)