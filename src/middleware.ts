import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  role?: string;
  exp?: number;
  [key: string]: unknown;
}

// Route prefixes that require a specific role.
const ROLE_ROUTES: Record<string, string> = {
  "/admin": "admin",
  "/bdm": "bdm",
  "/teacher": "teacher",
};

// Any authenticated user may access these (role checked above where applicable).
const PROTECTED_ROUTES = ["/dashboard", "/admin", "/bdm", "/teacher", "/booking"];

// Public auth pages a logged-in user has no reason to see; bounce them to their
// own dashboard so a valid session can't loop back through the login screen.
const AUTH_PAGES = ["/login", "/register"];

function homeForRole(role?: string): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "bdm":
      return "/bdm/dashboard";
    case "teacher":
      return "/teacher/dashboard";
    default:
      return "/dashboard";
  }
}

// Baseline security headers applied to EVERY response this middleware returns
// (pass-throughs and redirects alike). Deliberately conservative: no script-src
// CSP directive that could break Next's runtime / inline styles — only headers
// that are safe for a Next 14 app while closing clickjacking, MIME-sniffing and
// referrer-leak vectors.
function withSecurityHeaders(res: NextResponse, isHttps: boolean): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  // HSTS is only honoured (and only meaningful) over HTTPS.
  if (isHttps) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  return res;
}

export default function middleware(req: NextRequest) {
  const { pathname, origin, protocol } = req.nextUrl;
  // Behind a proxy (Vercel/Netlify) the real scheme is in x-forwarded-proto.
  const isHttps =
    protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https";

  const redirect = (to: string) =>
    withSecurityHeaders(NextResponse.redirect(`${origin}${to}`), isHttps);
  const next = () => withSecurityHeaders(NextResponse.next(), isHttps);

  const token = req.cookies.get("accessToken")?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Decode the token (expiry + role). Signature is verified by the backend on
  // every API call; this edge check is defense-in-depth + role-based routing.
  let payload: TokenPayload | null = null;
  if (token) {
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      const notExpired = !decoded.exp || decoded.exp * 1000 > Date.now();
      payload = notExpired ? decoded : null;
    } catch {
      payload = null;
    }
  }

  // Unauthenticated (or expired) users cannot see protected routes.
  if (!payload && isProtectedRoute) {
    return redirect("/login");
  }

  if (payload) {
    // Enforce role for role-specific areas; send mismatches to their own home.
    const requiredRole = Object.entries(ROLE_ROUTES).find(([prefix]) =>
      pathname.startsWith(prefix)
    )?.[1];
    if (requiredRole && payload.role !== requiredRole) {
      return redirect(homeForRole(payload.role));
    }

    // Logged-in users landing on "/" or an auth page go to their dashboard.
    const onAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
    if (pathname === "/" || onAuthPage) {
      return redirect(homeForRole(payload.role));
    }
  }

  return next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
