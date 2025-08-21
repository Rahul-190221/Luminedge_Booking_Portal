// jwt.ts
import { jwtDecode } from "jwt-decode";
import {
  getFromLocalStorage,
  removeFromLocalStorage,
} from "../utils/local-storage";

export const authKey = "accessToken";

interface CustomJwtPayload {
  userId: string;
  role: string;
  email?: string;
  [key: string]: any;
}

export const isLoggedIn = (): boolean => {
  const token = getFromLocalStorage(authKey);
  return !!token;
};

export const removeUser = () => {
  removeFromLocalStorage(authKey);
  localStorage.removeItem("adminEmail");     // 👈 cleanup
  localStorage.removeItem("adminName");
};

export const getUserIdFromToken = (): CustomJwtPayload | null => {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem(authKey);
  if (!token) {
    console.warn("No token found in localStorage.");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  try {
    const decoded = jwtDecode<CustomJwtPayload>(token);
    if (decoded?.userId) return decoded;
    console.error("Decoded token missing userId.");
    return null;
  } catch (err) {
    console.error("Token decoding failed:", err);
    return null;
  }
};

export const getUserIdOnlyFromToken = (): string | null => {
  const user = getUserIdFromToken();
  return user?.userId || null;
};
