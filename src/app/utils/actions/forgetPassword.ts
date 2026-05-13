"use server";
import { API_BASE } from "@/lib/config";

export const forgetPassword = async (email: string) => {
  const response = await fetch(`${API_BASE}/api/v1/auth/forget-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });
  const data = await response.json();
  return data;
};
