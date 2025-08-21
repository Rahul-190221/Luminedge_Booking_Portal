"use client";

import FinalTRFPage from "@/components/FinalTRFPage";
import { useSearchParams } from "next/navigation";

export default function Page() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  if (!userId) {
    return <div className="p-4 text-red-600">❌ Missing userId in URL</div>;
  }

  return (
    <div className="p-4 flex flex-col items-center space-y-12">
      <FinalTRFPage  />
    </div>
  );
}
