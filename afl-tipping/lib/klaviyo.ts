const KEY = process.env.KLAVIYO_PRIVATE_KEY!
const BASE = 'https://a.klaviyo.com/api'

async function trackEvent(
  email: string,
  eventName: string,
  properties: Record<string, unknown>
) {
  const res = await fetch(`${BASE}/events/`, {
    method: 'POST',
    headers: {
      Authorization: `Klaviyo-API-Key ${KEY}`,
      'Content-Type': 'application/json',
      revision: '2024-07-15',
    },
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          profile: {
            data: { type: 'profile', attributes: { email } },
          },
          metric: {
            data: { type: 'metric', attributes: { name: eventName } },
          },
          properties,
        },
      },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Klaviyo ${res.status}: ${body}`)
  }
}

export async function sendTipConfirmation(
  email: string,
  round: number,
  year: number,
  gameCount: number
) {
  await trackEvent(email, 'AFL Tip Submitted', { round, year, games_tipped: gameCount })
}

export async function sendRoundResult(
  email: string,
  round: number,
  year: number,
  score: number,
  totalGames: number,
  discountCode: string | null
) {
  const prizeLabel = getPrizeLabel(score, totalGames)
  await trackEvent(email, 'AFL Round Result', {
    round,
    year,
    score,
    total_games: totalGames,
    discount_code: discountCode,
    prize_label: prizeLabel,
  })
}

export async function sendPerfectRoundAlert(
  winners: string[],
  round: number,
  year: number
) {
  const ownerEmail = process.env.OWNER_EMAIL!
  await trackEvent(ownerEmail, 'AFL Perfect Round Alert', {
    round,
    year,
    winner_count: winners.length,
    winners: winners.join(', '),
  })
}

function getPrizeLabel(score: number, totalGames: number): string | null {
  if (score >= totalGames) return 'Free AFL Item'
  if (score === 8) return '25% Off'
  if (score === 7) return '15% Off'
  if (score === 6) return '5% Off'
  return null
}
