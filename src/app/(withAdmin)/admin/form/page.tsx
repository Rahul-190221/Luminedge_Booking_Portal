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
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://luminedge-server.vercel.app";

export default function TRFPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const scheduleId = searchParams.get("scheduleId");

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUsers = async () => {
      // Need BOTH userId and scheduleId per new backend
      if (!userId || !scheduleId) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE}/api/v1/admin/users`);
        const allUsers: User[] = response.data.users || [];
        const matchedUser = allUsers.find((u) => u._id === userId) || null;
        setUser(matchedUser);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userId, scheduleId]);

  if (!userId && !scheduleId) {
    return (
      <div className="p-6 text-red-600">
        ❌ No user ID and schedule ID in URL.
      </div>
    );
  }

  if (!userId) {
    return <div className="p-6 text-red-600">❌ No user ID in URL.</div>;
  }

  if (!scheduleId) {
    return <div className="p-6 text-red-600">❌ No schedule ID in URL.</div>;
  }

  if (loading) {
    return <div className="p-6">Loading user...</div>;
  }

  if (!user) {
    return <div className="p-6 text-red-600">❌ User not found.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Test Report Form</h1>
      <p className="text-lg text-gray-700 mb-4">
        Candidate Name: <strong>{user?.name || "N/A"}</strong>
      </p>
      {/* <p className="text-sm text-gray-500 mb-4">
        Schedule: <strong>{scheduleId}</strong>
      </p> */}

      {/* TestReportForm should read userId & scheduleId from URL via useSearchParams */}
      <TestReportForm />
    </div>
  );
}
