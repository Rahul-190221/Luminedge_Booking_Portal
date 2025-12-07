"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
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

// Prefer env in production, fallback to localhost in dev
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://luminedge-server.vercel.app/api/v1";

// ---- BD-local date helpers (avoid UTC shifts visually) ----
const BD_TZ = "Asia/Dhaka";

const fmtBD = (d: Date | string | number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: BD_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d)); // -> "YYYY-MM-DD"

const bdYMD = (d: Date | string | number | null | undefined) =>
  d ? fmtBD(d) : "";

const getMonthRangeYMD = (d: Date) => {
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { from: bdYMD(start), to: bdYMD(end) };
};

const getYearRangeYMD = (d: Date) => {
  const year = d.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return { from: bdYMD(start), to: bdYMD(end) };
};

// ---- Mock types we care about ----
const allMockTypes = ["IELTS", "Pearson PTE", "TOEFL", "GRE"];

type MockTypeCount = { mockType: string; count: number };

const buildMockTypeMap = (
  items: MockTypeCount[] | undefined | null
): Record<string, number> => {
  const base: Record<string, number> = {};
  (items || []).forEach(({ mockType, count }) => {
    if (!mockType) return;
    base[mockType] = (base[mockType] || 0) + (count || 0);
  });
  allMockTypes.forEach((t) => {
    if (!(t in base)) base[t] = 0;
  });
  return base;
};

type MockTypeStats = {
  daily: Record<string, number>;
  monthly: Record<string, number>;
  yearly: Record<string, number>;
  range: Record<string, number>;
};

const emptyCounts: Record<string, number> = allMockTypes.reduce(
  (acc, t) => ({ ...acc, [t]: 0 }),
  {} as Record<string, number>
);

