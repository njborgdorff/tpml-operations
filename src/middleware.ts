export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/finished', '/projects/:path*'],
}
