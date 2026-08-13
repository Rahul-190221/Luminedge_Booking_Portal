// jwt.ts
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { removeFromLocalStorage } from "../utils/local-storage";

export const authKey = "accessToken";

interface CustomJwtPayload {
  userId: string;
  role: string;
  email?: string;
  exp?: number;
  [key: string]: any;
}

// A JWT is expired when its `exp` (seconds) is at/after now.
const isExpired = (decoded: { exp?: number }): boolean =>
  !!decoded.exp && decoded.exp * 1000 <= Date.now();

// Remove the token from both stores (localStorage + cookie the middleware reads).
export const clearAuth = (): void => {
  removeFromLocalStorage(authKey);
  Cookies.remove(authKey);
};

// Single source of truth for "do I have a usable token right now".
// Returns the raw token string only when it is present AND not expired;
// otherwise clears the stale creds and returns null. The central HTTP client
// (src/lib/http.ts) uses this so no request is ever sent with `Bearer null`
// or an expired token.
export const getValidToken = (): string | null => {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem(authKey);
  if (!token) return null;

  try {
    const decoded = jwtDecode<CustomJwtPayload>(token);
    if (isExpired(decoded)) {
      clearAuth();
      return null;
    }
    return token;
  } catch {
    clearAuth();
    return null;
  }
};

// Role from the current valid token (null if logged out/expired).
export const getUserRoleFromToken = (): string | null => {
  return getUserIdFromToken()?.role ?? null;
};

export const isLoggedIn = (): boolean => {
  return getUserIdFromToken() !== null;
};

export const removeUser = () => {
  clearAuth();
  localStorage.removeItem("adminEmail"); // 👈 cleanup
  localStorage.removeItem("adminName");
};

export const getUserIdFromToken = (): CustomJwtPayload | null => {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem(authKey);
  if (!token) return null;

  try {
    const decoded = jwtDecode<CustomJwtPayload>(token);
    // Treat an expired token as logged-out and clear the stale creds so
    // callers that gate fetches on this function stop firing 401s.
    if (isExpired(decoded)) {
      clearAuth();
      return null;
    }
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
