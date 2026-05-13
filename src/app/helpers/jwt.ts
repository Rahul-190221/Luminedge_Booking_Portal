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
  if (!token) return null;

  try {
    const decoded = jwtDecode<CustomJwtPayload>(token);
    if (decoded?.userId) return decoded;
    return null;
  } catch {
    return null;
  }
};

export const getUserIdOnlyFromToken = (): string | null => {
  const user = getUserIdFromToken();
  return user?.userId || null;
};
