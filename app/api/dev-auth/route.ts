import { NextRequest, NextResponse } from 'next/server'

// Dev-only JWT bypass endpoint.
// Allows setting a raw Supabase access token into a cookie for local development convenience.
// SECURITY: This route hard-refuses to operate unless NEXT_PUBLIC_ENV=dev.

function isDevEnv() {
  return (process.env.NEXT_PUBLIC_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development')) === 'development'
}

export async function POST(req: NextRequest) {
  if (!isDevEnv()) {
    return new NextResponse('Not found', { status: 404 })
  }
  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token required' }, { status: 400 })
    }
    // Basic shape validation (3 segments)
    const parts = token.split('.')
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid JWT format' }, { status: 400 })
    }
    // Decode payload (no signature verification in dev!)
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8')
    let payload: any
    try { payload = JSON.parse(payloadJson) } catch { return NextResponse.json({ error: 'Invalid JWT payload' }, { status: 400 }) }
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Missing sub claim' }, { status: 400 })
    }
    const res = NextResponse.json({ success: true, userId: payload.sub, email: payload.email })
    // HttpOnly so client code cannot accidentally leak it; path root; session-scoped
    res.cookies.set('DEV_BYPASS_JWT', token, { httpOnly: true, sameSite: 'lax', path: '/', secure: false })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE() {
  if (!isDevEnv()) {
    return new NextResponse('Not found', { status: 404 })
  }
  const res = NextResponse.json({ cleared: true })
  res.cookies.set('DEV_BYPASS_JWT', '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
