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
  /** mark as above the fold to improve LCP */
  priority?: boolean;
  /** responsive sizes hint for next/image */
  sizes?: string;
}

const CourseCard2 = ({
  course,
  isRegistered,
  onClick,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
}: CourseCard2Props) => {
  const fallbackImage = "/default-image.jpg";

  const courseDescriptions: Record<string, string> = {
    IELTS:
      "Book Your IELTS Test with Confidence – Convenient, Reliable, and Trusted by Thousands.",
    "Pearson PTE": "Book Your PTE Mock Test – Practice, Prepare, and Excel!",
    GRE: "Book Your GRE General Mock Test – Ace Your Preparation!",
    TOEFL: "Book Your TOEFL iBT Mock Test – Get Ready to Succeed!",
  };

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isRegistered) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={isRegistered ? 0 : -1}
      aria-disabled={!isRegistered}
      onClick={isRegistered ? onClick : undefined}
      onKeyDown={handleKey}
      title={isRegistered ? `Open ${course.name}` : "Register to access"}
      className={[
        // fill the grid/slider cell
        "w-full h-full flex flex-col rounded-2xl border border-gray-700 bg-[#00000f] text-white shadow-xl",
        "transition-transform duration-300",
        isRegistered ? "cursor-pointer hover:scale-[1.02]" : "cursor-not-allowed opacity-85",
      ].join(" ")}
    >
      {/* Image with consistent aspect ratio */}
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-t-2xl">
        <Image
          src={course.image || fallbackImage}
          alt={course.name}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          className={["object-cover", isRegistered ? "group-hover:scale-105" : ""].join(" ")}
        />
      </div>

      {/* Body: flex-1 stretches; CTA pinned bottom with mt-auto */}
      <div
        className={[
          "flex flex-col p-4 rounded-b-2xl min-h-[140px]",
          isRegistered ? "transition-colors duration-300 hover:bg-[#FACE39] hover:text-black" : "",
        ].join(" ")}
      >
        <p className="mb-3 text-xs font-medium leading-snug text-gray-300">
          {courseDescriptions[course.name] ||
            "Explore your path to success with Luminedge’s premium mock tests."}
        </p>

        <div
          className={[
            "mt-auto flex items-center gap-2 text-sm font-semibold uppercase tracking-wide",
            isRegistered ? "text-yellow-400" : "text-red-500",
          ].join(" ")}
        >
          {isRegistered ? (
            <>
              <span>Learn More</span>
              <FaLongArrowAltRight />
            </>
          ) : (
            <span>Register to access</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCard2;
