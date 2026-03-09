import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/login')
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')

  // Allow auth API routes
  if (isApiRoute) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect to home if already logged in and trying to access login
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
