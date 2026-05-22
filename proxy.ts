import { clerkClient, clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = new URL(req.url)

  // Unauthorized page is always public to avoid redirect loops
  if (pathname.startsWith('/no-autorizado')) return

  // Redirect to sign-in if not authenticated
  await auth.protect()

  // Fetch user to read publicMetadata (not present in default JWT claims)
  const { userId } = await auth()
  const client = await clerkClient()
  const user = await client.users.getUser(userId!)
  const role = (user.publicMetadata as { role?: string })?.role

  if (role !== 'admin') {
    return NextResponse.redirect(new URL('/no-autorizado', req.url))
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/(.*)',
    '/(api|trpc)(.*)',
  ],
}
