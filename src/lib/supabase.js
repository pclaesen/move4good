import { createClient } from '@supabase/supabase-js'

// Use new secret key format (sb_secret_...) which replaces service_role key
const secretKey = process.env.SUPABASE_SECRET_KEY

if (!secretKey) {
  throw new Error('Missing Supabase secret key')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  secretKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    }
  }
)

export default supabase