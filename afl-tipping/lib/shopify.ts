const SHOP = process.env.SHOPIFY_SHOP_DOMAIN!
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN!
const API_VERSION = '2024-04'
const BASE = `https://${SHOP}/admin/api/${API_VERSION}`
const AFL_COLLECTION_ID = process.env.SHOPIFY_AFL_COLLECTION_ID

const DISCOUNT_CONFIG: Record<number, { value: string; label: string }> = {
  6: { value: '-5.0',  label: '5% Off AFL Collection' },
  7: { value: '-15.0', label: '15% Off AFL Collection' },
  8: { value: '-25.0', label: '25% Off AFL Collection' },
}

async function shopifyFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': TOKEN,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Shopify ${res.status}: ${body}`)
  }
  return res.json()
}

export async function generateDiscountCode(
  score: number,
  round: number,
  year: number
): Promise<string | null> {
  const config = DISCOUNT_CONFIG[score]
  if (!config) return null

  const endsAt = new Date()
  endsAt.setDate(endsAt.getDate() + 7)

  const priceRuleBody: Record<string, unknown> = {
    title: `AFL ${year} R${round} ${config.label} ${Date.now()}`,
    target_type: 'line_item',
    target_selection: AFL_COLLECTION_ID ? 'entitled' : 'all',
    allocation_method: 'across',
    value_type: 'percentage',
    value: config.value,
    customer_selection: 'all',
    starts_at: new Date().toISOString(),
    ends_at: endsAt.toISOString(),
    usage_limit: 1,
    once_per_customer: true,
  }

  if (AFL_COLLECTION_ID) {
    priceRuleBody.entitled_collection_ids = [parseInt(AFL_COLLECTION_ID)]
  }

  const { price_rule } = await shopifyFetch('/price_rules.json', {
    method: 'POST',
    body: JSON.stringify({ price_rule: priceRuleBody }),
  })

  const code = `AFL${year}R${round}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

  const { discount_code } = await shopifyFetch(
    `/price_rules/${price_rule.id}/discount_codes.json`,
    {
      method: 'POST',
      body: JSON.stringify({ discount_code: { code } }),
    }
  )

  return discount_code.code as string
}
