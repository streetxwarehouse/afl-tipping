export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentRound, parseGameTime } from '@/lib/squiggle'

const CUTOFF_MINS = 10

export async function GET() {
  try {
    const { year, round, games, firstGameTime } = await getCurrentRound()

    const now = new Date()
    const cutoff = new Date(firstGameTime.getTime() - CUTOFF_MINS * 60 * 1000)
    const isOpen = now < cutoff

    return NextResponse.json({
      year,
      round,
      isOpen,
      firstGameTime: firstGameTime.toISOString(),
      cutoffTime: cutoff.toISOString(),
      games: games.map(g => ({
        id: g.id,
        hteam: g.hteam,
        ateam: g.ateam,
        hteamid: g.hteamid,
        ateamid: g.ateamid,
        date: parseGameTime(g.date, g.tz).toISOString(),
      })),
    })
  } catch (err) {
    console.error('[fixtures]', err)
    return NextResponse.json({ error: 'Failed to load fixtures' }, { status: 500 })
  }
}
