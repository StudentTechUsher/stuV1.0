'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  accessToken: string | null
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ data: unknown; error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  refreshSession: () => Promise<{ data: unknown; error: AuthError | null }>
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>
}

export function useAuth(): AuthState & AuthActions {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  
  const supabase = createSupabaseBrowserClient()

  // Get current access token from memory
  const getAccessToken = useCallback((): string | null => {
    return accessToken
  }, [accessToken])

  // Refresh session and update tokens
  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession()
    if (data.session) {
      setSession(data.session)
      setUser(data.session.user)
      setAccessToken(data.session.access_token)
    }
    return { data, error }
  }, [supabase])

  // Fetch with automatic auth retry on 401
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = getAccessToken()
    
    const makeRequest = (authToken: string | null) => {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...options.headers,
      }
      
      return fetch(url, {
        ...options,
        headers,
      })
    }

    // First attempt
    let response = await makeRequest(token)
    
    // If 401, try to refresh and retry once
    if (response.status === 401 && token) {
      console.log('401 received, attempting token refresh...')
      const { data: refreshData, error: refreshError } = await refreshSession()
      
      if (!refreshError && refreshData.session) {
        // Retry with new token
        response = await makeRequest(refreshData.session.access_token)
      }
    }
    
    return response
  }, [getAccessToken, refreshSession])

  // Auth actions
  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    return { data, error }
  }, [supabase])

  const signUp = useCallback(async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    setLoading(false)
    return { data, error }
  }, [supabase])

  const signOut = useCallback(async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setLoading(false)
    return { error }
  }, [supabase])

  // Initialize and listen for auth changes
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting initial session:', error)
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      setAccessToken(session?.access_token ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id)
        
        setSession(session)
        setUser(session?.user ?? null)
        setAccessToken(session?.access_token ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  return {
    user,
    session,
    loading,
    accessToken,
    signIn,
    signUp,
    signOut,
    refreshSession,
    fetchWithAuth,
  }
}