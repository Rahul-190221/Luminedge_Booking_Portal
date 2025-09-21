"use client";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import DonutChart from "@/components/DonutChart";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";

const API_BASE = "https://luminedge-server.vercel.app/api/v1";

// ---------- helpers ----------
async function fetchAllPaged<T = any>(
  endpoint: string,
  baseParams: Record<string, any> = {},
  pageSize = 2000
): Promise<T[]> {
  let page = 1;
  const all: T[] = [];

  // backend returns 404 if there is nothing on page 1 — treat as empty
  // otherwise, keep paging until a short page arrives
  // (also protects you from the default limit=500)
  // NOTE: params are merged; page/limit always override
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const { data } = await axios.get(`${API_BASE}${endpoint}`, {
        params: { ...baseParams, page, limit: pageSize },
      });
      const arr = (data?.bookings || data?.users || []) as T[];
      all.push(...arr);
      if (arr.length < pageSize) break;
      page += 1;
    } catch (err: any) {
      if (page === 1) return []; // treat as empty
      break; // stop paging on any later error
    }
  }
  return all;
}

const AnalysisPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [dailyRequests, setDailyRequests] = useState<number>(0);
  const [monthlyRequests, setMonthlyRequests] = useState<number>(0);
  const [overallSchedule, setOverallSchedule] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [mockTypeDistribution, setMockTypeDistribution] = useState<any[]>([]);
  const [mockTypeStats, setMockTypeStats] = useState<any>({
    daily: {},
    monthly: {},
    yearly: {},
    range: {},
  });

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [todayStatDate, setTodayStatDate] = useState<Date | null>(new Date());
  const [searchMonthDate, setSearchMonthDate] = useState<Date | null>(new Date());
  const [searchYearDate, setSearchYearDate] = useState<Date | null>(new Date());
  const [searchedMonthlyStats, setSearchedMonthlyStats] =
    useState<Record<string, number>>({});
  const [searchedYearlyStats, setSearchedYearlyStats] =
    useState<Record<string, number>>({});

  const [attendanceData, setAttendanceData] = useState([
    { name: "Present", value: 0 },
    { name: "Absent", value: 0 },
    { name: "Not Updated", value: 0 },
  ]);

  const attendanceColors = ["#face39", "#00000f", "#ea5d5d"]; // present, absent, not updated
  const pieColors = ["#ea5d5d", "#007fa3", "#9196ff", "#630f54"]; // IELTS, PTE, TOEFL, GRE
  const mockColors = ["#ff9999", "#66b3ff", "#99ff99", "#c266ff"];

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

  // ---------- USERS ----------
  useEffect(() => {
    (async () => {
      try {
        // get ALL users (not just first page)
        const allUsers = await fetchAllPaged<any>("/admin/users");
        const filtered = allUsers.filter((u) => u.role === "user");

        setUsers(filtered);
        calculateDailyRequests(filtered, new Date());
        calculateMonthlyRequests(filtered);
        calculateOverallSchedule(filtered);
        calculateMockTypeDistribution(filtered);
        calculateMockTypeStats(filtered);
        runDefaultSearches(filtered);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    })();
  }, []);

  const calculateMockTypeDistribution = (arr: any[]) => {
    const grouped: Record<string, number> = {};
    arr.forEach((user) => {
      const types = extractMockTypes(user);
      types.forEach((t) => (grouped[t] = (grouped[t] || 0) + 1));
    });
    const pieData = allMockTypes.map((t) => ({ name: t, value: grouped[t] || 0 }));
    setMockTypeDistribution(pieData);
  };

  const calculateMockTypeStats = (arr: any[]) => {
    const today =
      todayStatDate
        ? getBDDate(todayStatDate.toISOString()).toISOString().split("T")[0]
        : getBDDate(new Date().toISOString()).toISOString().split("T")[0];

    const currentMonth = getBDDate(new Date().toISOString()).toISOString().slice(0, 7);
    const currentYear = getBDDate(new Date().toISOString()).getFullYear();

    const daily: Record<string, number> = {};
    const monthly: Record<string, number> = {};
    const yearly: Record<string, number> = {};
    const range: Record<string, number> = {};

    arr.forEach((user) => {
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
      allMockTypes.reduce((acc, t) => ({ ...acc, [t]: base[t] || 0 }), {});

    setMockTypeStats({
      daily: fillZero(daily),
      monthly: fillZero(monthly),
      yearly: fillZero(yearly),
      range: fillZero(range),
    });
  };

  const calculateDailyRequests = (arr: any[], date: Date | null) => {
    const d = date?.toISOString().split("T")[0];
    const count = arr.filter(
      (u: any) => new Date(u.createdAt).toISOString().split("T")[0] === d
    ).length;
    setDailyRequests(count);
  };

  const calculateMonthlyRequests = (arr: any[]) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = arr.filter(
      (u: any) => new Date(u.createdAt).toISOString().slice(0, 7) === currentMonth
    ).length;
    setMonthlyRequests(count);
  };

  const calculateOverallSchedule = (arr: any[]) => {
    const schedule = arr.reduce((acc: any, u: any) => {
      const month = new Date(u.createdAt).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});
    setOverallSchedule(
      Object.entries(schedule).map(([month, count]) => ({ month, count }))
    );
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    calculateDailyRequests(users, date);
  };

  const handleMonthChange = (date: Date | null) => {
    setSelectedDate(date);
    const month = date?.toISOString().slice(0, 7);
    const count = users.filter(
      (u: any) => new Date(u.createdAt).toISOString().slice(0, 7) === month
    ).length;
    setMonthlyRequests(count);
  };

  const handleRangeSearch = () => {
    if (startDate && endDate) {
      const range: Record<string, number> = {};
      users.forEach((user: any) => {
        const createdAt = getBDDate(user.createdAt);
        const types = extractMockTypes(user);
        if (
          createdAt >= getBDDate(startDate.toISOString()) &&
          createdAt <= getBDDate(endDate.toISOString())
        ) {
          types.forEach((t) => (range[t] = (range[t] || 0) + 1));
        }
      });
      const filled = allMockTypes.reduce(
        (acc, t) => ({ ...acc, [t]: range[t] || 0 }),
        {}
      );
      setMockTypeStats((prev: any) => ({ ...prev, range: filled }));
    }
  };

  const handleTodaySearch = () => {
    if (todayStatDate) {
      const today = getBDDate(todayStatDate.toISOString()).toISOString().split("T")[0];
      const daily: Record<string, number> = {};
      users.forEach((user: any) => {
        const dateStr = getBDDate(user.createdAt).toISOString().split("T")[0];
        if (dateStr === today) {
          extractMockTypes(user).forEach(
            (t) => (daily[t] = (daily[t] || 0) + 1)
          );
        }
      });
      const filled = allMockTypes.reduce(
        (acc, t) => ({ ...acc, [t]: daily[t] || 0 }),
        {}
      );
      setMockTypeStats((prev: any) => ({ ...prev, daily: filled }));
    }
  };

  const currentMonthName = useMemo(
    () => new Date().toLocaleString("default", { month: "long" }),
    []
  );

  const handleSearchMonth = () => {
    if (searchMonthDate) {
      const sel = searchMonthDate.toISOString().slice(0, 7);
      const monthly: Record<string, number> = {};
      users.forEach((u: any) => {
        const userMonth = new Date(u.createdAt).toISOString().slice(0, 7);
        if (userMonth === sel) {
          extractMockTypes(u).forEach(
            (t) => (monthly[t] = (monthly[t] || 0) + 1)
          );
        }
      });
      const filled = allMockTypes.reduce(
        (acc, t) => ({ ...acc, [t]: monthly[t] || 0 }),
        {}
      );
      setSearchedMonthlyStats(filled);
    }
  };

  const handleSearchYear = () => {
    if (searchYearDate) {
      const sel = searchYearDate.getFullYear();
      const yearly: Record<string, number> = {};
      users.forEach((u: any) => {
        const year = new Date(u.createdAt).getFullYear();
        if (year === sel) {
          extractMockTypes(u).forEach(
            (t) => (yearly[t] = (yearly[t] || 0) + 1)
          );
        }
      });
      const filled = allMockTypes.reduce(
        (acc, t) => ({ ...acc, [t]: yearly[t] || 0 }),
        {}
      );
      setSearchedYearlyStats(filled);
    }
  };

  const renderDonutForMockType = (title: string, data: Record<string, number>) => {
    const chartData = allMockTypes.map((t) => ({ name: t, value: data[t] || 0 }));
    return (
      <div className="flex flex-col gap-1 w-full">
        <h3 className="text-lg font-semibold text-[#00000f] mb-2">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie dataKey="value" data={chartData} cx="50%" cy="50%" outerRadius={100} label>
              {chartData.map((_e, i) => (
                <Cell key={`cell-${i}`} fill={pieColors[i % pieColors.length]} stroke="none" />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const monthlyMockCounts = useMemo(() => {
    const monthlyMap: Record<string, Record<string, number>> = {};
    users.forEach((u: any) => {
      const createdAt = getBDDate(u.createdAt);
      const monthKey = createdAt.toISOString().slice(0, 7);
      const types = extractMockTypes(u);
      monthlyMap[monthKey] ||= {};
      types.forEach((t) => (monthlyMap[monthKey][t] = (monthlyMap[monthKey][t] || 0) + 1));
    });

    return Object.entries(monthlyMap).map(([month, counts]) => {
      const filled = allMockTypes.reduce((acc, t) => {
        acc[t] = counts[t] || 0;
        return acc;
      }, {} as Record<string, number>);
      return { month, ...filled };
    });
  }, [users]);

  // ---------- BOOKINGS (attendance) ----------
  const [groupedChartData, setGroupedChartData] = useState<Record<string, any>[]>([]);
  const [allKeys, setAllKeys] = useState<Set<string>>(new Set());
  const [uniqueUserCount, setUniqueUserCount] = useState(0);

  const fetchAndBuildBookings = async () => {
    try {
      const bookings: any[] = await fetchAllPaged("/admin/bookings");

      // ---- Pie totals + unique users
      let present = 0,
        absent = 0,
        notUpdated = 0;
      const userSet = new Set<string>();

      bookings.forEach((b) => {
        const status = (b.attendance || "not updated").toLowerCase();
        if (b.userId) userSet.add(String(b.userId));
        if (status === "present") present++;
        else if (status === "absent") absent++;
        else notUpdated++;
      });

      setUniqueUserCount(userSet.size);
      setAttendanceData([
        { name: "Present", value: present },
        { name: "Absent", value: absent },
        { name: "Not Updated", value: notUpdated },
      ]);

      // ---- Grouped monthly stacked bars
      const monthlyGrouped: Record<string, Record<string, number>> = {};
      bookings.forEach((b) => {
        const course = b.name || "Unknown";
        const status = (b.attendance || "Not Updated").toLowerCase();
        const date = new Date(b.bookingDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        const key = `${course} ${status.charAt(0).toUpperCase() + status.slice(1)}`; // "IELTS Present"
        monthlyGrouped[monthKey] ||= {};
        monthlyGrouped[monthKey][key] = (monthlyGrouped[monthKey][key] || 0) + 1;
      });

      const formatted = Object.entries(monthlyGrouped).map(([month, counts]) => ({
        month,
        ...counts,
      }));

      const keys = new Set<string>();
      formatted.forEach((row) =>
        Object.keys(row).forEach((k) => {
          if (k !== "month") keys.add(k);
        })
      );

      setGroupedChartData(formatted);
      setAllKeys(keys);
    } catch (err) {
      console.error("Error loading bookings:", err);
    }
  };

  useEffect(() => {
    // single effect: fetch all bookings once, build both charts
    fetchAndBuildBookings();
  }, []);

  // ---------- defaults for monthly/yearly donuts ----------
  const runDefaultSearches = (usersData: any[]) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthly: Record<string, number> = {};
    usersData.forEach((u: any) => {
      const m = new Date(u.createdAt).toISOString().slice(0, 7);
      if (m === currentMonth) {
        extractMockTypes(u).forEach((t) => (monthly[t] = (monthly[t] || 0) + 1));
      }
    });
    setSearchedMonthlyStats(allMockTypes.reduce((acc, t) => ({ ...acc, [t]: monthly[t] || 0 }), {}));

    const currentYear = new Date().getFullYear();
    const yearly: Record<string, number> = {};
    usersData.forEach((u: any) => {
      const y = new Date(u.createdAt).getFullYear();
      if (y === currentYear) {
        extractMockTypes(u).forEach((t) => (yearly[t] = (yearly[t] || 0) + 1));
      }
    });
    setSearchedYearlyStats(allMockTypes.reduce((acc, t) => ({ ...acc, [t]: yearly[t] || 0 }), {}));
  };

  return (
    <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <h1 className="text-2xl font-bold text-[#00000f] mb-0">Booking Analysis</h1>

      <div className="p-1 space-y-1">
        <h2 className="text-xl font-bold text-[#00000f]">📊Extended Booking Analytics</h2>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={[...monthlyMockCounts].sort(
              (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()
            )}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <XAxis
              dataKey="month"
              tickFormatter={(month) =>
                new Date(month + "-01").toLocaleString("default", {
                  month: "short",
                  year: "2-digit",
                })
              }
              stroke="#00000f"
            />
            <YAxis stroke="#00000f" />
            <Tooltip />
            <Legend />
            {allMockTypes.map((type, index) => (
              <Bar key={type} dataKey={type} fill={mockColors[index]} barSize={32} radius={[0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Row 1 - Date Range & Today */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-md">
        <div>
          <h3 className="text-lg font-semibold text-[#00000f] mb-0">Select Date Range (by MockType)</h3>
          <div className="flex gap-2 mb-0">
            <DatePicker selected={startDate} onChange={setStartDate} className="border p-1 rounded w-full" placeholderText="Start Date" />
            <DatePicker selected={endDate} onChange={setEndDate} className="border p-1 rounded w-full" placeholderText="End Date" />
            <button
              onClick={handleRangeSearch}
              className="w-40 px-1 py-1 rounded-full font-extrabold text-sm uppercase tracking-widest bg-gradient-to-r from-[#00000f] to-[#1a1a2e] text-white shadow-md hover:from-[#face39] hover:to-[#fce77d] hover:text-[#00000f] hover:shadow-2xl hover:scale-105 ring-2 ring-[#00000f] hover:ring-[#face39] transition-all duration-300 ease-in-out"
            >
              Search
            </button>
          </div>
          <p className="text-base font-normal text-[#00000f] mt-1 mb-0">MockType Distribution in Range</p>
          {renderDonutForMockType("", mockTypeStats.range)}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-[#00000f] mb-0">Select Date (Today)</h3>
          <div className="flex gap-2 mb-0">
            <DatePicker selected={todayStatDate} onChange={setTodayStatDate} className="border p-2 rounded w-full" placeholderText="Today Date" />
            <button
              onClick={handleTodaySearch}
              className="w-40 px-1 py-1 rounded-full font-extrabold text-sm uppercase tracking-widest bg-gradient-to-r from-[#00000f] to-[#1a1a2e] text-white shadow-md hover:from-[#face39] hover:to-[#fce77d] hover:text-[#00000f] hover:shadow-2xl hover:scale-105 ring-2 ring-[#00000f] hover:ring-[#face39] transition-all duration-300 ease-in-out"
            >
              Search
            </button>
          </div>
          <p className="text-base font-normal text-[#00000f] mt-1 mb-0">Today Count</p>
          {renderDonutForMockType("", mockTypeStats.daily)}
        </div>
      </div>

      {/* Row 2 - Monthly and Yearly */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-md">
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
              className="w-40 px-1 py-1 rounded-full font-extrabold text-sm uppercase tracking-widest bg-gradient-to-r from-[#00000f] to-[#1a1a2e] text-white shadow-md hover:from-[#face39] hover:to-[#fce77d] hover:text-[#00000f] hover:shadow-2xl hover:scale-105 ring-2 ring-[#00000f] hover:ring-[#face39] transition-all duration-300 ease-in-out"
            >
              Search
            </button>
          </div>
          <p className="text-base font-normal text-[#00000f] mt-1 mb-0">Monthly Count</p>
          {renderDonutForMockType("", searchedMonthlyStats || mockTypeStats.monthly)}
        </div>

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
              className="w-40 px-1 py-1 rounded-full font-extrabold text-sm uppercase tracking-widest bg-gradient-to-r from-[#00000f] to-[#1a1a2e] text-white shadow-md hover:from-[#face39] hover:to-[#fce77d] hover:text-[#00000f] hover:shadow-2xl hover:scale-105 ring-2 ring-[#00000f] hover:ring-[#face39] transition-all duration-300 ease-in-out"
            >
              Search
            </button>
          </div>
          <p className="text-base font-normal text-[#00000f] mt-1 mb-0">Yearly Count</p>
          {renderDonutForMockType("", searchedYearlyStats || mockTypeStats.yearly)}
        </div>
      </div>

      {/* Overall Mock Analysis */}
      <div className="mt-4">
        <h1 className="text-xl font-semibold text-[#00000f] mb-1">Mock Analysis Overview</h1>

        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-2xl font-bold text-[#00000f] mb-2">
            Extended Booking Analytics (Monthly by Course & Attendance)
          </h3>

          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={[...groupedChartData].sort(
                (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()
              )}
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

              {Array.from(allKeys).map((key) => {
                const k = key.toLowerCase();
                let fillColor = "#cccccc";
                if (k.includes("present")) fillColor = attendanceColors[0];
                else if (k.includes("absent")) fillColor = attendanceColors[1];
                else if (k.includes("not updated")) fillColor = attendanceColors[2];

                return <Bar key={key} dataKey={key} fill={fillColor} />;
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center items-start">
          {/* Mock Type Distribution Pie */}
          <div className="w-full md:w-1/2 bg-white rounded-lg shadow-md p-4">
            <h4 className="text-lg font-semibold text-[#00000f] text-center mb-2">
              MockType Distribution (All)
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie dataKey="value" data={mockTypeDistribution} cx="50%" cy="50%" outerRadius={100} label>
                  {mockTypeDistribution.map((_e, i) => (
                    <Cell key={`cell-${i}`} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Attendance Summary Pie */}
          <div className="w-full md:w-1/2 bg-white rounded-lg shadow-md p-4">
            <h4 className="text-lg font-semibold text-[#00000f] text-center mb-2">
              Attendance Summary of{" "}
              <span className="font-bold">
                {attendanceData.reduce((acc, item) => acc + item.value, 0)} bookings
              </span>{" "}
              across <span className="font-bold">{uniqueUserCount}</span> users
            </h4>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie dataKey="value" data={attendanceData} cx="50%" cy="50%" outerRadius={100} label>
                  {attendanceData.map((_e, i) => (
                    <Cell key={`cell-att-${i}`} fill={attendanceColors[i % attendanceColors.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* (cards kept commented as in your original) */}
      {/*
        ... your donut cards section ...
      */}
    </div>
  );
};

export default AnalysisPage;
