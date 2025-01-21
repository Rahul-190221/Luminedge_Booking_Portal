
"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import DonutChart from "@/components/DonutChart";
import TableBDM from "@/components/tableBDM";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const DashboardPage = () => {
  const [users, setUsers] = useState([]); // All users from the API
  const [dailyRequests, setDailyRequests] = useState<number>(0);
  const [monthlyRequests, setMonthlyRequests] = useState<number>(0);
  const [overallSchedule, setOverallSchedule] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(
          `https://luminedge-server.vercel.app/api/v1/admin/users`
        );
        const fetchedUsers = response.data.users || [];
        setUsers(fetchedUsers);
        calculateDailyRequests(fetchedUsers, new Date());
        calculateMonthlyRequests(fetchedUsers);
        calculateOverallSchedule(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
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
    <div className="flex flex-col mx-auto gap-3 max-w-7xl">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {/* Daily Booking Requests */}
        <div className="stat bg-white shadow-md rounded-lg p-3 text-center">
            <div className="stat-title text-gray-900 font-medium mb-2 text-center sm:text-left">
            Booking Requests by Date
            </div>
          <DonutChart completedCount={dailyRequests} totalCount={dailyRequests || 1} />
          <div className="mt-4">
            <label
              htmlFor="datePicker"
              className="block text-sm font-medium text-gray-900 mb-2"
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
        <div className="stat bg-white shadow-md rounded-lg p-3 text-center">
            <div className="stat-title text-gray-900 font-medium mb-2 text-center sm:text-left">
              {currentMonthName} Booking Requests
            </div>
          <DonutChart completedCount={monthlyRequests} totalCount={monthlyRequests || 1} />
          <div className="mt-4">
            <label
              htmlFor="monthPicker"
              className="block text-sm font-medium text-gray-900 mb-2"
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
        <div className="stat bg-white shadow-md rounded-lg p-3 text-center">
          <div className="stat-title text-gray-900 font-medium mb-2">Total Booking</div>
          <DonutChart
            completedCount={overallSchedule.reduce((acc, item) => acc + item.count, 0)}
            totalCount={overallSchedule.reduce((acc, item) => acc + item.count, 1)}
          />
        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4 md:p-6">
        
        <TableBDM />
      </div>
    </div>
  );
};

export default DashboardPage;
