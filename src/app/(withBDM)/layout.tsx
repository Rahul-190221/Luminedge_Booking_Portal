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
      <div className="w-full md:w-1/5 bg-[#ffffff] text-[#00000f] shadow-1xl rounded-1xl md:rounded-2xl border md:border-2 md:min-h-screen p-3 relative">
        {userRole === "admin" ? (
          <SidebarAdmin />
        ) : userRole === "bdm" ? (
          <SidebarBDM /> // Render BDM-specific sidebar
        ) : (
          <SidebarBDM />
          
        )}
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-px bg-gray-200"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full md:w-4/5 p-0">
        <div className="p-0">{children}</div>
      </div>
    </div>
  );
}
