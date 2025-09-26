"use client"
import { useState } from 'react'
import { isDev } from '@/lib/env'

// Lightweight UI component to paste a Supabase access JWT and bypass auth in dev.
// Shows only when NEXT_PUBLIC_ENV resolves to dev.

export default function DevAuthToggle() {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isDev) return null

  async function applyToken() {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/dev-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setStatus(`Impersonating ${data.email || data.userId}`)
    } catch (e: any) {
      setStatus('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function clearToken() {
    setLoading(true)
    setStatus(null)
    try {
      await fetch('/api/dev-auth', { method: 'DELETE' })
      setStatus('Bypass cleared')
    } catch (e: any) {
      setStatus('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 1000 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: '#111827',
          color: 'white',
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 12,
          opacity: 0.8
        }}
      >{open ? 'Close Dev Auth' : 'Dev Auth'}</button>
      {open && (
        <div style={{ marginTop: 8, width: 300, background: '#1f2937', color: 'white', padding: 12, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>Dev Auth Bypass</p>
          <textarea
            placeholder="Paste access JWT here"
            value={token}
            onChange={e => setToken(e.target.value)}
            style={{ width: '100%', minHeight: 100, fontSize: 11, fontFamily: 'monospace', background: '#374151', color: 'white', border: '1px solid #4b5563', borderRadius: 4, padding: 6, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={!token || loading} onClick={applyToken} style={{ flex: 1, background: '#2563eb', color: 'white', padding: '6px 8px', borderRadius: 4, fontSize: 12 }}>{loading ? '...' : 'Apply'}</button>
            <button disabled={loading} onClick={clearToken} style={{ flex: 1, background: '#6b7280', color: 'white', padding: '6px 8px', borderRadius: 4, fontSize: 12 }}>Clear</button>
          </div>
          {status && <p style={{ marginTop: 8, fontSize: 11 }}>{status}</p>}
          <p style={{ marginTop: 6, fontSize: 10, opacity: 0.7 }}>JWT is stored in an HttpOnly cookie (DEV_BYPASS_JWT). Refresh pages to test as that user.</p>
        </div>
      )}
    </div>
  )
}
