"use server";
import { API_BASE } from "@/lib/config";

export const blockUserStatus = async (userId: string, newStatus: string) => {
  const response = await fetch(`${API_BASE}/api/v1/user/status/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });
  return response.json();
};
