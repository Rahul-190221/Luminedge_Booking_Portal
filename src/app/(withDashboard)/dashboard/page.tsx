"use client";
import { getUserIdFromToken } from "@/app/helpers/jwt";
import axios from "axios";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import Table from "@/components/table";
import Link from "next/link";

const DashboardPage = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [userAttendance, setUserAttendance] = useState<any>(null);

  // ✅ Fetch user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userIdFromToken = await getUserIdFromToken();
        if (userIdFromToken) {
          const userId = userIdFromToken.userId;
          setUserId(userId);

          const response = await axios.get(
            `https://luminedge-server.vercel.app/api/v1/user/${userId}`
          );

          if (response.data && response.data.user) {
            setUserData(response.data);
          } else {
            throw new Error("User data not found");
          }
        }
      } catch (error) {
        console.error("❌ Error fetching user data:", error);
        setUserData(null);
      }
    };

    fetchData();
  }, []);


  // ✅ Fetch attendance only when userId is available
  const fetchAttendance = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await axios.post(
        `https://luminedge-server.vercel.app/api/v1/user/attendance/bulk`,
        { userIds: [userId] }
      );

      // ✅ Extract attendance count for the specific user
      const attendanceCount = response.data.attendance?.[userId] || 0;
      setUserAttendance(attendanceCount);
    } catch (error: any) {
      console.error("❌ Error fetching attendance:", error);
      setUserAttendance(0); // ✅ Default to 0 if API fails
    }
  }, [userId]);

  // ✅ Run the attendance fetch when userId changes
  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // ✅ Show loading state until userData is available
  if (!userData || !userData.user) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full">
    <motion.h1
  className="text-2xl text-[#00000f] md:mt-6 lg:mt-10"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
  Dashboard
</motion.h1>
{/* Welcome Card */}
<div className="bg-[#FACE39] rounded-lg text-[#00000f] p-3 shadow-[0_4px_20px_rgba(250,206,57,0.5)]">
      <h2 className="text-2xl font-bold mb-1.5">
        Welcome, {userData.user.name}!
      </h2>
      <p className="text-sm md:text-base lg:text-lg mb-1.5 font-montserrat text-[#00000f]">
        You’ve logged in to the Luminedge Mock Test Booking Portal! This platform is designed to streamline your test preparation journey, allowing you to view the details of your booked mock test and stay informed about important terms and conditions.
      </p>
      <Link href="/dashboard/mockType">
      <button
  className="bg-white text-[#00000f] font-semibold text-sm md:text-base px-4 py-2 md:px-5 md:py-2.5 rounded-xl shadow-md 
    hover:bg-[#00000f] hover:text-white hover:shadow-xl hover:scale-105 
    active:bg-[#00000f] active:text-white active:shadow-xl active:scale-105 
    focus-visible:bg-[#00000f] focus-visible:text-white 
    transition-all duration-300 ease-in-out tracking-wide uppercase"
>
  Book Now
</button>


      </Link>
      <br />
      <h4> 📢 Mock Test Validity
      </h4>
      <ul className="list-disc pl-5 text-sm md:text-base lg:text-lg text-[#00000f] font-montserrat">
        <li>Validity of Purchased & Course Mock Test(s): 6 months*</li>
        <li>Validity of FREE Mock Test(s): 10 days*</li>
      </ul>
      <p className="text-xs md:text-sm lg:text-base mt-1 text-[#00000f] font-montserrat">
        N.B: Validity begins from the date mentioned on the Money Receipt (MR).
      </p>
    </div>



      {/* Stats Section */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 mb-2">
  <div className="bg-white p-4 rounded-lg shadow-md text-center text-[#00000f]">
    <h3 className="text-base font-semibold">Purchased</h3>
    <p className="text-2xl font-bold">
      {userData.user.totalMock ?? 0}
    </p>
  </div>

  <div className="bg-white p-4 rounded-lg shadow-md text-center text-[#00000f]">
    <h3 className="text-base font-semibold">Booked</h3>
    <p className="text-2xl font-bold text-[#FACE39]">
      {userData.user.totalMock - userData.user.mock}
    </p>
  </div>

  <div className="bg-white p-4 rounded-lg shadow-md text-center text-[#00000f]">
    <h3 className="text-base font-semibold">Remaining</h3>
    <p className="text-2xl font-bold">
      {userData.user.mock}
    </p>
  </div>

  <div className="bg-white p-4 rounded-lg shadow-md text-center text-[#00000f]">
    <h3 className="text-base font-semibold">Attended</h3>
    <p className="text-2xl font-bold text-[#FACE39]">
      {userAttendance ?? 0}
    </p>
  </div>
</div>


      {/* Exam Schedule Section */}
<div className="w-full bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8 transition-all duration-300">
  <h2 className="text-2xl md:text-3xl font-bold text-[#00000f] mb-2 tracking-tight">
    Exam Schedule
  </h2>

  <div className="max-h-60 overflow-y-auto custom-scrollbar rounded-lg border border-gray-100">
    <Table userId={userId || ""} />
  </div>
</div>

    </div>
  );
};

export default DashboardPage;
