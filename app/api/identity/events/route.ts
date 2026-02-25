import { NextRequest, NextResponse } from 'next/server'
import {
  generateAnonId,
  getAnonIdFromRequest,
  setAnonIdCookie,
} from '@/lib/identity/anonymous-cookie'
import { ensureAnonymousIdentity, recordAnonymousEvent } from '@/lib/services/anonymousIdentityService'
import { createSupabaseServerComponentClient } from '@/lib/supabase/server'

interface AnonymousEventBody {
  eventName?: string
  properties?: Record<string, unknown>
  path?: string
}

export async function POST(request: NextRequest) {
  const anonId = getAnonIdFromRequest(request) ?? generateAnonId()

  try {
    const body = (await request.json()) as AnonymousEventBody
    const eventName = body?.eventName?.trim()

    if (!eventName) {
      const response = NextResponse.json(
        { success: false, error: 'eventName is required' },
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

    const supabase = await createSupabaseServerComponentClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await recordAnonymousEvent({
      anonId,
      eventName,
      eventProperties: body.properties,
      userId: user?.id ?? null,
    })

    const response = NextResponse.json({ success: true })
    setAnonIdCookie(request, response, anonId)
    return response
  } catch (error) {
    console.error('Failed to record anonymous event', error)
    const response = NextResponse.json(
      { success: false, error: 'Failed to record event' },
      { status: 500 }
    )
    setAnonIdCookie(request, response, anonId)
    return response
  }
}
