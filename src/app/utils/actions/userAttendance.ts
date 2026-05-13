"use server";
import { API_BASE } from "@/lib/config";

export const userAttendanceCount = async (userId: string) => {
  const response = await fetch(`${API_BASE}/api/v1/user/attendance-count/${userId}`);
  return response.json();
};
