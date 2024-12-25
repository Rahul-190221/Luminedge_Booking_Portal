"use client";
import { getUserIdFromToken } from "@/app/helpers/jwt";
import axios from "axios";
import { useEffect, useState } from "react";

import Table from "@/components/table";
import Link from "next/link";

const DashboardPage = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [userAttendance, setUserAttendance] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userIdFromToken = await getUserIdFromToken();

        if (userIdFromToken) {
          setUserId(userIdFromToken.userId);
          const response = await axios.get(
            `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/${userIdFromToken.userId}`
          );
          setUserData(response.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setUserData(null);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (userId) {
      const fetchAttendance = async () => {
        try {
          const response = await axios.get(
            `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/attendance/${userId}`
          );
          setUserAttendance(response.data); // {attendance:4}
        } catch (error) {
          console.error("Error fetching attendance:", error);
          setUserAttendance(null);
        }
      };

      fetchAttendance();
    }
  }, [userId]); // Only run this effect when userId changes

  if (!userData || !userData.user) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col mx-auto gap-6 p-4 max-w-7xl">
      <h1 className="text-3xl font-semibold text-gray-800">Dashboard</h1>

      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-yellow-400 to-[#FACE39] p-6 rounded-lg shadow-md text-white">
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
          <p className="text-2xl font-bold text-yellow-500">
            {userData.user.totalMock - userData.user.mock}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-gray-600 font-medium">Remaining</h3>
          <p className="text-2xl font-bold text-green-500">
            {userData.user.mock}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-gray-600 font-medium">Attended</h3>
          <p className="text-2xl font-bold text-[#FACE39]">
            {userAttendance ? userAttendance.attendance : 0}
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
