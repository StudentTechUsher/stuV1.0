import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureAnonIdCookie } from '@/lib/identity/anonymous-cookie'

const LANDING_ORIGIN = process.env.NEXT_PUBLIC_LANDING_ORIGIN || 'https://stuplanning.com'

const marketingPaths = [
  '/about-us',
  '/demo',
  '/how-it-works',
  '/landing',
  '/landing-template',
  '/privacy-policy',
  '/security',
  '/services',
]

const publicPaths = [
  '/create-account',
  '/login',
  '/signup',
]

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

function pathMatches(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

function copySetCookieHeaders(source: NextResponse, target: NextResponse): void {
  const sourceHeaders = source.headers as Headers & {
    getSetCookie?: () => string[]
  }

  if (typeof sourceHeaders.getSetCookie === 'function') {
    const setCookieHeaders = sourceHeaders.getSetCookie()
    setCookieHeaders.forEach((headerValue) => {
      target.headers.append('set-cookie', headerValue)
    })
    return
  }

  const fallbackSetCookie = source.headers.get('set-cookie')
  if (fallbackSetCookie) {
    target.headers.append('set-cookie', fallbackSetCookie)
  }
}

function isMarketingPath(pathname: string): boolean {
  return marketingPaths.some((path) => pathMatches(pathname, path))
}

/**
 * Handle authentication-based redirects
 */
function handleAuthRedirects(
  request: NextRequest,
  session: unknown,
): NextResponse | null {
  const pathname = request.nextUrl.pathname

  // Marketing routes are now owned by the standalone landing app.
  if (isMarketingPath(pathname)) {
    return NextResponse.redirect(`${LANDING_ORIGIN}${pathname}${request.nextUrl.search}`, 307)
  }

  // Root now serves app entry only.
  if (pathname === '/') {
    return NextResponse.redirect(new URL(session ? '/dashboard' : '/login', request.url))
  }

  const isPublicPath =
    publicPaths.includes(pathname) || pathname.startsWith('/auth/') || pathname.startsWith('/api/')

  // If not a public path and no session, redirect to login.
  if (!isPublicPath && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  // Auth pages - redirect to dashboard if logged in.
  const authPages = ['/login', '/signup', '/create-account']
  const isAuthPage = authPages.includes(pathname)

  if (isAuthPage && session) {
    const redirectTo = request.nextUrl.searchParams.get('next') || '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return null
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()
  ensureAnonIdCookie(request, response)

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

  // Verify auth by calling getUser() which validates the JWT server-side.
  // getSession() only reads cookies without verification, which can cause
  // redirect loops when stale/invalid cookies exist.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    // AuthSessionMissingError is expected for unauthenticated users
    if (error.code !== 'session_not_found' && error.message !== 'Auth session missing!') {
      console.error('Proxy auth error:', error.message)
    }

    // Clear invalid/corrupted auth cookies to prevent stuck state
    const cookiesToClear = ['sb-auth-token', 'sb-refresh-token']

    cookiesToClear.forEach((cookieName) => {
      response.cookies.delete(cookieName)
    })

    // Also clear any Supabase cookies that match the pattern
    const allCookies = request.cookies.getAll()
    allCookies.forEach((cookie) => {
      if (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')) {
        response.cookies.delete(cookie.name)
      }
    })
  }

  // Handle auth-based redirects
  const authRedirect = handleAuthRedirects(request, user)
  if (authRedirect) {
    copySetCookieHeaders(response, authRedirect)
    ensureAnonIdCookie(request, authRedirect)

    // If we're redirecting due to no session, make sure to clear cookies in the redirect response too
    if (!user) {
      const cookiesToClear = request.cookies
        .getAll()
        .filter((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token'))

      cookiesToClear.forEach((cookie) => {
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
