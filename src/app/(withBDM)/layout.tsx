"use client";

import SidebarBDM from "@/components/shared/SidebarBDM";
import SidebarAdmin from "@/components/shared/SidebarAdmin";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/app/helpers/jwt";
import { useState, useEffect } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null); // Track user role

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login"); // Redirect if user is not logged in
      return;
    }

    // Fetch and set the user role dynamically
    const role = fetchUserRole(); // Replace with your logic to fetch the role
    setUserRole(role);
  }, [router]);

  // Function to fetch user role
  const fetchUserRole = (): string => {
    // Replace with your logic to fetch the user role
    return "bdm"; // Example role
  };

  if (!userRole) {
    return null; // Prevent layout rendering until the user role is determined
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/5 bg-gray-100 md:min-h-screen p-4">
        {userRole === "admin" ? (
          <SidebarAdmin />
        ) : userRole === "bdm" ? (
          <SidebarBDM /> // Render BDM-specific sidebar
        ) : (
          <SidebarBDM />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full md:w-4/5 p-2">
        <div className="p-2">{children}</div>
      </div>
    </div>
  );
}
