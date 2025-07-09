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

export default function TRFPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get("https://luminedge-server.vercel.app/api/v1/admin/users");
        const allUsers: User[] = response.data.users;

        // Find specific user by ID
        const matchedUser = allUsers.find((u) => u._id === userId);

        if (!matchedUser) {
          console.warn("User ID not found in user list.");
        }

        setUser(matchedUser || null);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userId]);

  if (!userId) {
    return <div className="p-6 text-red-600">❌ No user ID in URL.</div>;
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

      <TestReportForm />
    </div>
  );
}
