import { createSupabaseServerComponentClient } from './server'
import type { User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function isDevEnv() {
  return (process.env.NEXT_PUBLIC_ENV || (process.env.NODE_ENV === 'production' ? 'prod' : 'dev')) === 'dev'
}

/** Attempt to build a faux Supabase User from a dev bypass JWT cookie (DEV_BYPASS_JWT) */
async function getDevBypassUser(): Promise<User | null> {
  if (!isDevEnv()) return null
  try {
    const store = await cookies()
    const raw = store.get('DEV_BYPASS_JWT')?.value
    if (!raw) return null
    const parts = raw.split('.')
    if (parts.length !== 3) return null
    const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8')
    const payload = JSON.parse(payloadStr)
    if (!payload?.sub) return null
    const user: Partial<User> = {
      id: payload.sub,
      email: payload.email,
      aud: payload.aud || 'authenticated',
      app_metadata: payload.app_metadata || {},
      user_metadata: payload.user_metadata || {},
      role: 'authenticated'
    }
    return user as User
  } catch {
    return null
  }
}

/**
 * Server-side user verification - validates session and returns user if authenticated
 * Returns null if no valid session
 */
export async function getVerifiedUser(): Promise<User | null> {
  try {
    // Dev bypass first
    const devUser = await getDevBypassUser()
    if (devUser) return devUser

    const supabase = await createSupabaseServerComponentClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.log('Auth verification failed:', error?.message || 'No user')
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error verifying user:', error)
    return null
  }
}

/**
 * Get user profile data with verification
 * Only returns profile data for the authenticated user
 */
export async function getVerifiedUserProfile() {
  const user = await getVerifiedUser()
  if (!user) return null
  
  try {
    const supabase = await createSupabaseServerComponentClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
    
    return profile
  } catch (error) {
    console.error('Error in getVerifiedUserProfile:', error)
    return null
  }
}