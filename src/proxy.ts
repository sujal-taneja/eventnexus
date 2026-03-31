/**
 * Proxy (formerly middleware) — route protection at the edge.
 *
 * Runs before matched requests and uses lightweight auth config only.
 */
import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/profile");

  const isOrganizerRoute = pathname.startsWith("/organizer");

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return Response.redirect(loginUrl);
  }

  // Organizer routes only require login here.
  // Role checks are done in /organizer layout with full server auth context.
  if (isOrganizerRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return Response.redirect(loginUrl);
  }

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  if (isAuthPage && isLoggedIn) {
    return Response.redirect(new URL("/events", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

