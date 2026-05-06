import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED: (string | RegExp)[] = [
  'https://streetx.com.au',
  /\.myshopify\.com$/,
]

if (process.env.NODE_ENV === 'development') {
  ALLOWED.push('http://localhost:3000', 'http://localhost:8080')
}

function isAllowed(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED.some(p => (typeof p === 'string' ? origin === p : p.test(origin)))
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin')
  const allowed = isAllowed(origin)

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
  if (allowed && origin) corsHeaders['Access-Control-Allow-Origin'] = origin

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders })
  }

  const res = NextResponse.next()
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export const config = { matcher: '/api/:path*' }
