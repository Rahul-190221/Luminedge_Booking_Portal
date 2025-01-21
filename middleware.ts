import { NextRequest, NextResponse } from "next/server";

export default function middleware(req: NextRequest) {
  const verify = req.cookies.get("loggedin");
  const url = req.url;

  const protectedRoutes = [
    "/dashboard",
    "/admin",
    "/bdm",
    "/admin/create-schedule",
    "/booking"
  ];

  // Check if the request URL matches any of the protected routes
  const isProtectedRoute = protectedRoutes.some(route => url.startsWith(`https://luminedge.netlify.app${route}`));

  if (!verify && isProtectedRoute) {
    return NextResponse.redirect("https://luminedge.netlify.app/login");
  }

  if (verify && url === "https://luminedge.netlify.app/") {
    return NextResponse.redirect("https://luminedge.netlify.app/dashboard");
  }
}