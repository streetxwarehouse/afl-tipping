import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key)
}

export interface Entry {
  id: string
  season: number
  round_number: number
  email: string
  tips: Record<string, number>
  score: number | null
  discount_code: string | null
  klaviyo_sent: boolean
  submitted_at: string
}
