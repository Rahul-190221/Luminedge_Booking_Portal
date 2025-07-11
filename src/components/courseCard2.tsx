"use client";

import Image from "next/image";
import { FaLongArrowAltRight } from "react-icons/fa";

interface Course2 {
  _id: string;
  name: string;
  image?: string;
  link: string;
}

interface CourseCard2Props {
  course: Course2;
  isRegistered: boolean;
  onClick: () => void;
}

const CourseCard2 = ({ course, isRegistered, onClick }: CourseCard2Props) => {
  const fallbackImage = "/default-image.jpg";

  const courseDescriptions: Record<string, string> = {
    IELTS: "Book Your IELTS Test with Confidence – Convenient, Reliable, and Trusted by Thousands.",
    "Pearson PTE": "Book Your PTE Mock Test – Practice, Prepare, and Excel!",
    GRE: "Book Your GRE General Mock Test – Ace Your Preparation!",
    TOEFL: "Book Your TOEFL iBT Mock Test – Get Ready to Succeed!",
  };

  return (
    <div
      onClick={onClick}
      className={`
        group w-[280px] h-[300px] cursor-pointer
        transition-transform duration-300 ease-in-out
        transform hover:scale-105
        rounded-2xl shadow-xl bg-[#00000f]
        border border-gray-700 text-white
      `}
    >
      <figure className="overflow-hidden rounded-t-2xl">
        <Image
          src={course.image || fallbackImage}
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
  {isRegistered ? (
    <>
      <span className="transition-colors duration-300 group-hover:text-[#00000f]">Learn More</span>
      <FaLongArrowAltRight className="transition-colors duration-300 group-hover:text-[#00000f]" />
    </>
  ) : (
    <span className="text-sm text-red-500">Register to access</span>
  )}
</div>

      </div>
    </div>
  );
};

export default CourseCard2;