const AnalysisPage = () => {
  // ---- mockType stats ----
  const [mockTypeDistribution, setMockTypeDistribution] = useState<
    { name: string; value: number }[]
  >([]);

  const [mockTypeStats, setMockTypeStats] = useState<MockTypeStats>({
    daily: { ...emptyCounts },
    monthly: { ...emptyCounts },
    yearly: { ...emptyCounts },
    range: { ...emptyCounts },
  });

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [todayStatDate, setTodayStatDate] = useState<Date | null>(new Date());
  const [searchMonthDate, setSearchMonthDate] = useState<Date | null>(
    new Date()
  );
  const [searchYearDate, setSearchYearDate] = useState<Date | null>(new Date());
  const [searchedMonthlyStats, setSearchedMonthlyStats] =
    useState<Record<string, number>>({ ...emptyCounts });
  const [searchedYearlyStats, setSearchedYearlyStats] =
    useState<Record<string, number>>({ ...emptyCounts });

  const [monthlyMockCounts, setMonthlyMockCounts] = useState<any[]>([]);

  // ---- bookings / attendance stats ----
  const [groupedChartData, setGroupedChartData] = useState<
    Record<string, any>[]
  >([]);
  const [allKeys, setAllKeys] = useState<Set<string>>(new Set());
  const [uniqueUserCount, setUniqueUserCount] = useState(0);
  const [attendanceData, setAttendanceData] = useState<
    { name: string; value: number }[]
  >([
    { name: "Present", value: 0 },
    { name: "Absent", value: 0 },
    { name: "Not Updated", value: 0 },
  ]);

  const attendanceColors = ["#face39", "#00000f", "#ea5d5d"]; // present, absent, not updated
  const pieColors = ["#ea5d5d", "#007fa3", "#9196ff", "#630f54"]; // IELTS, PTE, TOEFL, GRE
  const mockColors = ["#ff9999", "#66b3ff", "#99ff99", "#c266ff"];

  const currentMonthName = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "long",
        timeZone: BD_TZ,
      }).format(new Date()),
    []
  );

  // ---------- initial load (all stats) ----------
  useEffect(() => {
    (async () => {
      try {
        const now = new Date();
        const todayStr = bdYMD(now);
        const monthRange = getMonthRangeYMD(now);
        const yearRange = getYearRangeYMD(now);

        const [
          allRangeRes,
          todayRes,
          monthRes,
          yearRes,
          monthlyRes,
          bookingsRes,
        ] = await Promise.all([
          axios.get(`${API_BASE}/admin/stats/users/mock-types/range`, {
            params: { role: "user" },
          }),
          axios.get(`${API_BASE}/admin/stats/users/mock-types/range`, {
            params: { role: "user", from: todayStr, to: todayStr },
          }),
          axios.get(`${API_BASE}/admin/stats/users/mock-types/range`, {
            params: {
              role: "user",
              from: monthRange.from,
              to: monthRange.to,
            },
          }),
          axios.get(`${API_BASE}/admin/stats/users/mock-types/range`, {
            params: {
              role: "user",
              from: yearRange.from,
              to: yearRange.to,
            },
          }),
          axios.get(`${API_BASE}/admin/stats/users/mock-types/monthly`, {
            params: { role: "user" },
          }),
          axios.get(`${API_BASE}/admin/stats/bookings/attendance`),
        ]);

        // ---- User / mockType stats ----
        const overallMap = buildMockTypeMap(allRangeRes.data?.byMockType || []);
        const todayMap = buildMockTypeMap(todayRes.data?.byMockType || []);
        const monthMap = buildMockTypeMap(monthRes.data?.byMockType || []);
        const yearMap = buildMockTypeMap(yearRes.data?.byMockType || []);

        setMockTypeDistribution(
          allMockTypes.map((t) => ({
            name: t,
            value: overallMap[t] ?? 0,
          }))
        );

        setMockTypeStats({
          daily: todayMap,
          monthly: monthMap,
          yearly: yearMap,
          range: { ...emptyCounts }, // will be filled when user runs a range search
        });

        // default donuts for "Search by Month/Year" = current month/year
        setSearchedMonthlyStats(monthMap);
        setSearchedYearlyStats(yearMap);

        // Monthly counts for the top grouped bar chart
        const monthlyApi = monthlyRes.data?.monthly || [];
        const monthlyForChart = monthlyApi.map(
          (row: { month: string; byMockType: MockTypeCount[] }) => {
            const map = buildMockTypeMap(row.byMockType);
            return { month: row.month, ...map };
          }
        );
        setMonthlyMockCounts(monthlyForChart);

        // ---- bookings / attendance stats ----
        const bookingsApi = bookingsRes.data || {};
        const attendanceTotals = bookingsApi.attendanceTotals || [];
        const statusTotals: Record<string, number> = {};
        (attendanceTotals as { status: string; count: number }[]).forEach(
          ({ status, count }) => {
            const key = String(status || "").toLowerCase();
            statusTotals[key] = (statusTotals[key] || 0) + (count || 0);
          }
        );

        setAttendanceData([
          { name: "Present", value: statusTotals["present"] || 0 },
          { name: "Absent", value: statusTotals["absent"] || 0 },
          {
            name: "Not Updated",
            value: statusTotals["not updated"] || 0,
          },
        ]);

        setUniqueUserCount(bookingsApi.uniqueUserCount || 0);

        const monthlyByCourseStatus =
          bookingsApi.monthlyByCourseStatus || [];
        const monthMapCourse: Record<string, any> = {};

        (monthlyByCourseStatus as {
          month: string;
          course: string;
          status: string;
          count: number;
        }[]).forEach(({ month, course, status, count }) => {
          if (!monthMapCourse[month]) monthMapCourse[month] = { month };

          // Safe status string (avoid .charAt on undefined / null)
          const safeStatus = (status || "Unknown").toString();
          const label = `${course || "Unknown"} ${
            safeStatus.charAt(0).toUpperCase() +
            safeStatus.slice(1).toLowerCase()
          }`;

          monthMapCourse[month][label] =
            (monthMapCourse[month][label] || 0) + (count || 0);
        });

        const formatted = Object.values(monthMapCourse) as Record<string, any>[];
        setGroupedChartData(formatted);

        const keySet = new Set<string>();
        formatted.forEach((row) => {
          Object.keys(row).forEach((k) => {
            if (k !== "month") keySet.add(k);
          });
        });
        setAllKeys(keySet);
      } catch (err: any) {
        // Better error logging so you can see which request is failing
        if (axios.isAxiosError(err)) {
          console.error("Error loading analysis data:", {
            url: err.config?.url,
            params: err.config?.params,
            status: err.response?.status,
            data: err.response?.data,
          });
        } else {
          console.error("Error loading analysis data (non-Axios):", err);
        }
      }
    })();
  }, []);

  // ---------- handlers for dynamic searches ----------

  const handleRangeSearch = async () => {
    if (!startDate || !endDate) return;
    try {
      const from = bdYMD(startDate);
      const to = bdYMD(endDate);
      const { data } = await axios.get(
        `${API_BASE}/admin/stats/users/mock-types/range`,
        {
          params: { role: "user", from, to },
        }
      );
      const map = buildMockTypeMap(data?.byMockType || []);
      setMockTypeStats((prev) => ({
        ...prev,
        range: map,
      }));
    } catch (err) {
      console.error("Error in handleRangeSearch", err);
    }
  };

  const handleTodaySearch = async () => {
    if (!todayStatDate) return;
    try {
      const day = bdYMD(todayStatDate);
      const { data } = await axios.get(
        `${API_BASE}/admin/stats/users/mock-types/range`,
        {
          params: { role: "user", from: day, to: day },
        }
      );
      const map = buildMockTypeMap(data?.byMockType || []);
      setMockTypeStats((prev) => ({
        ...prev,
        daily: map,
      }));
    } catch (err) {
      console.error("Error in handleTodaySearch", err);
    }
  };

  const handleSearchMonth = async () => {
    if (!searchMonthDate) return;
    try {
      const range = getMonthRangeYMD(searchMonthDate);
      const { data } = await axios.get(
        `${API_BASE}/admin/stats/users/mock-types/range`,
        {
          params: {
            role: "user",
            from: range.from,
            to: range.to,
          },
        }
      );
      const map = buildMockTypeMap(data?.byMockType || []);
      setSearchedMonthlyStats(map);
    } catch (err) {
      console.error("Error in handleSearchMonth", err);
    }
  };

  const handleSearchYear = async () => {
    if (!searchYearDate) return;
    try {
      const range = getYearRangeYMD(searchYearDate);
      const { data } = await axios.get(
        `${API_BASE}/admin/stats/users/mock-types/range`,
        {
          params: {
            role: "user",
            from: range.from,
            to: range.to,
          },
        }
      );
      const map = buildMockTypeMap(data?.byMockType || []);
      setSearchedYearlyStats(map);
    } catch (err) {
      console.error("Error in handleSearchYear", err);
    }
  };

  const renderDonutForMockType = (
    title: string,
    data: Record<string, number>
  ) => {
    const chartData = allMockTypes.map((t) => ({
      name: t,
      value: data[t] || 0,
    }));
    return (
      <div className="flex flex-col gap-1 w-full">
        {title && (
          <h3 className="text-lg font-semibold text-[#00000f] mb-2">
            {title}
          </h3>
        )}
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
              {chartData.map((_e, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={pieColors[i % pieColors.length]}
                  stroke="none"
                />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="p-1 sm:p-3 w-full sm:max-w-[100%] mx-auto bg-[#ffffff] text-[#00000f] shadow-1xl rounded-2xl border border-[#00000f]/10">
      <h1 className="text-2xl font-bold text-[#00000f] mb-0">
        Booking Analysis
      </h1>

      <div className="p-1 space-y-1">
        <h2 className="text-xl font-bold text-[#00000f]">
          📊 Extended Booking Analytics
        </h2>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={[...monthlyMockCounts].sort(
              (a, b) =>
                new Date(b.month).getTime() -
                new Date(a.month).getTime()
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
              <Bar
                key={type}
                dataKey={type}
                fill={mockColors[index % mockColors.length]}
                barSize={32}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Row 1 - Date Range & Today */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-md">
        <div>
          <h3 className="text-lg font-semibold text-[#00000f] mb-0">
            Select Date Range (by MockType)
          </h3>
          <div className="flex gap-2 mb-0">
            <DatePicker
              selected={startDate}
              onChange={setStartDate}
              className="border p-1 rounded w-full"
              placeholderText="Start Date"
            />
            <DatePicker
              selected={endDate}
              onChange={setEndDate}
              className="border p-1 rounded w-full"
              placeholderText="End Date"
            />
            <button
              onClick={handleRangeSearch}
              className="w-40 px-1 py-1 rounded-full font-extrabold text-sm uppercase tracking-widest bg-gradient-to-r from-[#00000f] to-[#1a1a2e] text-white shadow-md hover:from-[#face39] hover:to-[#fce77d] hover:text-[#00000f] hover:shadow-2xl hover:scale-105 ring-2 ring-[#00000f] hover:ring-[#face39] transition-all duration-300 ease-in-out"
            >
              Search
            </button>
          </div>
          <p className="text-base font-normal text-[#00000f] mt-1 mb-0">
            MockType Distribution in Range
          </p>
          {renderDonutForMockType("", mockTypeStats.range)}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-[#00000f] mb-0">
            Select Date (Today)
          </h3>
          <div className="flex gap-2 mb-0">
            <DatePicker
              selected={todayStatDate}
              onChange={setTodayStatDate}
              className="border p-2 rounded w-full"
              placeholderText="Today Date"
            />
            <button
              onClick={handleTodaySearch}
              className="w-40 px-1 py-1 rounded-full font-extrabold text-sm uppercase tracking-widest bg-gradient-to-r from-[#00000f] to-[#1a1a2e] text-white shadow-md hover:from-[#face39] hover:to-[#fce77d] hover:text-[#00000f] hover:shadow-2xl hover:scale-105 ring-2 ring-[#00000f] hover:ring-[#face39] transition-all duration-300 ease-in-out"
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

      {/* Row 2 - Monthly and Yearly */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-md">
        <div>
          <h3 className="text-lg font-semibold text-[#00000f] mb-0">
            Search by Month
          </h3>
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
          <p className="text-base font-normal text-[#00000f] mt-1 mb-0">
            Monthly Count ({currentMonthName} by default)
          </p>
          {renderDonutForMockType("", searchedMonthlyStats)}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-[#00000f] mb-0">
            Search by Year
          </h3>
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
          <p className="text-base font-normal text-[#00000f] mt-1 mb-0">
            Yearly Count
          </p>
          {renderDonutForMockType("", searchedYearlyStats)}
        </div>
      </div>

      {/* Overall Mock & Attendance Analysis */}
      <div className="mt-4">
        <h1 className="text-xl font-semibold text-[#00000f] mb-1">
          Mock Analysis Overview
        </h1>

        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-2xl font-bold text-[#00000f] mb-2">
            Extended Booking Analytics (Monthly by Course & Attendance)
          </h3>

          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={[...groupedChartData].sort(
                (a, b) =>
                  new Date(b.month).getTime() -
                  new Date(a.month).getTime()
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
                else if (k.includes("not updated"))
                  fillColor = attendanceColors[2];

                return <Bar key={key} dataKey={key} fill={fillColor} />;
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center items-start">
          {/* Mock Type Distribution Pie */}
          <div className="w-full md:w-1/2 bg-white rounded-lg shadow-md p-4">
            <h4 className="text-lg font-semibold text-[#00000f] text-center mb-2">
              MockType Distribution (All Time)
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
                  {mockTypeDistribution.map((_e, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={pieColors[i % pieColors.length]}
                    />
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
                {attendanceData.reduce(
                  (acc, item) => acc + item.value,
                  0
                )}{" "}
                bookings
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
                  {attendanceData.map((_e, i) => (
                    <Cell
                      key={`cell-att-${i}`}
                      fill={
                        attendanceColors[i % attendanceColors.length]
                      }
                    />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
