export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentRound } from '@/lib/squiggle'
import { supabase } from '@/lib/supabase'
import { sendTipConfirmation } from '@/lib/klaviyo'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CUTOFF_MINS = 10

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, year, round, tips } = body

    if (!email || !year || !round || !tips || typeof tips !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Verify round is still open
    const roundData = await getCurrentRound()
    if (roundData.year !== year || roundData.round !== round) {
      return NextResponse.json({ error: 'Round mismatch — please refresh the page' }, { status: 400 })
    }
    const cutoff = new Date(roundData.firstGameTime.getTime() - CUTOFF_MINS * 60 * 1000)
    if (new Date() >= cutoff) {
      return NextResponse.json({ error: 'Tipping is closed for this round' }, { status: 400 })
    }

    // All games must be tipped, with a valid team for that game
    for (const game of roundData.games) {
      const tip = tips[String(game.id)]
      if (tip === undefined) {
        return NextResponse.json({ error: `Missing tip for ${game.hteam} vs ${game.ateam}` }, { status: 400 })
      }
      if (tip !== game.hteamid && tip !== game.ateamid) {
        return NextResponse.json({ error: `Invalid team selection for game ${game.id}` }, { status: 400 })
      }
    }

    // One entry per email per round
    const { data: existing } = await supabase
      .from('entries')
      .select('id')
      .eq('season', year)
      .eq('round_number', round)
      .ilike('email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted tips for this round' },
        { status: 409 }
      )
    }

    const { error: insertError } = await supabase.from('entries').insert({
      season: year,
      round_number: round,
      email: email.toLowerCase().trim(),
      tips,
    })
    if (insertError) {
      console.error('[submit] insert error', insertError)
      return NextResponse.json({ error: 'Failed to save your tips' }, { status: 500 })
    }

    // Fire Klaviyo confirmation — non-blocking
    sendTipConfirmation(email, round, year, roundData.games.length).catch(e =>
      console.error('[submit] klaviyo error', e)
    )

    return NextResponse.json({ success: true, round, year })
  } catch (err) {
    console.error('[submit]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
