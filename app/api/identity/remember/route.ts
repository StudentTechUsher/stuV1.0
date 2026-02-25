import { NextRequest, NextResponse } from 'next/server'
import {
  generateAnonId,
  getAnonIdFromRequest,
  setAnonIdCookie,
} from '@/lib/identity/anonymous-cookie'
import { ensureAnonymousIdentity, rememberAnonymousEmail } from '@/lib/services/anonymousIdentityService'

interface RememberBody {
  email?: string
  path?: string
}

function isValidEmail(email: string): boolean {
  // Intentionally simple client-safe validation; server-side hashing still normalizes input.
  return /\S+@\S+\.\S+/.test(email)
}

export async function POST(request: NextRequest) {
  const anonId = getAnonIdFromRequest(request) ?? generateAnonId()

  try {
    const body = (await request.json()) as RememberBody
    const email = body?.email?.trim()

    if (!email || !isValidEmail(email)) {
      const response = NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      )
      setAnonIdCookie(request, response, anonId)
      return response
    }

    await ensureAnonymousIdentity({
      anonId,
      path: body.path ?? null,
      userAgent: request.headers.get('user-agent'),
    })

    const result = await rememberAnonymousEmail({ anonId, email })

    const response = NextResponse.json({
      success: result.stored,
      reason: result.reason,
    })
    setAnonIdCookie(request, response, anonId)
    return response
  } catch (error) {
    console.error('Failed to remember anonymous email hash', error)
    const response = NextResponse.json(
      { success: false, error: 'Failed to remember identity hint' },
      { status: 500 }
    )
    setAnonIdCookie(request, response, anonId)
    return response
  }
}
