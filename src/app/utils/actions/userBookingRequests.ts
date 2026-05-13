"use server";
import { API_BASE } from "@/lib/config";

export const userBookingRequests = async (userId: string) => {
  const response = await fetch(`${API_BASE}/api/v1/user/booking-requests/${userId}`);
  return response.json();
};
