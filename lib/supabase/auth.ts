import { createSupabaseServerComponentClient } from './server'
import type { User } from '@supabase/supabase-js'

/**
 * Server-side user verification - validates session and returns user if authenticated
 * Returns null if no valid session
 */
export async function getVerifiedUser(): Promise<User | null> {
  try {
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