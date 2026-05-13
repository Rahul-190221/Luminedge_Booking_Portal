"use server";
import { API_BASE } from "@/lib/config";

export const deleteSchedule = async (id: string) => {
  const response = await fetch(`${API_BASE}/api/v1/admin/delete-schedule/${id}`, {
    method: "DELETE",
  });
  return response.json();
};
