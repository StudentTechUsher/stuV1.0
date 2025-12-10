import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Parse subdomain from the host header
 */
function parseSubdomain(host: string | null): string {
  if (!host) return 'stu'

  // For localhost development, always use 'stu'
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'stu'
  }

  const parts = host.split('.')
  const hasSubdomain = parts.length > 2 || (parts.length === 2 && !parts[0].includes('localhost'))

  if (!hasSubdomain) return 'stu'

  return parts[0] === 'www' ? 'stu' : parts[0]
}

/**
 * Handle authentication-based redirects
 */
function handleAuthRedirects(
  request: NextRequest,
  session: unknown
): NextResponse | null {
  const pathname = request.nextUrl.pathname

  // Public paths that don't require authentication
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/demo',
    '/about-us',
    '/privacy-policy',
    '/home',
    '/landing',
    '/how-it-works',
    '/security',
  ]

  const isPublicPath = publicPaths.includes(pathname) ||
                       pathname.startsWith('/auth/') ||
                       pathname.startsWith('/api/')

  // If not a public path and no session, redirect to login
  if (!isPublicPath && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  // Auth pages and landing page - redirect to dashboard if logged in
  const authPages = ['/', '/login', '/signup']
  const isAuthPage = authPages.includes(pathname)

  if (isAuthPage && session) {
    const redirectTo = request.nextUrl.searchParams.get('next') || '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return null
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname

  // Parse and set subdomain
  const host = request.headers.get('host')
  const subdomain = parseSubdomain(host)
  response.headers.set('x-subdomain', subdomain)

  // Create Supabase client for server-side operations
  const supabase = createSupabaseServerClient(request, response)

  // Look up university by subdomain (public data, no auth needed)
  const { data: university } = await supabase
    .from('university')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (university) {
    response.headers.set('x-university', JSON.stringify(university))
  }

  // Get session and handle auth errors
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    // Auth session missing is expected for unauthenticated users
    // Only log unexpected errors
    if (error.message !== 'Auth session missing!') {
      console.error('Middleware auth error:', error.message)
    }

    // Clear invalid/corrupted auth cookies to prevent stuck state
    const cookiesToClear = [
      'sb-auth-token',
      'sb-refresh-token',
    ]

    cookiesToClear.forEach(cookieName => {
      response.cookies.delete(cookieName)
    })

    // Also clear any Supabase cookies that match the pattern
    const allCookies = request.cookies.getAll()
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')) {
        response.cookies.delete(cookie.name)
      }
    })
  }

  // Handle auth-based redirects
  const authRedirect = handleAuthRedirects(request, session)
  if (authRedirect) {
    // If we're redirecting due to no session, make sure to clear cookies in the redirect response too
    if (!session) {
      const cookiesToClear = request.cookies.getAll()
        .filter(cookie => cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token'))

      cookiesToClear.forEach(cookie => {
        authRedirect.cookies.delete(cookie.name)
      })
    }

    return authRedirect
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
     * - auth/callback (authentication callback handler)
     * - api/ (API routes - handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
