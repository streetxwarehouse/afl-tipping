import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL ?? 'placeholder',
  process.env.SUPABASE_SERVICE_KEY ?? 'placeholder'
)

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
