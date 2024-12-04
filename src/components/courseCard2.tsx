"use client";

import Image from "next/image";
import { FaLongArrowAltRight } from "react-icons/fa";

// Correct interface for Course2
interface Course2 {
  _id: string;
  name: string;
  image?: string; // Made optional to handle undefined values
  link: string;
}

interface CourseCard2Props {
  course: Course2;
  isRegistered: boolean;
  onClick: () => void;  // onClick prop to handle the redirection
}

const CourseCard2 = ({ course, isRegistered, onClick }: CourseCard2Props) => {
  const fallbackImage = "/default-image.jpg"; // Default fallback image

  return (
    <div
      className="card bg-base-100 w-[280px] h-[300px] shadow-xl rounded-lg text-white hover:text-black cursor-pointer"
      onClick={onClick} // Added onClick here
    >
      <figure>
        <Image
          src={course.image || fallbackImage}
          alt={course.name || "Default Course"}
          width={308}
          height={268}
        />
      </figure>
      <div className="card-body bg-black text-gray-400 hover:text-black hover:bg-[#FACE39] rounded-b-lg">
        <p className="text-xs">
          Very different from conventional <br />
          agency, this one is easier, easier to learn, and easy to remember.
        </p>
        <div className="card-actions justify-start">
          {isRegistered ? (
            <a
              href={course.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-3 text-white hover:text-black"
            >
              Learn More <FaLongArrowAltRight />
            </a>
          ) : (
            <p className="text-sm text-red-500 mt-3">Register to access this link.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCard2;
