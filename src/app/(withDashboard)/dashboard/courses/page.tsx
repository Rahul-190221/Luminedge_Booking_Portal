"use client";

import CourseCard2 from "@/components/courseCard2"; // Corrected the import path
import { Course2 } from "@/components/courses2"; // Corrected the import path
import GetMe from "@/app/helpers/getme"; // Assuming you have a helper to fetch user data

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
    <div className="flex flex-col justify-center items-start w-[90%] mx-auto">
      <div className="flex flex-col mt-[30px]">
        <h1 className="text-3xl font-semibold">To boost your preparation</h1>
        <h1 className="text-3xl font-bold w-fit bg-[#FACE39] p-2">Enroll Now!</h1>
        <h1 className="text-3xl font-semibold">in our Premium Venue</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 mt-10 mx-auto">
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
