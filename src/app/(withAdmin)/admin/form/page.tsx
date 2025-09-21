"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TestReportForm from "@/components/TestReportForm";
import axios from "axios";

type User = {
  _id: string;
  name: string;
  email?: string;
  [key: string]: any;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://luminedge-server.vercel.app";

// same key the list page uses before router.push()
const trfUserCacheKey = (scheduleId: string, userId: string) =>
  `trf:${scheduleId}:${userId}`;

export default function TRFPage() {
  const searchParams = useSearchParams();
  const userId = String(searchParams.get("userId") || "");
  const scheduleId = String(searchParams.get("scheduleId") || "");

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId || !scheduleId) {
        setErr(!userId && !scheduleId ? "No user ID and schedule ID in URL." :
              !userId ? "No user ID in URL." : "No schedule ID in URL.");
        setLoading(false);
        return;
      }

      try {
        // 1) Try cache first (saved on the list page click)
        const raw = sessionStorage.getItem(trfUserCacheKey(scheduleId, userId));
        if (raw) {
          const cached = JSON.parse(raw) as User;
          if (!cancelled) {
            setUser(cached);
            setLoading(false);
          }
          return;
        }

        // 2) Fallback: precise backend endpoint (no pagination issue)
        const { data } = await axios.get(`${API_BASE}/api/v1/user/${userId}`);
        if (!cancelled) {
          if (data?.user) {
            setUser(data.user as User);
          } else {
            setErr("User not found.");
          }
          setLoading(false);
        }
      } catch (e) {
        console.error("TRF load error:", e);
        if (!cancelled) {
          setErr("Failed to load user.");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, scheduleId]);

  if (loading) return <div className="p-6">Loading user…</div>;
  if (err) return <div className="p-6 text-red-600">❌ {err}</div>;
  if (!user) return <div className="p-6 text-red-600">❌ User not found.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Test Report Form</h1>
      <p className="text-lg text-gray-700 mb-4">
        Candidate Name: <strong>{user.name || "N/A"}</strong>
      </p>
      {/* TestReportForm reads userId & scheduleId from URL */}
      <TestReportForm />
    </div>
  );
}
