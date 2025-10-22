"use client";

import Image from "next/image";
import { Course } from "@/app/types";
import { FaLongArrowAltRight } from "react-icons/fa";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  allowed: boolean;
  course: Course;
  testType?: string;
  testSystem?: string;
  className?: string;
};

export default function CourseCard({
  allowed,
  course,
  testType,
  testSystem,
  className = "",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oldBookingId = searchParams.get("oldBookingId");

  const courseLinks: Record<string, string> = {
    IELTS: "https://luminedge.com.bd/ielts/",
    "Pearson PTE": "https://luminedge.com.bd/pte/",
    GRE: "https://luminedge.com.bd/gre/",
    TOEFL: "https://luminedge.com.bd/best-toefl-coaching-in-dhaka/",
  };

  const courseDescriptions: Record<string, string> = {
    IELTS:
      "Book Your IELTS Test with Confidence – Convenient, Reliable, and Trusted by Thousands.",
    "Pearson PTE": "Book Your PTE Mock Test – Practice, Prepare, and Excel!",
    GRE: "Book Your GRE General Mock Test – Ace Your Preparation!",
    TOEFL: "Book Your TOEFL iBT Mock Test – Get Ready to Succeed!",
  };

  const handleGo = () => {
    if (allowed) {
      let bookingUrl = `/dashboard/booking/${course._id}`;
      const params = new URLSearchParams();
      if (testType) params.append("testType", testType);
      if (testSystem) params.append("testSystem", testSystem);
      if (oldBookingId) params.append("oldBookingId", oldBookingId);
      const qs = params.toString();
      if (qs) bookingUrl += `?${qs}`;
      router.push(bookingUrl);
    } else {
      const courseLink = courseLinks[course.name.trim()];
      if (courseLink) window.open(courseLink, "_blank");
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleGo();
    }
  };

  const shouldGlow = oldBookingId === course._id;
  const glowClass = shouldGlow
    ? "ring-2 ring-[#FACE39] ring-offset-2 shadow-lg shadow-yellow-300"
    : "";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleGo}
      onKeyDown={onKey}
      className={[
        // 👇 Fill the cell, no fixed width/height
        "h-full w-full cursor-pointer group",
        "rounded-2xl border border-gray-700 bg-[#00000f] text-white shadow-xl",
        "transition-transform duration-300 hover:scale-[1.02] focus:outline-none focus-visible:scale-[1.02]",
        glowClass,
        className,
      ].join(" ")}
    >
      {/* Image area: fixed aspect keeps all cards same visual height at top */}
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-t-2xl">
        <Image
          src={course.image || "/default-image.jpg"}
          alt={course.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={false}
        />
      </div>

      {/* Body: flex-1 makes this stretch; footer sticks to bottom with mt-auto */}
      <div className="flex h-auto min-h-[140px] flex-col rounded-b-2xl p-4 transition-colors duration-300 group-hover:bg-[#FACE39] group-hover:text-black">
        <p className="mb-3 text-xs font-medium leading-snug text-gray-300 group-hover:text-black">
          {courseDescriptions[course.name] ||
            "Explore your path to success with Luminedge’s premium mock tests."}
        </p>

        <div className="mt-auto flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-yellow-400 group-hover:text-[#00000f]">
          <span>{allowed ? "Book Now" : "Learn More"}</span>
          <FaLongArrowAltRight />
        </div>
      </div>
    </div>
  );
}
