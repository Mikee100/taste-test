import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNext } from '@/lib/safe-next'

function redirectKeepingCookies(url: URL, from: NextResponse) {
  const res = NextResponse.redirect(url)
  from.cookies.getAll().forEach((c) => res.cookies.set(c))
  return res
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Always use getUser() here: it verifies the session with Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, searchParams } = request.nextUrl

  // Signed out and trying to vote: send to login, remember where they were going
  if (!user && pathname.startsWith('/vote')) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return redirectKeepingCookies(url, response)
  }

  // Already signed in and on the login page: skip it
  if (user && pathname === '/login') {
    const next = safeNext(searchParams.get('next'))
    return redirectKeepingCookies(new URL(next, request.url), response)
  }

  return response
}