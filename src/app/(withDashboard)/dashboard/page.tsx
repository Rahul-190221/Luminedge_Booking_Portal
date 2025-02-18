"use client";
import { getUserIdFromToken } from "@/app/helpers/jwt";
import axios from "axios";

import { useEffect, useState, useCallback } from "react";
import Table from "@/components/table";
import Link from "next/link";

const DashboardPage = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [userAttendance, setUserAttendance] = useState<any>(null);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const userIdFromToken = await getUserIdFromToken();

  //       if (userIdFromToken) {
  //         setUserId(userIdFromToken.userId);
  //         const response = await axios.get(
  //           `https://luminedge-server.vercel.app/api/v1/user/${userIdFromToken.userId}`
  //         );
  //         setUserData(response.data);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching data:", error);
  //       setUserData(null);
  //     }
  //   };

  //   fetchData();
  // }, []);

  // useEffect(() => {
  //   if (userId) {
  //     const fetchAttendance = async () => {
  //       try {
  //         const response = await axios.get(
  //           `https://luminedge-server.vercel.app/api/v1/user/attendance/${userId}`
  //         );
  //         setUserAttendance(response.data); // {attendance:4}
  //       } catch (error) {
  //         console.error("Error fetching attendance:", error);
  //         setUserAttendance(null);
  //       }
  //     };

  //     fetchAttendance();
  //   }
  // }, [userId]); // Only run this effect when userId changes

  // if (!userData || !userData.user) {
  //   return (
  //     <div className="flex items-center justify-center h-screen">
  //       Loading...
  //     </div>
  //   );
  // }
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
    <div className="flex flex-col mx-auto gap-3 max-w-7xl">
    <h1 className="text-3xl font-semibold text-gray-800">Dashboard</h1>
{/* Welcome Card */}
      <div className="bg-gradient-to-r from-yellow-400 to-[#FACE39] rounded-lg shadow-md text-white p-4">
      <h2 className="text-2xl font-bold mb-2">
        Welcome, {userData.user.name}!
      </h2>
      <p className="text-sm md:text-base lg:text-lg mb-4 font-montserrat">
        You’ve logged in to the Luminedge Mock Test Booking Portal! This platform is designed to streamline your test preparation journey, allowing you to view the details of your booked mock test and stay informed about important terms and conditions.
      </p>
      <Link href="/dashboard/mockType">
        <button className="bg-white text-black font-medium rounded-md px-4 py-2 hover:bg-gray-200 transition-all">
          Book Now
        </button>
      </Link>
      <br />
      <h4> 📢 Mock Test Validity
      </h4>
      <ul className="list-disc pl-5 text-sm md:text-base lg:text-lg">
        <li>Validity of Purchased & Course Mock Test(s): 6 months*</li>
        <li>Validity of FREE Mock Test(s): 10 days*</li>
      </ul>
      <p className="text-xs md:text-sm lg:text-base">
        N.B: Validity begins from the date mentioned on the Money Receipt (MR).
      </p>
    </div>


      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-gray-600 font-medium">Purchased</h3>
          <p className="text-2xl font-bold text-gray-800">
            {userData.user.totalMock}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-gray-600 font-medium">Booked</h3>
          <p className="text-2xl font-bold text-[#FACE39]">
            {userData.user.totalMock - userData.user.mock}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-gray-600 font-medium">Remaining</h3>
          <p className="text-2xl font-bold text-gray-800">
            {userData.user.mock}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
  <h3 className="text-gray-600 font-medium">Attended</h3>
  <p className="text-2xl font-bold text-[#FACE39]">
    {userAttendance ?? 0} {/* ✅ Fix: Directly use userAttendance */}
  </p>
</div>

      </div>

      {/* Exam Schedule Section */}
      <div className="bg-white p-6 rounded-lg shadow-md md:bg-transparent md:border-0">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Exam Schedule
        </h2>
        <div className="max-h-60 overflow-y-auto">
          <Table userId={userId || ""} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
