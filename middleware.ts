import { NextRequest, NextResponse } from "next/server";

export default function middleware(req: NextRequest) {
  const verify = req.cookies.get("loggedin");
  const { pathname, origin } = req.nextUrl;

  const protectedRoutes = ["/dashboard", "/admin", "/bdm", "/booking"];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!verify && isProtectedRoute) {
    return NextResponse.redirect(`${origin}/login`);
  }

  if (verify && pathname === "/") {
    return NextResponse.redirect(`${origin}/dashboard`);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
