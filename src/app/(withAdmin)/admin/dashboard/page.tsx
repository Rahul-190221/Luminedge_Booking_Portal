"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import DonutChart from "@/components/DonutChart";
import TableAdmin from "@/components/tableAdmin";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { motion } from "framer-motion";


const DashboardPage = () => {
  const [users, setUsers] = useState([]); // All users from the API
  const [dailyRequests, setDailyRequests] = useState<number>(0);
  const [monthlyRequests, setMonthlyRequests] = useState<number>(0);
  const [overallSchedule, setOverallSchedule] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await axios.get("https://luminedge-server.vercel.app/api/v1/admin/users");
      const filtered = (data.users || []).filter((u: any) => u.role === "user");
      setUsers(filtered);
      setTotalUsers(data.total || 0);   // 👈 true DB total
      calculateDailyRequests(filtered, new Date());
      calculateMonthlyRequests(filtered);
      calculateOverallSchedule(filtered);
    })();
  }, []);
  
  const calculateDailyRequests = (users: any[], date: Date | null) => {
    const formattedDate = date?.toISOString().split("T")[0];
    const count = users.filter((user: any) => {
      return new Date(user.createdAt).toISOString().split("T")[0] === formattedDate;
    }).length;
    setDailyRequests(count);
  };

  const calculateMonthlyRequests = (users: any[]) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = users.filter((user: any) => {
      return new Date(user.createdAt).toISOString().slice(0, 7) === currentMonth;
    }).length;
    setMonthlyRequests(count);
  };

  const calculateOverallSchedule = (users: any[]) => {
    const schedule = users.reduce((acc: any, user: any) => {
      const month = new Date(user.createdAt).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});
    setOverallSchedule(Object.entries(schedule).map(([month, count]) => ({ month, count })));
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    calculateDailyRequests(users, date);
  };

  const handleMonthChange = (date: Date | null) => {
    setSelectedDate(date);
    const formattedMonth = date?.toISOString().slice(0, 7);
    const count = users.filter((user: any) => {
      return new Date(user.createdAt).toISOString().slice(0, 7) === formattedMonth;
    }).length;
    setMonthlyRequests(count);
  };

  const currentMonthName = new Date().toLocaleString("default", { month: "long" });

  return (
    <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <motion.h1
  className="text-2xl font-semibold text-[#00000f] md:mt-0 lg:mt-0"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
  Overview
</motion.h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {/* Daily Booking Requests */}
        <div className="stat bg-white shadow-md rounded-lg p-4 text-center max-h-[380px] text-[#00000f]">
            <div className="stat-title text-[#00000f] font-medium mb-1 text-center sm:text-left">
            Booking Requests by Date
            </div>
          <DonutChart completedCount={dailyRequests} totalCount={dailyRequests || 1} />
          <div className="mt-2">
            <label
              htmlFor="datePicker"
              className="block text-sm font-medium text-[#00000f] mb-1"
            >
              Select Date:
            </label>
            <DatePicker
              id="datePicker"
              selected={selectedDate}
              onChange={handleDateChange}
              className="border px-3 py-2 rounded w-full sm:w-auto"
              placeholderText="Select a date"
            />
          </div>
        </div>

        {/* Monthly Booking Requests */}
        <div className="stat bg-white shadow-md rounded-lg p-4 text-center max-h-[380px]">
            <div className="stat-title text-[#00000f] font-medium mb-1 text-center sm:text-left">
              {currentMonthName} Booking Requests
            </div>
          <DonutChart completedCount={monthlyRequests} totalCount={monthlyRequests || 1} />
          <div className="mt-2">
            <label
              htmlFor="monthPicker"
              className="block text-sm font-medium text-[#00000f] mb-1"
            >
              Select Month:
            </label>
            <DatePicker
              id="monthPicker"
              selected={selectedDate}
              onChange={handleMonthChange}
              dateFormat="MMMM, yyyy"
              showMonthYearPicker
              className="border px-3 py-2 rounded w-full sm:w-auto"
              placeholderText="Select a month"
            />
          </div>
        </div>

        {/* Total Booking */}
        <div className="stat bg-white shadow-md rounded-lg p-4  max-h-[380px]">
          <div className="stat-title text-[#00000f] font-medium mb-0">Total Users</div>
          <DonutChart
  completedCount={totalUsers}
  totalCount={totalUsers || 1}
/>

        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow-md rounded-lg p-0 md:p-2">
        
        <TableAdmin />
      </div>
    </div>
  );
};

export default DashboardPage;
