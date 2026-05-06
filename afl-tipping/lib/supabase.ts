import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

export const supabase = {
  from: (table: string) => getSupabase().from(table),
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
