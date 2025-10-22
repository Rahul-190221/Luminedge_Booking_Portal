
"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import DonutChart from "@/components/DonutChart";
import TableBDM from "@/components/tableBDM";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { motion } from "framer-motion";

/* =========================
   Types + helpers
   ========================= */
type UserDoc = {
  _id: string;                // Mongo ObjectId (string)
  role?: string;
  createdAt?: string | number | Date;
};

const TZ = "Asia/Dhaka";
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE ?? "https://luminedge-server.vercel.app";

// bridge so we can pass rows without changing TableBDM right now
const TableBDMWithRows =
  TableBDM as unknown as React.ComponentType<{ rows?: UserDoc[] }>;

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

// ObjectId -> Date (first 4 bytes = seconds)
const objectIdToDate = (id: string): Date | null => {
  if (!id || id.length < 8) return null;
  const seconds = parseInt(id.slice(0, 8), 16);
  return Number.isNaN(seconds) ? null : new Date(seconds * 1000);
};

// prefer createdAt; fallback to ObjectId time
const getCreatedDate = (u: UserDoc): Date | null => {
  const v = u?.createdAt;
  if (v) {
    const d = new Date(v as any);
    if (!Number.isNaN(+d)) return d;
  }
  return objectIdToDate(u._id);
};

// aggregate buckets
const buildBuckets = (docs: UserDoc[]) => {
  const monthMap: Record<string, number> = {};
  const dayMap: Record<string, number> = {};
  for (const u of docs) {
    const d = getCreatedDate(u);
    if (!d) continue;
    const mk = localMonthKey(d);
    const dk = localDayKey(d);
    monthMap[mk] = (monthMap[mk] || 0) + 1;
    dayMap[dk] = (dayMap[dk] || 0) + 1;
  }
  return { monthMap, dayMap };
};

// filter by month YYYY-MM
const filterByMonth = (docs: UserDoc[], monthKey: string) =>
  docs.filter((u) => {
    const d = getCreatedDate(u);
    return d ? localMonthKey(d) === monthKey : false;
  });

/* =========================
   Component
   ========================= */
const DashboardPage = () => {
  const [allUsers, setAllUsers] = useState<UserDoc[]>([]);
  const [tableRows, setTableRows] = useState<UserDoc[]>([]);
  const [dailyRequests, setDailyRequests] = useState<number>(0);
  const [monthlyRequests, setMonthlyRequests] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(localMonthKey(new Date()));
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const { monthMap, dayMap } = useMemo(() => buildBuckets(allUsers), [allUsers]);

  /* -------- Fetch ALL users (paginate) -------- */
  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);

        const pageSize = 1000;
        let page = 1;
        let total = Infinity;
        const acc: UserDoc[] = [];

        while (acc.length < total) {
          const { data } = await axios.get(`${BASE_URL}/api/v1/admin/users`, {
            params: { page, limit: pageSize },
            signal: ctrl.signal,
          });

          const batch: UserDoc[] = (data?.users || []).filter((u: UserDoc) => u.role === "user");
          acc.push(...batch);

          // loop control: rely on server 'total' if provided
          total = typeof data?.total === "number" ? data.total : acc.length;

          if (!batch.length) break;
          page += 1;
        }

        setAllUsers(acc);
        setTotalUsers(acc.length);

        // initialize KPI donuts and table for current day/month
        const today = new Date();
        const dayKey = localDayKey(today);
        const monthKey = localMonthKey(today);
        const buckets = buildBuckets(acc);

        setDailyRequests(buckets.dayMap[dayKey] ?? 0);
        setMonthlyRequests(buckets.monthMap[monthKey] ?? 0);
        setSelectedMonthKey(monthKey);
        setTableRows(filterByMonth(acc, monthKey));
      } catch (err: any) {
        if (err?.name !== "CanceledError") {
          console.error("Failed to load users:", err?.message || err);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  /* -------- Handlers -------- */
  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (!date) return setDailyRequests(0);
    const key = localDayKey(date);
    setDailyRequests(dayMap[key] || 0);
  };

  const handleMonthChange = (date: Date | null) => {
    const d = date || new Date();
    setSelectedDate(d);
    const mk = localMonthKey(d);
    setSelectedMonthKey(mk);
    setMonthlyRequests(monthMap[mk] || 0);
    setTableRows(filterByMonth(allUsers, mk));
  };

  const currentMonthName = useMemo(
    () =>
      (selectedDate || new Date()).toLocaleString("default", {
        month: "long",
        year: "numeric",
      }),
    [selectedDate]
  );

  /* =========================
     UI (compact KPI cards)
     ========================= */
  return (
    <div className="w-full max-w-[1500px] mx-auto p-0 sm:p-1">
      <motion.h1
        className="text-[20px] sm:text-2xl font-semibold text-slate-900 tracking-[-0.01em] mb-0 sm:mb-0"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        Overview
      </motion.h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-2">
        {/* Daily Booking Requests */}
        <div className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow rounded-lg p-2 sm:p-2 text-slate-900">
          <div className="text-[14px] font-semibold tracking-[-0.01em] mb-0">
            Booking Requests by Date
          </div>

          <div className="flex items-center justify-center">
            <div className="origin-center scale-[0.85] sm:scale-90">
              <DonutChart completedCount={dailyRequests} totalCount={dailyRequests || 1} />
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-center gap-1">
            <label htmlFor="datePicker" className="text-[13px] font-medium text-slate-900">
              Select Date:
            </label>
            <DatePicker
              id="datePicker"
              selected={selectedDate}
              onChange={handleDateChange}
              aria-label="Select date"
              className="w-[170px] border border-slate-200 rounded px-2 py-1.5 text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              placeholderText="Select a date"
            />
          </div>
        </div>

        {/* Monthly Booking Requests */}
        <div className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow rounded-lg p-2 sm:p-2 text-slate-900">
          <div className="text-[14px] font-semibold tracking-[-0.01em] mb-1">
            {currentMonthName} Booking Requests
          </div>

          <div className="flex items-center justify-center">
            <div className="origin-center scale-[0.85] sm:scale-90">
              <DonutChart completedCount={monthlyRequests} totalCount={monthlyRequests || 1} />
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-center gap-1">
            <label htmlFor="monthPicker" className="text-[13px] font-medium text-slate-900">
              Select Month:
            </label>
            <DatePicker
              id="monthPicker"
              selected={selectedDate}
              onChange={handleMonthChange}
              dateFormat="MMMM, yyyy"
              showMonthYearPicker
              aria-label="Select month"
              className="w-[170px] border border-slate-200 rounded px-2 py-1.5 text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              placeholderText="Select a month"
            />
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow rounded-lg p-2 sm:p-2 text-slate-900">
          <div className="text-[14px] font-semibold tracking-[-0.01em] mb-1">Total Users</div>

          <div className="flex items-center justify-center">
            <div className="origin-center scale-[0.85] sm:scale-90">
              <DonutChart completedCount={totalUsers} totalCount={totalUsers || 1} />
            </div>
          </div>

          {loading && (
            <div className="text-[11px] mt-1.5 text-slate-500 text-center">Loading all users…</div>
          )}
        </div>
      </div>

      <div className="mt-1 sm:mt-1 bg-white border border-slate-200/70 shadow-sm rounded-xl">
        <div className="p-1 sm:p-1 overflow-x-auto">
          <TableBDMWithRows rows={tableRows} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

