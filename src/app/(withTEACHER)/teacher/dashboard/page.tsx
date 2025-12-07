"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import DonutChart from "@/components/DonutChart";
import TableTeacher, { User as TeacherUser } from "@/components/tableBDM"; // adjust path
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { motion } from "framer-motion";

/* =========================
   Types + helpers
   ========================= */

// Reuse teacher user shape from tableTeacher
type UserDoc = TeacherUser;

const TZ = "Asia/Dhaka";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://luminedge-server.vercel.app";

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

/* =========================
   Component
   ========================= */
const TeacherDashboardPage = () => {
  const [allTeachers, setAllTeachers] = useState<UserDoc[]>([]);
  const [dailyCreated, setDailyCreated] = useState<number>(0);
  const [monthlyCreated, setMonthlyCreated] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    localMonthKey(new Date())
  );
  const [totalTeachers, setTotalTeachers] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const { monthMap, dayMap } = useMemo(
    () => buildBuckets(allTeachers),
    [allTeachers]
  );

  /* -------- Fetch ALL teachers (role = "teacher") with pagination -------- */
  useEffect(() => {
    const ctrl = new AbortController();

    const fetchAllTeachers = async () => {
      try {
        setLoading(true);

        const acc: UserDoc[] = [];
        const seen = new Set<string>();

        const requestedLimit = 500;
        let page = 1;
        let effectiveLimit: number | null = null;
        let totalFromServer: number | null = null;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data } = await axios.get(`${API_BASE}/api/v1/admin/users`, {
            params: {
              page,
              limit: requestedLimit,
              role: "teacher", // teachers only
            },
            signal: ctrl.signal,
          });

          const batch: UserDoc[] = (data?.users ?? []) as UserDoc[];

          if (page === 1) {
            effectiveLimit = batch.length || requestedLimit;
            if (typeof data?.total === "number") {
              totalFromServer = data.total;
            }
          }

          if (!batch.length) break;

          let newCount = 0;
          for (const u of batch) {
            const id = String(u._id);
            if (!seen.has(id)) {
              seen.add(id);
              acc.push(u);
              newCount++;
            }
          }

          if (newCount === 0) break;
          if (totalFromServer && acc.length >= totalFromServer) break;
          if (effectiveLimit && batch.length < effectiveLimit) break;

          page += 1;
        }

        setAllTeachers(acc);
        setTotalTeachers(acc.length);

        const today = new Date();
        const dayKey = localDayKey(today);
        const monthKey = localMonthKey(today);
        const buckets = buildBuckets(acc);

        setDailyCreated(buckets.dayMap[dayKey] ?? 0);
        setMonthlyCreated(buckets.monthMap[monthKey] ?? 0);
        setSelectedMonthKey(monthKey);
        setSelectedDate(today);
      } catch (err: any) {
        if (err?.name !== "CanceledError") {
          console.error("Failed to load teachers:", err?.message || err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAllTeachers();
    return () => ctrl.abort();
  }, []);

  /* -------- Handlers -------- */
  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (!date) return setDailyCreated(0);
    const key = localDayKey(date);
    setDailyCreated(dayMap[key] || 0);
  };

  const handleMonthChange = (date: Date | null) => {
    const d = date || new Date();
    setSelectedDate(d);
    const mk = localMonthKey(d);
    setSelectedMonthKey(mk);
    setMonthlyCreated(monthMap[mk] || 0);
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
     UI
     ========================= */
  return (
    <div className="w-full max-w-[1500px] mx-auto p-0 sm:p-1">
      <motion.h1
        className="text-[20px] sm:text-2xl font-semibold text-slate-900 tracking-[-0.01em] mb-0 sm:mb-0"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        Teacher Overview
      </motion.h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-2">
        {/* Daily Teacher Creation */}
        <div className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow rounded-lg p-2 sm:p-2 text-slate-900">
          <div className="text-[14px] font-semibold tracking-[-0.01em] mb-0">
            Teachers Created by Date
          </div>

          <div className="flex items-center justify-center">
            <div className="origin-center scale-[0.85] sm:scale-90">
              <DonutChart
                completedCount={dailyCreated}
                totalCount={dailyCreated || 1}
              />
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-center gap-1">
            <label
              htmlFor="datePicker"
              className="text-[13px] font-medium text-slate-900"
            >
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

        {/* Monthly Teacher Creation */}
        <div className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow rounded-lg p-2 sm:p-2 text-slate-900">
          <div className="text-[14px] font-semibold tracking-[-0.01em] mb-1">
            {currentMonthName} Teachers Created
          </div>

          <div className="flex items-center justify-center">
            <div className="origin-center scale-[0.85] sm:scale-90">
              <DonutChart
                completedCount={monthlyCreated}
                totalCount={monthlyCreated || 1}
              />
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-center gap-1">
            <label
              htmlFor="monthPicker"
              className="text-[13px] font-medium text-slate-900"
            >
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

        {/* Total Teachers */}
        <div className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow rounded-lg p-2 sm:p-2 text-slate-900">
          <div className="text-[14px] font-semibold tracking-[-0.01em] mb-1">
            Total Teachers
          </div>

          <div className="flex items-center justify-center">
            <div className="origin-center scale-[0.85] sm:scale-90">
              <DonutChart
                completedCount={totalTeachers}
                totalCount={totalTeachers || 1}
              />
            </div>
          </div>

          {loading && (
            <div className="text-[11px] mt-1.5 text-slate-500 text-center">
              Loading all teachers…
            </div>
          )}
        </div>
      </div>

      <div className="mt-1 sm:mt-1 bg-white border border-slate-200/70 shadow-sm rounded-xl">
        <div className="p-1 sm:p-1 overflow-x-auto">
          {/* Teacher list table */}
          <TableTeacher rows={allTeachers} />
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
