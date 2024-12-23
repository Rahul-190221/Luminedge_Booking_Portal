"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import DonutChart from "@/components/DonutChart";
import TableAdmin from "@/components/tableAdmin";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const DashboardPage = () => {
  const [users, setUsers] = useState([]); // All users from the API
  const [dailyRequests, setDailyRequests] = useState<number>(0); // Daily booking request count
  const [monthlyRequests, setMonthlyRequests] = useState<number>(0); // Monthly booking request count
  const [overallSchedule, setOverallSchedule] = useState<any[]>([]); // Overall schedule data
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date()); // Default to today

  useEffect(() => {
    // Fetch users from the API
    const fetchUsers = async () => {
      try {
        const response = await axios.get(
          `https://luminedge-mock-test-booking-server.vercel.app/api/v1/admin/users`
        );
        const fetchedUsers = response.data.users || [];
        setUsers(fetchedUsers);

        // Initial Calculations
        calculateDailyRequests(fetchedUsers, new Date()); // Calculate daily requests
        calculateMonthlyRequests(fetchedUsers); // Calculate monthly requests
        calculateOverallSchedule(fetchedUsers); // Calculate overall schedule
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  // Calculate daily booking requests for the selected date
  const calculateDailyRequests = (users: any[], date: Date | null) => {
    if (!date) {
      setDailyRequests(0);
      return;
    }

    // Format the selected date to YYYY-MM-DD
    const formattedDate = new Date(date).toISOString().split("T")[0];
    console.log(`Filtering users for date: ${formattedDate}`); // Debugging

    // Filter users where createdAt matches the selected date
    const dailyCount = users.filter((user: any) => {
      try {
        const userDate = new Date(user.createdAt).toISOString().split("T")[0];
        return userDate === formattedDate;
      } catch (error) {
        console.error(`Error parsing createdAt for user:`, user, error);
        return false;
      }
    }).length;

    console.log(`Daily Count for ${formattedDate}: ${dailyCount}`); // Debugging
    setDailyRequests(dailyCount);
  };

  // Calculate monthly booking requests for the current month
  const calculateMonthlyRequests = (users: any[]) => {
    const currentMonth = new Date().toISOString().slice(0, 7); // Format month as YYYY-MM
    console.log(`Filtering users for month: ${currentMonth}`); // Debugging

    const monthlyCount = users.filter((user: any) => {
      const userMonth = new Date(user.createdAt).toISOString().slice(0, 7);
      return userMonth === currentMonth;
    }).length;

    console.log(`Monthly Count for ${currentMonth}: ${monthlyCount}`); // Debugging
    setMonthlyRequests(monthlyCount);
  };
  const handleMonthChange = (date: Date | null) => {
    console.log(`Selected Month: ${date}`); // Debugging
    setSelectedDate(date);
  
    if (date) {
      // Format the selected month as YYYY-MM
      const formattedMonth = date.toISOString().slice(0, 7);
  
      // Filter users for the selected month
      const monthlyCount = users.filter((user: any) => {
        const userMonth = new Date(user.createdAt).toISOString().slice(0, 7);
        return userMonth === formattedMonth;
      }).length;
  
      console.log(`Monthly Count for ${formattedMonth}: ${monthlyCount}`); // Debugging
      setMonthlyRequests(monthlyCount);
    }
  };
  

  // Calculate overall schedule data by month
  const calculateOverallSchedule = (users: any[]) => {
    const schedule = users.reduce((acc: any, user: any) => {
      const userMonth = new Date(user.createdAt).toISOString().slice(0, 7); // Extract YYYY-MM
      acc[userMonth] = (acc[userMonth] || 0) + 1; // Count users by month
      return acc;
    }, {});

    // Convert to an array of { month, count }
    const scheduleArray = Object.entries(schedule).map(([month, count]) => ({
      month,
      count,
    }));

    console.log("Overall Schedule:", scheduleArray); // Debugging
    setOverallSchedule(scheduleArray);
  };

  // Handle date picker changes for daily requests
  const handleDateChange = (date: Date | null) => {
    console.log(`Selected Date: ${date}`); // Debugging
    setSelectedDate(date);

    if (date) {
      calculateDailyRequests(users, date);
    }
  };

  // Get the current month name dynamically
  const currentMonthName = new Date().toLocaleString("default", {
    month: "long",
  });

  return (
    <div className="max-w-[90%] mx-auto">
      <h1 className="text-2xl text-start my-4">Overview</h1>
      <div className="stats shadow grid grid-cols-2 gap-2">
  {/* Daily Booking Requests Donut Chart */}
  <div className="stat place-items-center text-black">
    <div className="stat-title" style={{ color: "#00000f" }}>
      Booking Requests by Date
    </div>
    <DonutChart
      completedCount={dailyRequests}
      totalCount={dailyRequests || 1} // Ensure chart renders even if count is 0
    />
    <div className="mt-4">
      <label
        htmlFor="datePicker"
        className="block mb-1 text-sm font-medium"
        style={{ color: "#00000f" }}
      >
        Select Date:
      </label>
      <DatePicker
        id="datePicker"
        selected={selectedDate}
        onChange={handleDateChange}
        className="border px-2 py-1 rounded"
        placeholderText="Select a date"
        showPopperArrow={false}
      />
    </div>
  </div>

  {/* Monthly Booking Requests Donut Chart */}
  <div className="stat place-items-center text-black">
    <div className="stat-title" style={{ color: "#00000f" }}>
      {currentMonthName} Booking Requests
    </div>
    <DonutChart
      completedCount={monthlyRequests}
      totalCount={monthlyRequests || 1} // Ensure chart renders even if count is 0
    />
    <div className="mt-4">
      <label
        htmlFor="monthPicker"
        className="block mb-1 text-sm font-medium"
        style={{ color: "#00000f" }}
      >
        Select Month:
      </label>
      <DatePicker
        id="monthPicker"
        selected={selectedDate}
        onChange={(date) => handleMonthChange(date)} // Update data when month changes
        dateFormat="MMMM, yyyy" // Month and year in full text
        showMonthYearPicker // Enables month picker
        className="border px-2 py-1 rounded"
        placeholderText="Select a month"
      />
    </div>
  </div>

  {/* Overall Schedule Donut Chart */}
  <div className="stat place-items-center text-black">
    <div className="stat-title" style={{ color: "#00000f" }}>
      Total Booking
    </div>
    <DonutChart
      completedCount={overallSchedule.reduce((acc, item) => acc + item.count, 0)}
      totalCount={overallSchedule.reduce((acc, item) => acc + item.count, 1)} // Ensure chart renders even if count is 0
    />
  </div>

  {/* <div className="stat place-items-center text-black">
    <div className="stat-title" style={{ color: "#00000f" }}>
      Total Schedules
    </div>
    <div className="stat-value" style={{ color: "#00000f" }}>
      {overallSchedule.length}
    </div>
  
  </div> */}
</div>

      

      <div className="overflow-x-auto mt-8">
        <h1 className="text-2xl text-start my-4">
          Students Waiting for Approval
        </h1>
        <TableAdmin/>
      </div>
    </div>
  );
};

export default DashboardPage;
