"use server";
import { API_BASE } from "@/lib/config";
import { ResetFormValues } from "@/app/reset-password/page";

export const resetPassword = async (data: ResetFormValues) => {
  const response = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  const responseData = await response.json();
  return responseData;
};
