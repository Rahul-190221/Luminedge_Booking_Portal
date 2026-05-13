'use server';
import { API_BASE } from "@/lib/config";
import { formatData } from "@/app/register/page";

export const registerUser = async (formData: formatData) => {
  const res = await fetch(`${API_BASE}/api/v1/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
    cache: 'no-store',
  });
  const data = await res.json();
  return data;
};
