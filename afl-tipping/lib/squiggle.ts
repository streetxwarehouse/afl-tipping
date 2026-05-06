const BASE = 'https://api.squiggle.com.au/'
const UA = 'StreetX-AFL-Tipping/1.0 (admin@streetx.com.au)'

export interface SquiggleGame {
  id: number
  hteam: string
  ateam: string
  hteamid: number
  ateamid: number
  date: string  // "2025-03-13 19:50:00" in local Melbourne time
  tz: string    // "AEDT" | "AEST" | "ACDT" etc
  complete: number // 0–100
  winner: string | null
  winnerteamid: number | null
  hscore: number | null
  ascore: number | null
  round: number
  year: number
  roundname: string
}

const TZ_OFFSETS: Record<string, string> = {
  AEDT: '+11:00',
  AEST: '+10:00',
  ACDT: '+10:30',
  ACST: '+09:30',
  AWST: '+08:00',
}

export function parseGameTime(date: string, tz: string): Date {
  const offset = TZ_OFFSETS[tz] ?? '+10:00'
  return new Date(`${date.replace(' ', 'T')}${offset}`)
}

async function squiggleFetch(query: string): Promise<{ games?: SquiggleGame[] }> {
  const res = await fetch(`${BASE}${query}`, {
    headers: { 'User-Agent': UA },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Squiggle API error ${res.status}`)
  return res.json()
}

export async function getCurrentRound() {
  const year = new Date().getFullYear()
  const data = await squiggleFetch(`?q=games;year=${year}`)
  if (!data.games?.length) throw new Error('No games found for current year')

  // Find the lowest round number where not all games are complete
  const incomplete = data.games.filter(g => g.complete < 100)
  if (!incomplete.length) throw new Error('No upcoming games found')

 const round = Math.min(...incomplete.map(function(g) { return g.round }))
  return getRoundGames(year, round)
}
}

export async function getRoundGames(year: number, round: number) {
  const data = await squiggleFetch(`?q=games;year=${year};round=${round}`)
  const games = (data.games ?? [])
    .filter(g => g.hteam && g.ateam && g.hteamid && g.ateamid)
    .sort((a, b) => parseGameTime(a.date, a.tz).getTime() - parseGameTime(b.date, b.tz).getTime())

  if (!games.length) throw new Error(`No games found for ${year} Round ${round}`)

  const firstGameTime = parseGameTime(games[0].date, games[0].tz)
  return { year, round, games, firstGameTime }
}
