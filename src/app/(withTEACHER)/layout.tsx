import AuthGuard from "@/components/AuthGuard";
import SidebarTeacher from "@/components/shared/SidebarTeacher";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard role="teacher">
      <div className="min-h-screen w-full flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-1/5 bg-[#ffffff] text-[#00000f] shadow-1xl rounded-1xl md:rounded-2xl border md:border-2 md:min-h-screen p-3 relative">
          <SidebarTeacher />
          <div className="hidden md:block absolute right-0 top-0 bottom-0 w-px bg-gray-200"></div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full md:w-4/5 p-0">
          <div className="p-0">{children}</div>
        </div>
      </div>
    </AuthGuard>
  );
}
