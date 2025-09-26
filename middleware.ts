import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  // Create a response object
  const response = NextResponse.next()

  // Parse subdomain from host header
  const host = request.headers.get('host')
  let subdomain = 'stu' // default subdomain

  if (host) {
    const parts = host.split('.')
    // If we have a subdomain (more than just domain.com)
    if (parts.length > 2 || (parts.length === 2 && !parts[0].includes('localhost'))) {
      subdomain = parts[0] === 'www' ? 'stu' : parts[0]
    }
    // For localhost development, keep 'stu' as default
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      subdomain = 'stu'
    }
  }

  // Set subdomain in response headers for client-side access
  response.headers.set('x-subdomain', subdomain)

  // Create Supabase client for server-side operations
  const supabase = createSupabaseServerClient(request, response)

  // Look up university by subdomain (this is public data, no auth needed)
  const { data: university } = await supabase
    .from('university')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  // Set university data in response headers for client-side access
  if (university) {
    response.headers.set('x-university', JSON.stringify(university))
  }

  // Refresh session if expired - this will set new cookies if needed
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Middleware auth error:', error.message)
  }

  // Protected routes - redirect to login if no session
  const protectedPaths = ['/dashboard']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Auth pages - redirect to dashboard if already logged in
  const authPaths = ['/login', '/signup']
  const isAuthPath = authPaths.includes(request.nextUrl.pathname)

  if (isAuthPath && session) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}