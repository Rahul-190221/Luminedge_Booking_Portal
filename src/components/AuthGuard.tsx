"use client";

import { isLoggedIn, getUserRoleFromToken } from "@/app/helpers/jwt";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Role = "admin" | "bdm" | "teacher" | "user";

// Where each role belongs — mirrors homeForRole() in middleware.ts so a
// wrong-role user is sent to their own dashboard instead of a forbidden area.
const homeForRole = (role?: string | null): string => {
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
};

// Client-side route guard. Redirects logged-out/expired sessions to /login and,
// when a `role` is given, redirects wrong-role users to their own dashboard —
// BEFORE protected children mount, so they never fire authenticated fetches.
export default function AuthGuard({
  role,
  children,
}: Readonly<{ role?: Role; children: React.ReactNode }>) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    if (role && getUserRoleFromToken() !== role) {
      router.push(homeForRole(getUserRoleFromToken()));
      return;
    }
    setAuthed(true);
  }, [router, role]);

  if (!authed) return null;
  return <>{children}</>;
}
