import Sidebar from "@/components/shared/Sidebar";
import SidebarAdmin from "@/components/shared/SidebarAdmin";
import type { Metadata } from "next";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/app/helpers/jwt";

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
    <div className="min-h-screen my-2">
      <div className="flex justify-around">
        <div className="w-[20%] justify-start">
          <SidebarAdmin />
        </div>
        <div className="w-[80%]  rounded-box ml-2">{children}</div>
      </div>
    </div>
  );
}
