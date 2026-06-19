import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  if (pathname.startsWith("/api/auth")) return NextResponse.next()
  const isLoginPage = pathname === "/login"
  if (!isLoggedIn && !isLoginPage) return NextResponse.redirect(new URL("/login", req.url))
  if (isLoggedIn && isLoginPage) return NextResponse.redirect(new URL("/dashboard", req.url))
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
}
