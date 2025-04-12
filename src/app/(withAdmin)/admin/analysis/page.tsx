// File: app/admin/analysis/page.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import DonutChart from "@/components/DonutChart";

const chartColors: Record<string, string> = {
  IELTS: "#00000f",
  "PEARSON PTE": "#FACE39",
  GRE: "#009688",
  TOEFL: "#E91E63",
  Attended: "#4CAF50",
  Absent: "#F44336",
};

const AnalysisPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [dailyRequests, setDailyRequests] = useState<number>(0);
  const [monthlyRequests, setMonthlyRequests] = useState<number>(0);
  const [totalBooking, setTotalBooking] = useState<number>(0);
  const [attendanceStats, setAttendanceStats] = useState({ attended: 0, absent: 0 });
  const [mockTypeStats, setMockTypeStats] = useState<Record<string, { today: number; month: number; year: number }>>({
    IELTS: { today: 0, month: 0, year: 0 },
    "PEARSON PTE": { today: 0, month: 0, year: 0 },
    GRE: { today: 0, month: 0, year: 0 },
    TOEFL: { today: 0, month: 0, year: 0 },
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [chartView, setChartView] = useState<"today" | "month" | "year">("month");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("https://luminedge-server.vercel.app/api/v1/admin/users");
        const fetchedUsers = response.data.users || [];
        setUsers(fetchedUsers);
        setTotalBooking(fetchedUsers.length);
        calculateDailyRequests(fetchedUsers, new Date());
        calculateMonthlyRequests(fetchedUsers, new Date());
        calculateMockTypeStats(fetchedUsers);
        calculateAttendanceStats(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  const calculateAttendanceStats = (users: any[]) => {
    let attended = 0;
    let absent = 0;
    users.forEach((user) => {
      if (user.role === "user" && !user.isDeleted) {
        if (user.status === "completed") attended++;
        else absent++;
      }
    });
    setAttendanceStats({ attended, absent });
  };

  const calculateMockTypeStats = (users: any[]) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentMonth = today.toISOString().slice(0, 7);
    const currentYear = today.getFullYear();

    const stats: Record<string, { today: number; month: number; year: number }> = {
      IELTS: { today: 0, month: 0, year: 0 },
      "PEARSON PTE": { today: 0, month: 0, year: 0 },
      GRE: { today: 0, month: 0, year: 0 },
      TOEFL: { today: 0, month: 0, year: 0 },
    };

    users.forEach((user) => {
      if (user.role !== "user" || user.isDeleted) return;

      let mockType = user.mockType?.toUpperCase();
      if (mockType === "PTE") mockType = "PEARSON PTE";
      if (!stats[mockType]) return;

      const createdAt = new Date(user.createdAt);
      const createdStr = createdAt.toISOString().split("T")[0];

      if (createdStr === todayStr) stats[mockType].today++;
      if (createdAt.toISOString().slice(0, 7) === currentMonth) stats[mockType].month++;
      if (createdAt.getFullYear() === currentYear) stats[mockType].year++;
    });

    setMockTypeStats(stats);
  };

  const calculateDailyRequests = (users: any[], date: Date | null) => {
    const formattedDate = date?.toISOString().split("T")[0];
    const count = users.filter(
      (user: any) => user.role === "user" && !user.isDeleted && new Date(user.createdAt).toISOString().split("T")[0] === formattedDate
    ).length;
    setDailyRequests(count);
  };

  const calculateMonthlyRequests = (users: any[], date: Date | null) => {
    const currentMonth = date?.toISOString().slice(0, 7);
    const count = users.filter(
      (user: any) => user.role === "user" && !user.isDeleted && new Date(user.createdAt).toISOString().slice(0, 7) === currentMonth
    ).length;
    setMonthlyRequests(count);
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    calculateDailyRequests(users, date);
  };

  const handleMonthChange = (date: Date | null) => {
    setSelectedDate(date);
    calculateMonthlyRequests(users, date);
  };

  const currentMonthName = selectedDate?.toLocaleString("default", { month: "long" }) || "";

  const donutData = Object.entries(mockTypeStats).map(([type, stats]) => ({
    name: type,
    value: stats?.[chartView] || 0,
  }));

  const hasChartData = donutData.some((d) => d.value > 0);

  const attendanceChartData = [
    { name: "Attended", value: attendanceStats.attended },
    { name: "Absent", value: attendanceStats.absent },
  ];

  return (
    <div className="text-[#00000f]">
      {/* Existing content ... */}

      {/* Attendance Chart */}
      <div className="mt-6 bg-white shadow-md rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">🎓 Attendance Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={attendanceChartData}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {attendanceChartData.map((entry) => (
                <Cell key={entry.name} fill={chartColors[entry.name]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalysisPage;
