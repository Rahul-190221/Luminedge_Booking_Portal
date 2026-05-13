"use server";
import { API_BASE } from "@/lib/config";

export const fetchAllUsers = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/user/all`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};
