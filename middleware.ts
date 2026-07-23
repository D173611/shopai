import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Safety check for env variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing Supabase Environment Variables in Middleware')
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Use getSession() instead of getUser() to prevent hard crashes
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  const { pathname } = request.nextUrl

  // Helper function to handle redirects while preserving Supabase auth cookies
  const redirectWithCookies = (url: URL) => {
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie)
    })
    return response
  }

  // 1. Protect /dashboard - owner only
  if (pathname.startsWith('/dashboard')) {
    if (!user) return redirectWithCookies(new URL('/login', request.url))

    const role = user.user_metadata?.role
    if (role === 'cashier') {
      const slug = user.user_metadata?.shop_slug
      if (!slug) {
        return redirectWithCookies(new URL('/login?error=no-shop', request.url))
      }
      return redirectWithCookies(new URL(`/${slug}/cashier-login`, request.url))
    }
  }

  // 2. Protect cashier routes
  if (pathname.includes('/cashier-login')) {
    if (!user) {
      const slug = pathname.split('/')[1]
      if (!slug || slug === 'undefined') {
        return redirectWithCookies(new URL('/login?error=invalid-shop', request.url))
      }
      return redirectWithCookies(new URL(`/${slug}/cashier-login`, request.url))
    }
  }

  // 3. Prevent logged-in users from hitting /login or /signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const role = user.user_metadata?.role

    if (role === 'cashier') {
      const slug = user.user_metadata?.shop_slug
      if (!slug) {
        return redirectWithCookies(new URL('/login?error=no-shop', request.url))
      }
      return redirectWithCookies(new URL(`/${slug}/cashier-login`, request.url))
    }

    return redirectWithCookies(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
