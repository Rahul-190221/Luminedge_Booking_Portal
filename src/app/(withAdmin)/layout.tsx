
import SidebarAdmin from "@/components/shared/SidebarAdmin";
import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Luminedge Booking Portal",
  description:
    "Luminedge Bangladesh offers a wide range of services, including educational consulting for studying abroad, visa and immigration assistance, English language proficiency exams, and career pathway guidance. Luminedge assists students in studying abroad in various countries across the globe, including but not limited to Australia, the United States, Canada, the United Kingdom, New Zealand, and European nations. We offer comprehensive preparation courses for English language proficiency exams such as IELTS, PTE, and TOEFL. Our experienced instructors provide personalized training to help you achieve your target scores and enhance your language skills for academic and professional success.",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // const router = useRouter();
  // if (!isLoggedIn()) {
  //   return router.push("/login");
  // }
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row p-0">
      {/* Sidebar */}
      <div className="w-full md:w-1/5 bg-[#ffffff] text-[#00000f] shadow-1xl rounded-1xl md:rounded-2xl border md:border-2 md:min-h-screen p-3 relative">
        <SidebarAdmin />
        {/* Responsive divider */}
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-px bg-gray-200"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full md:w-4/5 p-0">
        <div className="p-0">{children}</div>
      </div>
    </div>
  );
}