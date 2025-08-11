import { createClient } from '@supabase/supabase-js'

const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!secretKey) {
  throw new Error('Missing service role key')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  secretKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

export default supabase