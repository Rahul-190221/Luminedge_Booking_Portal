"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import DonutChart from "@/components/DonutChart";
import TableAdmin from "@/components/tableAdmin";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { motion } from "framer-motion";

/* =========================
   Types + helpers
   ========================= */
type UserDoc = {
  _id: string;
  role?: string;
  createdAt?: string | number | Date;
};

const TZ = "Asia/Dhaka"; // adjust if needed

// YYYY-MM-DD in given timezone
const localDayKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

// YYYY-MM in given timezone
const localMonthKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
  })
    .format(d)
    .slice(0, 7);

const toDate = (v: UserDoc["createdAt"]) => (v ? new Date(v) : null);

/* =========================
   Component
   ========================= */
const DashboardPage = () => {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [dailyRequests, setDailyRequests] = useState<number>(0);
  const [monthlyRequests, setMonthlyRequests] = useState<number>(0);
  const [overallSchedule, setOverallSchedule] = useState<Array<{ month: string; count: number }>>(
    []
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [totalUsers, setTotalUsers] = useState<number>(0);

  /* -------- Fetch users once (with abort + error handling) -------- */
  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        const { data } = await axios.get(
          "https://luminedge-server.vercel.app/api/v1/admin/users",
          { signal: ctrl.signal }
        );

        const list: UserDoc[] = (data?.users || []).filter((u: UserDoc) => u.role === "user");
        setUsers(list);
        setTotalUsers(typeof data?.total === "number" ? data.total : list.length);

        // initialize counters using local time (avoid UTC shifting)
        const today = new Date();
        calculateDailyRequests(list, today);
        calculateMonthlyRequests(list, today);
        calculateOverallSchedule(list);
      } catch (err: any) {
        if (err?.name !== "CanceledError") {
          console.error("Failed to load users:", err?.message || err);
        }
      }
    })();

    return () => ctrl.abort();
  }, []);

  /* -------- Calculations (timezone-safe) -------- */
  const calculateDailyRequests = (list: UserDoc[], date: Date | null) => {
    if (!date) return setDailyRequests(0);
    const key = localDayKey(date);
    const count = list.reduce((n, u) => {
      const d = toDate(u.createdAt);
      return d && localDayKey(d) === key ? n + 1 : n;
    }, 0);
    setDailyRequests(count);
  };

  const calculateMonthlyRequests = (list: UserDoc[], date: Date | null) => {
    if (!date) return setMonthlyRequests(0);
    const monthKey = localMonthKey(date);
    const count = list.reduce((n, u) => {
      const d = toDate(u.createdAt);
      return d && localMonthKey(d) === monthKey ? n + 1 : n;
    }, 0);
    setMonthlyRequests(count);
  };

  const calculateOverallSchedule = (list: UserDoc[]) => {
    const buckets: Record<string, number> = {};
    for (const u of list) {
      const d = toDate(u.createdAt);
      if (!d) continue;
      const k = localMonthKey(d);
      buckets[k] = (buckets[k] || 0) + 1;
    }
    setOverallSchedule(Object.entries(buckets).map(([month, count]) => ({ month, count })));
  };

  /* -------- Handlers -------- */
  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    calculateDailyRequests(users, date);
  };

  const handleMonthChange = (date: Date | null) => {
    setSelectedDate(date);
    calculateMonthlyRequests(users, date);
  };

  const currentMonthName = (selectedDate || new Date()).toLocaleString("default", {
    month: "long",
  });

  /* -------- UI -------- */
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

        {/* Monthly Booking Requests */}
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

        {/* Total Users */}
        <div className="stat bg-white shadow-md rounded-lg p-4 max-h-[380px]">
          <div className="stat-title text-[#00000f] font-medium mb-0">Total Users</div>
          <DonutChart completedCount={totalUsers} totalCount={totalUsers || 1} />
        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow-md rounded-lg p-0 md:p-2">
        <TableAdmin />
      </div>
    </div>
  );
};

export default DashboardPage;
