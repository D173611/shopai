import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // ❌ REMOVE THIS LINE - Next 15 doesn't allow it
          // cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // 1. Protect /dashboard - owner only
  if (pathname.startsWith('/dashboard')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))

    const role = user.user_metadata?.role
    if (role === 'cashier') {
      const slug = user.user_metadata?.shop_slug
      if (!slug) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=no-shop', request.url))
      }
      return NextResponse.redirect(new URL(`/${slug}/cashier-login`, request.url))
    }

    const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

    if (!shop &&!pathname.startsWith('/signup')) {
      return NextResponse.redirect(new URL('/signup', request.url))
    }
  }

  // 2. Protect cashier routes - must be logged in
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
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=no-shop', request.url))
      }
      return NextResponse.redirect(new URL(`/${slug}/cashier-login`, request.url))
    }

    const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

    if (shop) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}