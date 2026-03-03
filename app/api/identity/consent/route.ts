import { NextRequest, NextResponse } from 'next/server'
import {
  generateAnonId,
  getAnonIdFromRequest,
  setAnonIdCookie,
} from '@/lib/identity/anonymous-cookie'
import { ANALYTICS_CONSENT_COOKIE_NAME, ANALYTICS_CONSENT_MAX_AGE_SECONDS } from '@/lib/identity/constants'
import { ensureAnonymousIdentity } from '@/lib/services/anonymousIdentityService'

interface ConsentRequestBody {
  consent?: 'granted' | 'denied'
  path?: string
}

function isValidConsent(value: unknown): value is 'granted' | 'denied' {
  return value === 'granted' || value === 'denied'
}

export async function POST(request: NextRequest) {
  const anonId = getAnonIdFromRequest(request) ?? generateAnonId()

  try {
    const body = (await request.json()) as ConsentRequestBody
    if (!isValidConsent(body?.consent)) {
      const response = NextResponse.json(
        { success: false, error: 'Invalid consent value' },
        { status: 400 }
      )
      setAnonIdCookie(request, response, anonId)
      return response
    }

    const response = NextResponse.json({ success: true })
    setAnonIdCookie(request, response, anonId)

    response.cookies.set({
      name: ANALYTICS_CONSENT_COOKIE_NAME,
      value: body.consent,
      path: '/',
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      maxAge: ANALYTICS_CONSENT_MAX_AGE_SECONDS,
    })

    await ensureAnonymousIdentity({
      anonId,
      path: body.path ?? null,
      userAgent: request.headers.get('user-agent'),
      analyticsConsent: body.consent,
    })

    return response
  } catch (error) {
    console.error('Failed to persist analytics consent', error)
    const response = NextResponse.json(
      { success: false, error: 'Failed to persist consent' },
      { status: 500 }
    )
    setAnonIdCookie(request, response, anonId)
    return response
  }
}
