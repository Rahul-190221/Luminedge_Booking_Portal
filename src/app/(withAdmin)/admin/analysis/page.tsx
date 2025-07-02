"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import DonutChart from "@/components/DonutChart";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
BarChart, XAxis, YAxis, Tooltip, Bar } from "recharts";


const AnalysisPage = () => {
  const [users, setUsers] = useState([]);
  const [dailyRequests, setDailyRequests] = useState<number>(0);
  const [monthlyRequests, setMonthlyRequests] = useState<number>(0);
  const [overallSchedule, setOverallSchedule] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [mockTypeDistribution, setMockTypeDistribution] = useState<any[]>([]);
  const [mockTypeStats, setMockTypeStats] = useState<any>({ daily: {}, monthly: {}, yearly: {}, range: {} });
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [todayStatDate, setTodayStatDate] = useState<Date | null>(new Date());
  const [searchMonthDate, setSearchMonthDate] = useState<Date | null>(new Date());
  const [searchYearDate, setSearchYearDate] = useState<Date | null>(new Date());
  const [searchedMonthlyStats, setSearchedMonthlyStats] = useState<Record<string, number>>({});
  const [searchedYearlyStats, setSearchedYearlyStats] = useState<Record<string, number>>({});
  
  const [attendanceData, setAttendanceData] = useState([
    { name: "Present", value: 0 },
    { name: "Absent", value: 0 },
  ]);
  
  const attendanceColors = ["#face39", "#00000f", "#ea5d5d"]; // present, absent, not updated
  const pieColors = [
      "#ea5d5d", // IELTS - Bold Red
      "#007fa3", // PTE - Pearson Blue
      "#9196ff", // TOEFL - ETS Blue
      "#630f54", // GRE - ETS Purple
    ];
  
  const mockColors = [
      "#ff9999", // IELTS
      "#66b3ff", // PTE
      "#99ff99", // TOEFL
      "#c266ff", // GRE
    ];
  
  
  const allMockTypes = ["IELTS", "Pearson PTE", "TOEFL", "GRE"];

  const extractMockTypes = (user: any): string[] => {
    if (user.mocks && user.mocks.length > 0) {
      return user.mocks.map((m: any) => m.mockType).filter(Boolean);
    } else if (user.mockType) {
      return [user.mockType];
    }
    return [];
  };

  const getBDDate = (iso: string) => {
    const utc = new Date(iso);
    return new Date(utc.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("https://luminedge-server.vercel.app/api/v1/admin/users");
        const allUsers = response.data.users || [];
        const filteredUsers = allUsers.filter((user: any) => user.role === "user");
  
        setUsers(filteredUsers);
        calculateDailyRequests(filteredUsers, new Date());
        calculateMonthlyRequests(filteredUsers);
        calculateOverallSchedule(filteredUsers);
        calculateMockTypeDistribution(filteredUsers);
        calculateMockTypeStats(filteredUsers);
  
        // ✅ Trigger initial default month/year donut counts
        runDefaultSearches(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
  
    fetchUsers();
  }, []);
  
  const calculateMockTypeDistribution = (users: any[]) => {
    const grouped: Record<string, number> = {};
    users.forEach((user) => {
      const types = extractMockTypes(user);
      types.forEach((type) => {
        grouped[type] = (grouped[type] || 0) + 1;
      });
    });
    const pieData = allMockTypes.map((type) => ({ name: type, value: grouped[type] || 0 }));
    setMockTypeDistribution(pieData);
  };

  const calculateMockTypeStats = (users: any[]) => {
    const today = todayStatDate
      ? getBDDate(todayStatDate.toISOString()).toISOString().split("T")[0]
      : getBDDate(new Date().toISOString()).toISOString().split("T")[0];

    const currentMonth = getBDDate(new Date().toISOString()).toISOString().slice(0, 7);
    const currentYear = getBDDate(new Date().toISOString()).getFullYear();

    const daily: Record<string, number> = {};
    const monthly: Record<string, number> = {};
    const yearly: Record<string, number> = {};
    const range: Record<string, number> = {};

    users.forEach((user) => {
      const createdAt = getBDDate(user.createdAt);
      const dateStr = createdAt.toISOString().split("T")[0];
      const monthStr = createdAt.toISOString().slice(0, 7);
      const yearStr = createdAt.getFullYear();
      const mockTypes = extractMockTypes(user);

      mockTypes.forEach((type) => {
        if (dateStr === today) daily[type] = (daily[type] || 0) + 1;
        if (monthStr === currentMonth) monthly[type] = (monthly[type] || 0) + 1;
        if (yearStr === currentYear) yearly[type] = (yearly[type] || 0) + 1;

        if (startDate && endDate) {
          const start = getBDDate(startDate.toISOString());
          const end = getBDDate(endDate.toISOString());
          if (createdAt >= start && createdAt <= end) {
            range[type] = (range[type] || 0) + 1;
          }
        }
      });
    });

    const fillZero = (base: Record<string, number>) =>
      allMockTypes.reduce((acc, type) => ({ ...acc, [type]: base[type] || 0 }), {});

    setMockTypeStats({
      daily: fillZero(daily),
      monthly: fillZero(monthly),
      yearly: fillZero(yearly),
      range: fillZero(range),
    });
  };

  const calculateDailyRequests = (users: any[], date: Date | null) => {
    const formattedDate = date?.toISOString().split("T")[0];
    const count = users.filter((user: any) => new Date(user.createdAt).toISOString().split("T")[0] === formattedDate).length;
    setDailyRequests(count);
  };

  const calculateMonthlyRequests = (users: any[]) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = users.filter((user: any) => new Date(user.createdAt).toISOString().slice(0, 7) === currentMonth).length;
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
    const count = users.filter((user: any) => new Date(user.createdAt).toISOString().slice(0, 7) === formattedMonth).length;
    setMonthlyRequests(count);
  };

  const handleRangeSearch = () => {
    if (startDate && endDate) {
      const range: Record<string, number> = {};
      users.forEach((user: { createdAt: string; mocks?: any[]; mockType?: string }) => {
          const createdAt = getBDDate(user.createdAt);
          const mockTypes = extractMockTypes(user);
  
        if (createdAt >= getBDDate(startDate.toISOString()) && createdAt <= getBDDate(endDate.toISOString())) {
          mockTypes.forEach((type) => {
            range[type] = (range[type] || 0) + 1;
          });
        }
      });
  
      const filled = allMockTypes.reduce((acc, type) => ({ ...acc, [type]: range[type] || 0 }), {});
      setMockTypeStats((prev: any) => ({ ...prev, range: filled }));
    }
  };
  
  const handleTodaySearch = () => {
    if (todayStatDate) {
      const today = getBDDate(todayStatDate.toISOString()).toISOString().split("T")[0];
      const daily: Record<string, number> = {};
  
      users.forEach((user: { createdAt: string; mocks?: any[]; mockType?: string }) => {
        const dateStr = getBDDate(user.createdAt).toISOString().split("T")[0];
        const mockTypes = extractMockTypes(user);
  
        if (dateStr === today) {
          mockTypes.forEach((type) => {
            daily[type] = (daily[type] || 0) + 1;
          });
        }
      });
  
      const filled = allMockTypes.reduce((acc, type) => ({ ...acc, [type]: daily[type] || 0 }), {});
      setMockTypeStats((prev: any) => ({ ...prev, daily: filled }));
    }
  };
  

  const currentMonthName = new Date().toLocaleString("default", { month: "long" });
  const handleSearchMonth = () => {
    if (searchMonthDate) {
      const selectedMonth = searchMonthDate.toISOString().slice(0, 7);
      const monthly: Record<string, number> = {};
  
      users.forEach((user: any) => {
        const userMonth = new Date(user.createdAt).toISOString().slice(0, 7);
        const mockTypes = extractMockTypes(user);
  
        if (userMonth === selectedMonth) {
          mockTypes.forEach((type) => {
            monthly[type] = (monthly[type] || 0) + 1;
          });
        }
      });
  
      const filled = allMockTypes.reduce((acc, type) => ({ ...acc, [type]: monthly[type] || 0 }), {});
      setSearchedMonthlyStats(filled);
    }
  };
  
  const handleSearchYear = () => {
    if (searchYearDate) {
      const selectedYear = searchYearDate.getFullYear();
      const yearly: Record<string, number> = {};
  
      users.forEach((user: any) => {
        const userYear = new Date(user.createdAt).getFullYear();
        const mockTypes = extractMockTypes(user);
  
        if (userYear === selectedYear) {
          mockTypes.forEach((type) => {
            yearly[type] = (yearly[type] || 0) + 1;
          });
        }
      });
  
      const filled = allMockTypes.reduce((acc, type) => ({ ...acc, [type]: yearly[type] || 0 }), {});
      setSearchedYearlyStats(filled);
    }
  };
  
  const renderDonutForMockType = (title: string, data: Record<string, number>) => {
    const chartData = allMockTypes.map((type) => ({ name: type, value: data[type] || 0 }));
    return (
      <div className="flex flex-col gap-1 w-full">
        <h3 className="text-lg font-semibold text-[#00000f] mb-2">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              dataKey="value"
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {chartData.map((_entry, index) => (
        <Cell
          key={`cell-${index}`}
          fill={pieColors[index % pieColors.length]}
          stroke="none" // ✅ Removes the outline
        />
      ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const runDefaultSearches = (usersData: any[]) => {
    // Default Monthly Stats
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthly: Record<string, number> = {};
    usersData.forEach((user: any) => {
      const userMonth = new Date(user.createdAt).toISOString().slice(0, 7);
      const mockTypes = extractMockTypes(user);
      if (userMonth === currentMonth) {
        mockTypes.forEach((type) => {
          monthly[type] = (monthly[type] || 0) + 1;
        });
      }
    });
    const filledMonthly = allMockTypes.reduce((acc, type) => ({ ...acc, [type]: monthly[type] || 0 }), {});
    setSearchedMonthlyStats(filledMonthly);
  
    // Default Yearly Stats
    const currentYear = new Date().getFullYear();
    const yearly: Record<string, number> = {};
    usersData.forEach((user: any) => {
      const userYear = new Date(user.createdAt).getFullYear();
      const mockTypes = extractMockTypes(user);
      if (userYear === currentYear) {
        mockTypes.forEach((type) => {
          yearly[type] = (yearly[type] || 0) + 1;
        });
      }
    });
    const filledYearly = allMockTypes.reduce((acc, type) => ({ ...acc, [type]: yearly[type] || 0 }), {});
    setSearchedYearlyStats(filledYearly);
  };
  
  const monthlyMockCounts = (() => {
    const monthlyMap: Record<string, Record<string, number>> = {};
  
    users.forEach((user: any) => {
      const createdAt = getBDDate(user.createdAt);
      const monthKey = createdAt.toISOString().slice(0, 7);
      const mockTypes = extractMockTypes(user);
  
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {};
      }
  
      mockTypes.forEach((type) => {
        monthlyMap[monthKey][type] = (monthlyMap[monthKey][type] || 0) + 1;
      });
    });
  
    return Object.entries(monthlyMap).map(([month, counts]) => {
      const filledCounts = allMockTypes.reduce((acc, type) => {
        acc[type] = counts[type] || 0;
        return acc;
      }, {} as Record<string, number>);
  
      return { month, ...filledCounts };
    });
  })();
  
  const [monthlyCourseAttendance, setMonthlyCourseAttendance] = useState<
  Record<
    string,
    Record<string, { present: number; absent: number; notUpdated: number }>
  >
>({});

const [groupedChartData, setGroupedChartData] = useState<Record<string, any>[]>([]);
const [allKeys, setAllKeys] = useState<Set<string>>(new Set());

  const [uniqueUserCount, setUniqueUserCount] = useState(0);
  const fetchGroupedAttendanceStats = async () => {
    try {
      const res = await axios.get("https://luminedge-server.vercel.app/api/v1/admin/bookings");
      const bookings = res.data.bookings || [];
  
      const monthlyGrouped: Record<string, Record<string, number>> = {};
  
      bookings.forEach((booking: any) => {
        const course = booking.name || "Unknown";
        const status = (booking.attendance || "Not Updated").toLowerCase();
        const date = new Date(booking.bookingDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  
        const key = `${course} ${status.charAt(0).toUpperCase() + status.slice(1)}`; // e.g., "IELTS Present"
  
        if (!monthlyGrouped[monthKey]) monthlyGrouped[monthKey] = {};
        if (!monthlyGrouped[monthKey][key]) monthlyGrouped[monthKey][key] = 0;
  
        monthlyGrouped[monthKey][key]++;
      });
  
      const formatted = Object.entries(monthlyGrouped).map(([month, counts]) => ({
        month,
        ...counts,
      }));
  
      const uniqueKeys: Set<string> = new Set<string>();
      formatted.forEach((entry) => {
        Object.keys(entry).forEach((key) => {
          if (key !== "month") uniqueKeys.add(key);
        });
      });
  
      setGroupedChartData(formatted);
      setAllKeys(uniqueKeys);
    } catch (error) {
      console.error("Error loading grouped attendance stats:", error);
    }
  };
  
  const fetchAttendanceStats = async () => {
    try {
      const res = await axios.get("https://luminedge-server.vercel.app/api/v1/admin/bookings"); // ⬅️ switch to local if needed
      const bookings = res.data.bookings || [];
  
      console.log("✅ Bookings fetched for attendance summary:", bookings);
  
      let presentCount = 0;
      let absentCount = 0;
      let notUpdatedCount = 0;
      const userSet = new Set();
  
      bookings.forEach((booking: { name?: string; attendance?: string; bookingDate: string; userId?: string }) => {
        const status = booking.attendance?.toLowerCase();
        const userId = booking.userId;
  
        if (userId) userSet.add(userId);
  
        if (status === "present") presentCount++;
        else if (status === "absent") absentCount++;
        else notUpdatedCount++;
      });
  
      setUniqueUserCount(userSet.size);
      setAttendanceData([
        { name: "Present", value: presentCount },
        { name: "Absent", value: absentCount },
        { name: "Not Updated", value: notUpdatedCount },
      ]);
    } catch (error) {
      console.error("❌ Error fetching attendance stats:", error);
    }
  };
  

  useEffect(() => {
    fetchGroupedAttendanceStats();
  }, []);
  useEffect(() => {
    fetchGroupedAttendanceStats();
    fetchAttendanceStats(); // ✅ must run to set pie chart data
  }, []);
  

    return (
      <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
        <h1 className="text-2xl font-bold text-[#00000f] mb-0">Booking Analysis</h1>

        <div className="p-1 space-y-1">
      <h2 className="text-xl font-bold text-[#00000f]">📊Extended Booking Analytics</h2>

      <ResponsiveContainer width="100%" height={350}>
  <BarChart
    data={[...monthlyMockCounts].sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())}
    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
  >
    <XAxis
      dataKey="month"
      tickFormatter={(month) =>
        new Date(month + "-01").toLocaleString("default", { month: "short", year: "2-digit" })
      }
      stroke="#00000f"
    />
    <YAxis stroke="#00000f" />
    <Tooltip />
    <Legend />
    {allMockTypes.map((type, index) => (
      <Bar
        key={type}
        dataKey={type}
        fill={mockColors[index]}
        barSize={32}
        radius={[0, 0, 0, 0]}
      />
    ))}
  </BarChart>
</ResponsiveContainer>
    </div>


      {/* 📦 Row 1 - Date Range & Today */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-md">

  {/* Range-based mock type chart */}
  <div>
    <h3 className="text-lg font-semibold text-[#00000f] mb-0">Select Date Range (by MockType)</h3>
    <div className="flex gap-2 mb-0">
      <DatePicker selected={startDate} onChange={setStartDate} className="border p-1 rounded w-full" placeholderText="Start Date" />
      <DatePicker selected={endDate} onChange={setEndDate} className="border p-1 rounded w-full" placeholderText="End Date" />
      <button
  onClick={handleRangeSearch}
  className="w-40 px-1 py-1 rounded-full font-extrabold text-sm uppercase tracking-widest bg-gradient-to-r from-[#00000f] to-[#1a1a2e] text-white shadow-md hover:from-[#face39] hover:to-[#fce77d] hover:text-[#00000f] hover:shadow-2xl hover:scale-105 ring-2 ring-[#00000f] hover:ring-[#face39] transition-all duration-300 ease-in-out flex items-center justify-center gap-1"
>
  Search
</button>

    </div>
     {/* ✅ Use custom plain text instead of title inside donut */}
  <p className="text-base font-normal text-[#00000f] mt-1 mb-0">
    MockType Distribution in Range
  </p>

  {/* 🛠️ Remove title inside this function if it renders again */}
  {renderDonutForMockType("", mockTypeStats.range)}
  </div>

  {/* Today-based mock type chart */}
  <div>
    <h3 className="text-lg font-semibold text-[#00000f] mb-0">Select Date (Today)</h3>
    <div className="flex gap-2 mb-0">
      <DatePicker selected={todayStatDate} onChange={setTodayStatDate} className="border p-2 rounded w-full" placeholderText="Today Date" />
      <button
  onClick={handleTodaySearch}
className="w-40 px-1 py-1 rounded-full font-extrabold text-sm uppercase tracking-widest bg-gradient-to-r from-[#00000f] to-[#1a1a2e] text-white shadow-md hover:from-[#face39] hover:to-[#fce77d] hover:text-[#00000f] hover:shadow-2xl hover:scale-105 ring-2 ring-[#00000f] hover:ring-[#face39] transition-all duration-300 ease-in-out flex items-center justify-center gap-1"
>
  Search
</button>

    </div>
    <p className="text-base font-normal text-[#00000f] mt-1 mb-0">
  Today Count
</p>
{renderDonutForMockType("", mockTypeStats.daily)}

  </div>
      </div>


      {/* 📦 Row 2 - Monthly and Yearly */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-md">

  {/* Monthly Count Section */}
  <div>
    <h3 className="text-lg font-semibold text-[#00000f] mb-0">Search by Month</h3>
    <div className="flex gap-2 mb-0">
      <DatePicker
        selected={searchMonthDate}
        onChange={setSearchMonthDate}
        dateFormat="MMMM yyyy"
        showMonthYearPicker
        className="border p-2 rounded w-full"
        placeholderText="Select Month"
      />
      <button
  onClick={handleSearchMonth}
  className="w-40 px-1 py-1 rounded-full font-extrabold text-sm uppercase tracking-widest bg-gradient-to-r from-[#00000f] to-[#1a1a2e] text-white shadow-md hover:from-[#face39] hover:to-[#fce77d] hover:text-[#00000f] hover:shadow-2xl hover:scale-105 ring-2 ring-[#00000f] hover:ring-[#face39] transition-all duration-300 ease-in-out flex items-center justify-center gap-1"
>
  Search
</button>

    </div>
    <p className="text-base font-normal text-[#00000f] mt-1 mb-0">
  Monthly Count
</p>
{renderDonutForMockType("", searchedMonthlyStats || mockTypeStats.monthly)}

  </div>

  {/* Yearly Count Section */}
  <div>
    <h3 className="text-lg font-semibold text-[#00000f] mb-0">Search by Year</h3>
    <div className="flex gap-2 mb-0">
      <DatePicker
        selected={searchYearDate}
        onChange={setSearchYearDate}
        showYearPicker
        dateFormat="yyyy"
        className="border p-2 rounded w-full"
        placeholderText="Select Year"
      />
     <button 
  onClick={handleSearchYear}
  className="w-40 px-1 py-1 rounded-full font-extrabold text-sm uppercase tracking-widest bg-gradient-to-r from-[#00000f] to-[#1a1a2e] text-white shadow-md hover:from-[#face39] hover:to-[#fce77d] hover:text-[#00000f] hover:shadow-2xl hover:scale-105 ring-2 ring-[#00000f] hover:ring-[#face39] transition-all duration-300 ease-in-out flex items-center justify-center gap-1"
>
  Search
</button>

    </div>
    <p className="text-base font-normal text-[#00000f] mt-1 mb-0">
  Yearly Count
</p>
{renderDonutForMockType("", searchedYearlyStats || mockTypeStats.yearly)}

  </div>
      </div>


{/* 🔍 Overall Mock Analysis Section */}
<div className="mt-4">
  <h1 className="text-xl font-semibold text-[#00000f] mb-1">Mock Analysis Overview</h1>

  {/* 📊 Monthly Course & Attendance Bar Chart */}
  <div className="bg-white p-4 rounded-lg shadow-md mb-6">
  <h3 className="text-2xl font-bold text-[#00000f] mb-2">
    Extended Booking Analytics (Monthly by Course & Attendance)
  </h3>

  <ResponsiveContainer width="100%" height={500}>
    <BarChart
      data={[...groupedChartData].sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())}
      margin={{ top: 20, right: 30, bottom: 5, left: 10 }}
    >
      <XAxis
        dataKey="month"
        stroke="#00000f"
        tickFormatter={(month) =>
          new Date(month + "-01").toLocaleString("default", {
            month: "short",
            year: "2-digit",
          })
        }
      />
      <YAxis stroke="#00000f" />
      <Tooltip />
      {/* ❌ Legend removed to avoid long multi-row labels */}
      {/* <Legend /> */}

      {Array.from(allKeys).map((key) => {
        let fillColor = "#ccc"; // default color

        if (key.toLowerCase().includes("present")) fillColor = attendanceColors[0]; // 🟡
        else if (key.toLowerCase().includes("absent")) fillColor = attendanceColors[1]; // ⚫
        else if (key.toLowerCase().includes("not updated")) fillColor = attendanceColors[2]; // 🔴

        return (
          <Bar
            key={key}
            dataKey={key}
            stackId={undefined}
            fill={fillColor}
          />
        );
      })}
    </BarChart>
  </ResponsiveContainer>
</div>


  {/* 📈 Side-by-side Pie Charts */}
  <div className="flex flex-col md:flex-row gap-6 justify-center items-start">
    
    {/* 🟠 Mock Type Distribution Pie */}
    <div className="w-full md:w-1/2 bg-white rounded-lg shadow-md p-4">
      <h4 className="text-lg font-semibold text-[#00000f] text-center mb-2">
        MockType Distribution (All)
      </h4>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            dataKey="value"
            data={mockTypeDistribution}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {mockTypeDistribution.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={pieColors[index % pieColors.length]}
              />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>

    {/* 🧾 Attendance Summary Pie */}
<div className="w-full md:w-1/2 bg-white rounded-lg shadow-md p-4">
  <h4 className="text-lg font-semibold text-[#00000f] text-center mb-2">
    Attendance Summary of{" "}
    <span className="font-bold">
      {attendanceData.reduce((acc, item) => acc + item.value, 0)} bookings
    </span>{" "}
    across{" "}
    <span className="font-bold">{uniqueUserCount}</span> users
  </h4>

  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        dataKey="value"
        data={attendanceData}
        cx="50%"
        cy="50%"
        outerRadius={100}
        label
      >
        {attendanceData.map((_entry, index) => (
          <Cell
            key={`cell-att-${index}`}
            fill={attendanceColors[index % attendanceColors.length]}
          />
        ))}
      </Pie>
      <Legend />
    </PieChart>
  </ResponsiveContainer>
</div>


  </div>
</div>

  

      {/* Booking stat cards
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div className="stat bg-white shadow-md rounded-lg p-4 text-center max-h-[380px] text-[#00000f]">
          <div className="stat-title text-[#00000f] font-medium mb-1 text-center sm:text-left">
            Booking Requests by Date
          </div>
          <DonutChart completedCount={dailyRequests} totalCount={dailyRequests || 1} />
          <div className="mt-2">
            <label htmlFor="datePicker" className="block text-sm font-medium text-[#00000f] mb-1">
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

        <div className="stat bg-white shadow-md rounded-lg p-4 text-center max-h-[380px]">
          <div className="stat-title text-[#00000f] font-medium mb-1 text-center sm:text-left">
            {currentMonthName} Booking Requests
          </div>
          <DonutChart completedCount={monthlyRequests} totalCount={monthlyRequests || 1} />
          <div className="mt-2">
            <label htmlFor="monthPicker" className="block text-sm font-medium text-[#00000f] mb-1">
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

        <div className="stat bg-white shadow-md rounded-lg p-4 max-h-[380px]">
          <div className="stat-title text-[#00000f] font-medium mb-0">Total Booking</div>
          <DonutChart
            completedCount={overallSchedule.reduce((acc, item) => acc + item.count, 0)}
            totalCount={overallSchedule.reduce((acc, item) => acc + item.count, 1)}
          />
        </div>
      </div> */}
      
    </div>
  );
};

export default AnalysisPage;

