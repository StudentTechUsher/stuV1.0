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
 * For students, also includes student-specific fields from the student table
 */
export async function getVerifiedUserProfile() {
  const user = await getVerifiedUser()
  if (!user) return null

  try {
    const supabase = await createSupabaseServerComponentClient()

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return null
    }

    // If user is a student (role_id = 3), join with student table
    if (profile.role_id === 3) {
      const { data: student, error: studentError } = await supabase
        .from('student')
        .select('est_grad_date, est_grad_term, career_goals, admission_year, is_transfer')
        .eq('profile_id', user.id)
        .maybeSingle()

      if (studentError) {
        console.error('Error fetching student data:', studentError)
      } else if (student) {
        // Merge student fields into profile
        // Map est_grad_term to est_grad_sem for backward compatibility
        return {
          ...profile,
          est_grad_date: student.est_grad_date,
          est_grad_sem: student.est_grad_term,
          career_goals: student.career_goals,
          admission_year: student.admission_year,
          is_transfer: student.is_transfer,
        }
      }
    }

    return profile
  } catch (error) {
    console.error('Error in getVerifiedUserProfile:', error)
    return null
  }
}
