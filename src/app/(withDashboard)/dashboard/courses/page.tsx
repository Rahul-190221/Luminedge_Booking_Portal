"use client";

import CourseCard2 from "@/components/courseCard2"; // Corrected the import path
import { Course2 } from "@/components/courses2"; // Corrected the import path
import GetMe from "@/app/helpers/getme"; // Assuming you have a helper to fetch user data
import { motion } from "framer-motion";

const Courses2Page = () => {
  const user = GetMe(); // Fetch user data using GetMe helper
  console.log(user);

  // Courses data array
  const courses2: Course2[] = [
    {
      _id: "67337c880794d577cd982b75",
      name: "IELTS",
      image: "https://i.ibb.co/MPBCMfb/ielts.webp",
      link: "https://luminedge.com.bd/ielts/", // Ensure all courses have links
    },
    {
      _id: "67337c880794d577cd982b76",
      name: "Pearson PTE",
      image: "https://i.ibb.co/4mrhCkN/pte.webp",
      link: "https://luminedge.com.bd/pte/", // Added link for the course
    },
    {
      _id: "67337c880794d577cd982b77",
      name: "GRE",
      image: "https://i.ibb.co/SX7t52h/gre.webp",
      link: "https://luminedge.com.bd/gre/", // Added link for the course
    },
    {
      _id: "67337c880794d577cd982b78",
      name: "TOEFL",
      image: "https://i.ibb.co/vjyL3QC/toefl.webp",
      link: "https://luminedge.com.bd/best-toefl-coaching-in-dhaka/", // Added link for the course
    },
  ];

  // Simulating the registered user (replace with actual user logic as needed)
  const isRegistered = true; // This should depend on the actual user status

  // Function to handle redirection using window.location.href
  const handleRedirect = (link: string) => {
    window.location.href = link; // Redirect to the course link
  };

  return (
    <div className="flex flex-col gap-1 w-full">
<div className="w-full flex justify-center mt-[10px] lg:mt-20">
  <motion.div
    className="flex flex-col mt-[10px] text-center items-center gap-1"
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
  >
    <h2 className="text-2xl md:text-5xl lg:text-5xl font-extrabold tracking-tight text-gray-800">
      To Boost Your Preparation
    </h2>

    <h2 className="text-3xl md:text-6xl lg:text-6xl font-extrabold text-[#FACE39] mt-1 mb-1">
      Enroll Now!
    </h2>

    <h2 className="text-2xl md:text-5xl lg:text-5xl font-extrabold tracking-tight text-gray-800">
      in Our <span className="text-[#FACE39]">Premium Venue</span>
    </h2>

    <div className="h-[6px] w-24 bg-[#FACE39] rounded-full mt-1 animate-pulse" />
  </motion.div>
</div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 mt-6 mx-auto">
        {courses2.map((course) => (
          <CourseCard2
            key={course._id}
            course={course}
            isRegistered={isRegistered} // Pass isRegistered prop to CourseCard2
            onClick={() => handleRedirect(course.link)} // Pass onClick to handleRedirect
          />
        ))}
      </div>
    </div>
  );
};

export default Courses2Page;
