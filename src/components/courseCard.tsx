"use client";

import Image from "next/image";
import { Course } from "@/app/types";
import { FaLongArrowAltRight } from "react-icons/fa";
import { useRouter, useSearchParams } from "next/navigation";

const CourseCard = ({
  allowed,
  course,
  testType,
  testSystem,
}: {
  allowed: boolean;
  course: Course;
  testType?: string;
  testSystem?: string;
}) => {
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
    IELTS: "Book Your IELTS Test with Confidence – Convenient, Reliable, and Trusted by Thousands.",
    "Pearson PTE": "Book Your PTE Mock Test – Practice, Prepare, and Excel!",
    GRE: "Book Your GRE General Mock Test – Ace Your Preparation!",
    TOEFL: "Book Your TOEFL iBT Mock Test – Get Ready to Succeed!",
  };

  const handleCardClick = () => {
    if (allowed) {
      let bookingUrl = `/dashboard/booking/${course._id}`;
      const params = new URLSearchParams();

      if (testType) params.append("testType", testType);
      if (testSystem) params.append("testSystem", testSystem);
      if (oldBookingId) params.append("oldBookingId", oldBookingId);

      const queryString = params.toString();
      if (queryString) bookingUrl += `?${queryString}`;

      router.push(bookingUrl);
    } else {
      const courseLink = courseLinks[course.name.trim()];
      if (courseLink) window.open(courseLink, "_blank");
    }
  };

  const shouldGlow = oldBookingId === course._id;

  const glowClass = shouldGlow
    ? "animate-pulse border-2 border-[#FACE39] shadow-lg shadow-yellow-300"
    : "";

  return (
    <div
      onClick={handleCardClick}
      className={`
        group w-[280px] h-[300px] cursor-pointer 
        transform transition-transform duration-300 hover:scale-105
        rounded-2xl shadow-xl bg-[#00000f]
        border border-gray-700 text-white ${glowClass}
      `}
    >
      <figure className="overflow-hidden rounded-t-2xl">
        <Image
          src={course.image || "/default-image.jpg"}
          alt={course.name}
          width={320}
          height={180}
          className="w-full h-[180px] object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </figure>

      <div className="p-4 flex flex-col justify-between h-[120px] text-white group-hover:text-black group-hover:bg-[#FACE39] rounded-b-2xl transition-all duration-300">
        <p className="text-xs font-medium leading-snug text-gray-300 group-hover:text-black mb-2">
          {courseDescriptions[course.name] ||
            "Explore your path to success with Luminedge’s premium mock tests."}
        </p>

        <div className="flex items-center gap-2 mt-auto font-semibold text-sm uppercase tracking-wide text-yellow-400 group-hover:text-[#00000f]">
          {allowed ? (
            <>
              <span className="transition-colors duration-300 group-hover:text-[#00000f]">
                Book Now
              </span>
              <FaLongArrowAltRight className="transition-colors duration-300 group-hover:text-[#00000f]" />
            </>
          ) : (
            <>
              <span className="transition-colors duration-300 group-hover:text-[#00000f]">
                Learn More
              </span>
              <FaLongArrowAltRight className="transition-colors duration-300 group-hover:text-[#00000f]" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
