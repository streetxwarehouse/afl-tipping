export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getRoundGames } from '@/lib/squiggle'
import { getSupabase, Entry } from '@/lib/supabase'
import { generateDiscountCode } from '@/lib/shopify'
import { sendRoundResult, sendPerfectRoundAlert } from '@/lib/klaviyo'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { year, round } = await req.json()
    if (!year || !round) {
      return NextResponse.json({ error: 'year and round are required' }, { status: 400 })
    }

    const { games } = await getRoundGames(year, round)

    const incomplete = games.filter(g => g.complete < 100)
    if (incomplete.length) {
      return NextResponse.json(
        {
          error: `${incomplete.length} game(s) not yet complete`,
          incomplete: incomplete.map(g => `${g.hteam} vs ${g.ateam}`),
        },
        { status: 400 }
      )
    }

    const winners: Record<number, number | null> = {}
    for (const g of games) {
      winners[g.id] = g.winnerteamid
    }

    const db = getSupabase()

    const { data: entries, error: fetchErr } = await db
      .from('entries')
      .select('*')
      .eq('season', year)
      .eq('round_number', round)
      .is('score', null)

    if (fetchErr) throw fetchErr
    if (!entries?.length) {
      return NextResponse.json({ message: 'No entries to process', processed: 0 })
    }

    const perfectWinners: string[] = []
    const results: { email: string; score: number; discountCode: string | null }[] = []

    for (const entry of entries as Entry[]) {
      let score = 0
      for (const game of games) {
        if (entry.tips[String(game.id)] === winners[game.id]) score++
      }

      const isPerfect = score >= games.length
      let discountCode: string | null = null

      if (!isPerfect && score >= 6) {
        try {
          discountCode = await generateDiscountCode(score, round, year)
        } catch (e) {
          console.error(`[process] discount failed for ${entry.email}`, e)
        }
      }

      if (isPerfect) perfectWinners.push(entry.email)

      await db.from('entries').update({ score, discount_code: discountCode }).eq('id', entry.id)

      try {
        await sendRoundResult(entry.email, round, year, score, games.length, discountCode)
        await db.from('entries').update({ klaviyo_sent: true }).eq('id', entry.id)
      } catch (e) {
        console.error(`[process] klaviyo failed for ${entry.email}`, e)
      }

      results.push({ email: entry.email, score, discountCode })
    }

    if (perfectWinners.length) {
      sendPerfectRoundAlert(perfectWinners, round, year).catch(e =>
        console.error('[process] perfect alert failed', e)
      )
    }

    return NextResponse.json({ processed: results.length, perfectWinners, results })
  } catch (err) {
    console.error('[process-results]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
