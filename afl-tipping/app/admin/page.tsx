'use client'
import { useState } from 'react'

interface RoundInfo {
  year: number
  round: number
  isOpen: boolean
  cutoffTime: string
  firstGameTime: string
  games: { id: number; hteam: string; ateam: string; date: string }[]
}

interface ProcessResult {
  processed?: number
  perfectWinners?: string[]
  results?: { email: string; score: number; discountCode: string | null }[]
  message?: string
  error?: string
  incomplete?: string[]
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
}
const btnStyle = (color = '#1d4ed8'): React.CSSProperties => ({
  padding: '10px 20px', background: color, color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
})

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [round, setRound] = useState(1)
  const [roundInfo, setRoundInfo] = useState<RoundInfo | null>(null)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)

  async function checkRound() {
    setChecking(true)
    setRoundInfo(null)
    try {
      const res = await fetch('/api/fixtures')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRoundInfo(data)
      setYear(data.year)
      setRound(data.round)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error fetching round info')
    } finally {
      setChecking(false)
    }
  }

  async function processResults() {
    if (!secret) return alert('Enter admin secret first')
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/process-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ year, round }),
      })
      setResult(await res.json())
    } catch {
      setResult({ error: 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ marginBottom: 4 }}>AFL Tipping — Admin</h1>
      <p style={{ color: '#6b7280', marginTop: 0 }}>Process round results and send emails</p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Admin Secret</label>
        <input type="password" value={secret} onChange={e => setSecret(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Year</label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Round</label>
          <input type="number" value={round} onChange={e => setRound(Number(e.target.value))} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={checkRound} disabled={checking} style={btnStyle('#374151')}>
          {checking ? 'Checking...' : 'Check Current Round'}
        </button>
        <button onClick={processResults} disabled={loading || !secret} style={btnStyle()}>
          {loading ? 'Processing...' : `Process Round ${round} Results`}
        </button>
      </div>

      {roundInfo && (
        <div style={{ marginBottom: 24, padding: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <strong>Current Round: {roundInfo.year} R{roundInfo.round}</strong>
          <br />
          Status: <span style={{ color: roundInfo.isOpen ? '#16a34a' : '#dc2626' }}>
            {roundInfo.isOpen ? 'OPEN' : 'CLOSED'}
          </span>
          <br />
          Closes: {new Date(roundInfo.cutoffTime).toLocaleString('en-AU')}
          <br />
          Games: {roundInfo.games.length}
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            {roundInfo.games.map(g => (
              <li key={g.id} style={{ fontSize: 13 }}>
                {g.hteam} vs {g.ateam} — {new Date(g.date).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div style={{
          padding: 16, borderRadius: 8,
          background: result.error ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${result.error ? '#fca5a5' : '#86efac'}`,
        }}>
          {result.error ? (
            <>
              <strong style={{ color: '#dc2626' }}>Error:</strong> {result.error}
              {result.incomplete && (
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {result.incomplete.map(g => <li key={g}>{g}</li>)}
                </ul>
              )}
            </>
          ) : (
            <>
              <strong style={{ color: '#15803d' }}>
                ✓ Processed {result.processed} {result.processed === 1 ? 'entry' : 'entries'}
              </strong>
              {result.message && <p>{result.message}</p>}
              {!!result.perfectWinners?.length && (
                <p>🏆 Perfect tippers: {result.perfectWinners.join(', ')}</p>
              )}
              {!!result.results?.length && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 13 }}>View all results</summary>
                  <pre style={{ fontSize: 12, marginTop: 8, overflow: 'auto' }}>
                    {JSON.stringify(result.results, null, 2)}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
