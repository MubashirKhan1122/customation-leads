import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/free-audit', '/unsubscribe', '/api/free-audit', '/api/track', '/api/unsubscribe', '/api/cron']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname === '/') {
    return NextResponse.next()
  }

  // Check for auth cookie
  const authCookie = req.cookies.get('auth_token')?.value
  if (!authCookie) {
    // Redirect to login for pages, return 401 for APIs
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
