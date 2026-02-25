import 'server-only'

import { createHmac } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { AnalyticsConsent } from '@/lib/identity/constants'

type LinkMethod = 'cookie' | 'email_hash' | 'explicit'

interface EnsureAnonymousIdentityInput {
  anonId: string
  path?: string | null
  userAgent?: string | null
  analyticsConsent?: AnalyticsConsent
}

interface RememberAnonymousEmailInput {
  anonId: string
  email: string
}

interface ClaimAnonymousIdentityInput {
  userId: string
  anonId?: string | null
  email?: string | null
}

interface ClaimAnonymousIdentityResult {
  linkedAnonIds: string[]
  linkRowsUpserted: number
  anonymousEventsClaimed: number
  usedEmailHashLookup: boolean
}

function nowIso(): string {
  return new Date().toISOString()
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505'
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function getIdentityHmacSecret(): string | null {
  const secret = process.env.IDENTITY_LINK_HMAC_SECRET
  if (!secret || !secret.trim()) {
    return null
  }
  return secret
}

export function hashEmailForIdentityLinking(email: string): string | null {
  const secret = getIdentityHmacSecret()
  if (!secret) {
    return null
  }

  return createHmac('sha256', secret).update(normalizeEmail(email)).digest('hex')
}

export async function ensureAnonymousIdentity({
  anonId,
  path,
  userAgent,
  analyticsConsent,
}: EnsureAnonymousIdentityInput): Promise<void> {
  const timestamp = nowIso()

  const { error: insertError } = await supabaseAdmin
    .from('anonymous_identities')
    .insert({
      anon_id: anonId,
      first_seen_at: timestamp,
      last_seen_at: timestamp,
      first_path: path ?? null,
      last_path: path ?? null,
      user_agent: userAgent ?? null,
      analytics_consent: analyticsConsent ?? null,
      updated_at: timestamp,
    })

  if (insertError && !isUniqueViolation(insertError)) {
    throw insertError
  }

  const updatePayload: Record<string, unknown> = {
    last_seen_at: timestamp,
    updated_at: timestamp,
  }

  if (path) {
    updatePayload.last_path = path
  }
  if (userAgent) {
    updatePayload.user_agent = userAgent
  }
  if (analyticsConsent) {
    updatePayload.analytics_consent = analyticsConsent
  }

  const { error: updateError } = await supabaseAdmin
    .from('anonymous_identities')
    .update(updatePayload)
    .eq('anon_id', anonId)

  if (updateError) {
    throw updateError
  }
}

export async function rememberAnonymousEmail({
  anonId,
  email,
}: RememberAnonymousEmailInput): Promise<{ stored: boolean; reason?: string }> {
  const normalized = normalizeEmail(email)
  if (!normalized) {
    return { stored: false, reason: 'empty_email' }
  }

  const emailHash = hashEmailForIdentityLinking(normalized)
  if (!emailHash) {
    return { stored: false, reason: 'hash_secret_missing' }
  }

  await ensureAnonymousIdentity({ anonId })

  const timestamp = nowIso()

  const { error: insertError } = await supabaseAdmin
    .from('anonymous_identity_emails')
    .insert({
      anon_id: anonId,
      email_hash: emailHash,
      first_seen_at: timestamp,
      last_seen_at: timestamp,
      updated_at: timestamp,
    })

  if (insertError && !isUniqueViolation(insertError)) {
    throw insertError
  }

  const { error: updateError } = await supabaseAdmin
    .from('anonymous_identity_emails')
    .update({
      last_seen_at: timestamp,
      updated_at: timestamp,
    })
    .eq('anon_id', anonId)
    .eq('email_hash', emailHash)

  if (updateError) {
    throw updateError
  }

  return { stored: true }
}

export async function recordAnonymousEvent(args: {
  anonId: string
  eventName: string
  eventProperties?: Record<string, unknown>
  userId?: string | null
}): Promise<void> {
  const { anonId, eventName, eventProperties, userId } = args

  await ensureAnonymousIdentity({ anonId })

  const { error } = await supabaseAdmin
    .from('anonymous_events')
    .insert({
      anon_id: anonId,
      user_id: userId ?? null,
      event_name: eventName,
      event_properties: eventProperties ?? {},
    })

  if (error) {
    throw error
  }
}

function addCandidate(
  candidates: Map<string, LinkMethod>,
  anonId: string,
  method: LinkMethod
): void {
  const existing = candidates.get(anonId)
  if (existing === 'cookie' || existing === 'explicit') {
    return
  }
  candidates.set(anonId, method)
}

export async function claimAnonymousIdentityForUser({
  userId,
  anonId,
  email,
}: ClaimAnonymousIdentityInput): Promise<ClaimAnonymousIdentityResult> {
  const candidates = new Map<string, LinkMethod>()

  if (anonId) {
    addCandidate(candidates, anonId, 'cookie')
  }

  let usedEmailHashLookup = false
  const emailHash = email ? hashEmailForIdentityLinking(email) : null

  if (anonId && email) {
    try {
      await rememberAnonymousEmail({ anonId, email })
    } catch (rememberError) {
      console.warn('Failed to seed anonymous email hash mapping during claim', rememberError)
    }
  }

  if (email && emailHash) {
    usedEmailHashLookup = true
    const { data: emailMatches, error: emailLookupError } = await supabaseAdmin
      .from('anonymous_identity_emails')
      .select('anon_id')
      .eq('email_hash', emailHash)

    if (emailLookupError) {
      throw emailLookupError
    }

    for (const match of emailMatches ?? []) {
      if (typeof match.anon_id === 'string' && match.anon_id.length > 0) {
        addCandidate(candidates, match.anon_id, 'email_hash')
      }
    }
  }

  const linkedAnonIds = Array.from(candidates.keys())
  if (linkedAnonIds.length === 0) {
    return {
      linkedAnonIds: [],
      linkRowsUpserted: 0,
      anonymousEventsClaimed: 0,
      usedEmailHashLookup,
    }
  }

  const timestamp = nowIso()
  const linkRows = linkedAnonIds.map((candidateAnonId) => ({
    anon_id: candidateAnonId,
    user_id: userId,
    link_method: candidates.get(candidateAnonId) ?? 'explicit',
    linked_at: timestamp,
    created_at: timestamp,
  }))

  const { error: linkError } = await supabaseAdmin
    .from('anonymous_identity_links')
    .upsert(linkRows, { onConflict: 'anon_id,user_id' })

  if (linkError) {
    throw linkError
  }

  const { data: claimedEvents, error: claimEventsError } = await supabaseAdmin
    .from('anonymous_events')
    .update({ user_id: userId })
    .in('anon_id', linkedAnonIds)
    .is('user_id', null)
    .select('id')

  if (claimEventsError) {
    throw claimEventsError
  }

  return {
    linkedAnonIds,
    linkRowsUpserted: linkRows.length,
    anonymousEventsClaimed: claimedEvents?.length ?? 0,
    usedEmailHashLookup,
  }
}
