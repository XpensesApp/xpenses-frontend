/** Pages reachable without a session — keep in sync with proxy.ts's matcher. The app chrome (Navbar, SessionWatcher) must stay out of them: there's no session there to watch. */
export function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/auth/callback";
}
