"use server";
import { API_BASE } from "@/lib/config";

export const createSchedules = async (formData: FormData, accessToken: string | null) => {
  const res = await fetch(`${API_BASE}/api/v1/admin/create-schedule`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(formData),
  });
  const data = await res.json();
  return data;
};
