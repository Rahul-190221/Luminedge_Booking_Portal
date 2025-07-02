"use client";

import CourseCard from "@/components/courseCard";
import { Course } from "@/app/types";
import useUser from "@/app/helpers/getme";
import { motion } from "framer-motion";

type Mock = {
  mockType: string;
  testType: string;
  testSystem: string;
  mock: number;
  transactionId: string;
  mrValidation: string;
  createdAt: string;
};

const getExpiryTime = (validation: string): number => {
  if (!validation || validation.toLowerCase() === "n/a") return 0;
  const [value, unit] = validation.split(" ");
  const num = parseInt(value);
  switch (unit?.toLowerCase()) {
    case "minute":
    case "minutes":
      return num * 60 * 1000;
    case "day":
    case "days":
      return num * 24 * 60 * 60 * 1000;
    case "month":
    case "months":
      return num * 30 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
};

// ✅ BD local time
const getBDNow = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })
  ).getTime();
};

const CoursesPage = () => {
  const { user, mocks } = useUser();

  const courses: Course[] = [
    {
      _id: "67337c880794d577cd982b75",
      name: "IELTS",
      image: "https://i.ibb.co.com/MPBCMfb/ielts.webp",
    },
    {
      _id: "67337c880794d577cd982b76",
      name: "Pearson PTE",
      image: "https://i.ibb.co.com/4mrhCkN/pte.webp",
    },
    {
      _id: "67337c880794d577cd982b77",
      name: "GRE",
      image: "https://i.ibb.co.com/SX7t52h/gre.webp",
    },
    {
      _id: "67337c880794d577cd982b78",
      name: "TOEFL",
      image: "https://i.ibb.co.com/vjyL3QC/toefl.webp",
    },
  ];

  return (
    <div className="p-1 sm:p-8 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl  rounded-2xl border border-[#00000f]/10">
      <div className="w-full flex justify-center mt-[8px] lg:mt-18">
        <motion.div
          className="flex flex-col mt-[10px] text-center items-center gap-1"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h4 className="text-2xl md:text-5xl lg:text-5xl font-extrabold tracking-tight text-gray-800">
            Book Your
          </h4>
          <h4 className="text-3xl md:text-6xl lg:text-5xl font-extrabold text-[#FACE39] mt-1 mb-1">
            Mock Test Now!
          </h4>
          <h4 className="text-2xl md:text-5xl lg:text-5xl font-extrabold tracking-tight text-gray-800">
            in Our <span className="text-[#FACE39]">Premium Venue</span>
          </h4>
          <div className="h-[6px] w-24 bg-[#FACE39] rounded-full mt-1 animate-pulse" />
        </motion.div>
      </div>

      <div className="w-full max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 mt-3 px-12">
        {user ? (
          courses.map((course) => {
            const isAllowed = (() => {
              const courseMocks = mocks?.filter(
                (mock: Mock) => mock.mockType === course.name
              );

              const anyValidMock = courseMocks?.some((mock: Mock) => {
                const createdAt = new Date(mock.createdAt).getTime();
                const expiry = createdAt + getExpiryTime(mock.mrValidation);
                return getBDNow() < expiry;
              });

              // ✅ If no mocks[] exist or none valid, fallback to root-level field
              if (!mocks?.length) {
                return user?.mockType === course.name;
              }

              return anyValidMock;
            })();

            return (
              <CourseCard
                key={course._id}
                allowed={isAllowed}
                course={course}
              />
            );
          })
        ) : (
          <p className="col-span-full text-gray-500 text-center">
            Loading or no user data available.
          </p>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;
