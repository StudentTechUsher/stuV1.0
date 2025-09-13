import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with proper cookie handling
    const response = NextResponse.next()
    const supabase = createSupabaseServerClient(request, response)
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }
    
    // Fetch the user's profile - RLS will ensure they can only see their own data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile' }, 
        { status: 500 }
      )
    }
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' }, 
        { status: 404 }
      )
    }
    
    // Return the profile data
    return NextResponse.json({
      id: profile.id,
      university_id: profile.university_id,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      // Add other profile fields as needed
    })
    
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}