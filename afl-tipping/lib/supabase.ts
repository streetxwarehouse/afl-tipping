import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export interface Entry {
  id: string
  season: number
  round_number: number
  email: string
  tips: Record<string, number> // { "gameId": teamId }
  score: number | null
  discount_code: string | null
  klaviyo_sent: boolean
  submitted_at: string
}
