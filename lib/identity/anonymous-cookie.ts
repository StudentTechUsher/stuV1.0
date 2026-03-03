import type { NextRequest, NextResponse } from 'next/server'
import { ANON_ID_COOKIE_MAX_AGE_SECONDS, ANON_ID_COOKIE_NAME } from './constants'

const ANON_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/

export function isValidAnonId(value: string | null | undefined): value is string {
  if (!value) {
    return false
  }
  return ANON_ID_PATTERN.test(value)
}

export function generateAnonId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID()
  }

  return `anon_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
}

export function getAnonIdFromRequest(request: NextRequest): string | null {
  const value = request.cookies.get(ANON_ID_COOKIE_NAME)?.value
  return isValidAnonId(value) ? value : null
}

export function setAnonIdCookie(request: NextRequest, response: NextResponse, anonId: string): void {
  response.cookies.set({
    name: ANON_ID_COOKIE_NAME,
    value: anonId,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    maxAge: ANON_ID_COOKIE_MAX_AGE_SECONDS,
  })
}

export function ensureAnonIdCookie(request: NextRequest, response: NextResponse): string {
  const existing = getAnonIdFromRequest(request)
  if (existing) {
    return existing
  }

  const generated = generateAnonId()
  setAnonIdCookie(request, response, generated)
  return generated
}
