'use server';
import { API_BASE } from "@/lib/config";
import { FormValues } from "@/app/login/page";

export const loginUser = async (formData: FormValues) => {
  try {
    const res = await fetch(`${API_BASE}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      cache: 'no-store',
    });
    return await res.json();
  } catch {
    return { error: 'Unable to reach the server. Please try again later.' };
  }
};
