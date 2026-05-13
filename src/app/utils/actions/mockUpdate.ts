"use server";
import { API_BASE } from "@/lib/config";
import { User } from "@/components/tableAdmin";

export const updateMockNumber = async (
  mockNumber: string,
  selectedUser: User,
  transactionId: string,
  mockType: string,
  testType: string
) => {
  const res = await fetch(
    `${API_BASE}/api/v1/user/update/${selectedUser._id}/${mockNumber}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, mockType, testType }),
      cache: "no-store",
    }
  );
  const data = await res.json();
  return data;
};
