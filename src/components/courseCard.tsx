"use client";

import Image from "next/image";
import { Course } from "@/app/types";
import { FaLongArrowAltRight } from "react-icons/fa";
import { useRouter } from "next/navigation";

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

  const courseLinks: Record<string, string> = {
    IELTS: "https://luminedge.com.bd/ielts/",
    "Pearson PTE": "https://luminedge.com.bd/pte/",
    GRE: "https://luminedge.com.bd/gre/",
    TOEFL: "https://luminedge.com.bd/best-toefl-coaching-in-dhaka/",
  };

  const courseDescriptions: Record<string, string> = {
    IELTS:
      "Book Your IELTS Test with Confidence – Convenient, Reliable, and Trusted by Thousands.",
    "Pearson PTE":
      "Book Your PTE Mock Test – Practice, Prepare, and Excel!",
    GRE: "Book Your GRE General Mock Test – Ace Your Preparation!",
    TOEFL: "Book Your TOEFL iBT Mock Test – Get Ready to Succeed!",
  };

  const handleCardClick = () => {
    if (allowed) {
      router.push(
        `/dashboard/booking/${course._id}?testType=${testType}&testSystem=${testSystem}`
      );
    } else {
      const courseLink = courseLinks[course.name.trim()];
      if (courseLink) window.open(courseLink, "_blank");
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="card bg-base-100 w-[280px] h-[300px] shadow-xl rounded-lg text-white hover:text-black cursor-pointer transition-all duration-300 ease-in-out"
    >
      <figure>
        <Image
          src={course.image || "/default-image.jpg"}
          alt={course.name}
          width={308}
          height={268}
          className="rounded-t-lg object-cover"
        />
      </figure>

      <div className="card-body bg-black text-gray-400 hover:text-black hover:bg-[#FACE39] rounded-b-lg transition-all duration-300 ease-in-out">
        <p className="text-xs font-medium leading-snug">
          {courseDescriptions[course.name]}
        </p>
        <div className="card-actions justify-start">
          <div className="flex items-center gap-2 mt-3 font-semibold uppercase text-sm tracking-wide">
            {allowed ? (
              <>
                Book Now <FaLongArrowAltRight />
              </>
            ) : (
              <>
                Learn More <FaLongArrowAltRight />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
