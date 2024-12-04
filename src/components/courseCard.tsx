"use client";

import Image from "next/image";
import { Course } from "@/app/types";
import { FaLongArrowAltRight } from "react-icons/fa";
import Link from "next/link";

const CourseCard = ({
  mockType,
  course,
}: {
  mockType: string;
  course: Course;
}) => {
  // Define the URLs for each course with the updated TOEFL link
  const courseLinks: Record<string, string> = {
    "Pearson PTE": "https://luminedge.com.bd/pte/",
    "GRE": "https://luminedge.com.bd/gre/",
    "TOEFL": "https://luminedge.com.bd/best-toefl-coaching-in-dhaka/", // Updated URL
  };

  return (
    <div className="card bg-base-100 w-[280px] h-[300px] shadow-xl rounded-lg text-white hover:text-black cursor-pointer">
      <figure>
        <Image
          src={course.image || "/default-image.jpg"} // Fallback image
          alt={course.name}
          width={308}
          height={268}
          className="rounded-t-lg"
        />
      </figure>
      {course.name === mockType ? (
        // Show "Book Now" link if mockType matches course name
        <Link href={`/dashboard/booking/${course._id}`}>
          <div className="card-body bg-black text-gray-400 hover:text-black hover:bg-[#FACE39] rounded-b-lg">
            <p className="text-xs">
              Very different from conventional <br />
              agency, this one is easier, easier to learn, and easy to remember.
            </p>
            <div className="card-actions justify-start">
              <div className="flex items-center gap-2 mt-3">
                Book Now <FaLongArrowAltRight />
              </div>
            </div>
          </div>
        </Link>
      ) : (
        // Show "Learn More" link if mockType does not match course name
        <div className="card-body bg-black text-gray-400 hover:text-black hover:bg-[#FACE39] rounded-b-lg">
          <p className="text-xs">
            Very different from conventional <br />
            agency, this one is easier, easier to learn, and easy to remember.
          </p>
          <div className="card-actions justify-start">
            <a
              href={courseLinks[course.name] || "#"} // Dynamically fetch the course URL
              rel="noopener noreferrer" // Ensure security
              className="flex items-center gap-2 mt-3 text-white hover:text-black"
            >
              Learn More <FaLongArrowAltRight />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseCard;
