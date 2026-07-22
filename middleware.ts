import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // FIX 1: Use getSession() instead of getUser() - won't throw
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  const { pathname } = request.nextUrl

  // 1. Protect /dashboard - owner only
  if (pathname.startsWith('/dashboard')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))

    const role = user.user_metadata?.role
    if (role === 'cashier') {
      const slug = user.user_metadata?.shop_slug
      if (!slug) {
        // Don't signOut in middleware - just redirect
        return NextResponse.redirect(new URL('/login?error=no-shop', request.url))
      }
      return NextResponse.redirect(new URL(`/${slug}/cashier-login`, request.url))
    }

    // FIX 2: REMOVE DB QUERY - Do this check in the /dashboard page instead
    // const { data: shop } = await supabase.from('shops')...
  }

  // 2. Protect cashier routes
  if (pathname.includes('/cashier-login')) {
    if (!user) {
      const slug = pathname.split('/')[1]
      if (!slug || slug === 'undefined') {
        return NextResponse.redirect(new URL('/login?error=invalid-shop', request.url))
      }
      return NextResponse.redirect(new URL(`/${slug}/cashier-login`, request.url))
    }
  }

  // 3. Prevent logged-in users from hitting /login or /signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const role = user.user_metadata?.role

    if (role === 'cashier') {
      const slug = user.user_metadata?.shop_slug
      if (!slug) {
        return NextResponse.redirect(new URL('/login?error=no-shop', request.url))
      }
      return NextResponse.redirect(new URL(`/${slug}/cashier-login`, request.url))
    }

    // FIX 2: REMOVE DB QUERY - Redirect all owners to dashboard
    // Let the dashboard page check if shop exists
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
