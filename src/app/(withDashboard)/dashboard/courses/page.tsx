"use client";

import CourseCard2 from "@/components/courseCard2";
import { Course2 } from "@/components/courses2";
import GetMe from "@/app/helpers/getme";
import { motion } from "framer-motion";

const Courses2Page = () => {
  const user = GetMe();
  console.log(user);

  const courses2: Course2[] = [
    {
      _id: "67337c880794d577cd982b75",
      name: "IELTS",
      image: "https://i.ibb.co/MPBCMfb/ielts.webp",
      link: "https://luminedge.com.bd/ielts/",
    },
    {
      _id: "67337c880794d577cd982b76",
      name: "Pearson PTE",
      image: "https://i.ibb.co/4mrhCkN/pte.webp",
      link: "https://luminedge.com.bd/pte/",
    },
    {
      _id: "67337c880794d577cd982b77",
      name: "GRE",
      image: "https://i.ibb.co/SX7t52h/gre.webp",
      link: "https://luminedge.com.bd/gre/",
    },
    {
      _id: "67337c880794d577cd982b78",
      name: "TOEFL",
      image: "https://i.ibb.co/vjyL3QC/toefl.webp",
      link: "https://luminedge.com.bd/best-toefl-coaching-in-dhaka/",
    },
  ];

  const isRegistered = true;

  const handleRedirect = (link: string) => {
    window.location.href = link;
  };

  return (
    <div className="p-1 sm:p-4 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <div className="w-full flex justify-center mt-[6px] lg:mt-10">
        <motion.div
          className="flex flex-col mt-[10px] text-center items-center gap-1"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
            To Boost Your Preparation
          </h2>
          <h2 className="text-3xl md:text-6xl lg:text-5xl font-extrabold text-[#FACE39] mt-1 mb-1">
            Enroll Now!
          </h2>
          <h2 className="text-2xl md:text-5xl lg:text-5xl font-extrabold tracking-tight">
            in Our <span className="text-[#FACE39]">Premium Venue</span>
          </h2>
          <div className="h-[6px] w-24 bg-[#FACE39] rounded-full mt-1 animate-pulse" />
        </motion.div>
      </div>

      <div className="w-full max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 mt-3 px-12">
        {courses2.map((course, idx) => (
          <CourseCard2
            key={course._id}
            course={course}
            isRegistered={isRegistered}
            onClick={() => handleRedirect(course.link)}
            // Make the first (IELTS) image priority to remove the LCP warning
            priority={idx === 0}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ))}
      </div>
    </div>
  );
};

export default Courses2Page;
