// Central authorized HTTP client.
//
// One place that (1) attaches the auth token, (2) refuses to send a request when
// the token is missing/expired (so we never emit `Bearer null` or a dead token),
// and (3) redirects to /login on a 401. Both the axios instance below and the
// `authFetch` wrapper share the same rules, so nothing bypasses them.
//
// Behaviour-preserving: callers may keep passing absolute URLs
// (`${API_BASE}/api/v1/...`) — axios uses an absolute URL as-is and ignores
// baseURL — or switch to relative paths that resolve against API_BASE.
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE } from "@/lib/config";
import { clearAuth, getValidToken } from "@/app/helpers/jwt";

// Marker so callers can tell "we never sent this because you're logged out"
// apart from a real network/HTTP error.
export const NO_AUTH_ERROR = "NO_VALID_TOKEN";

// Guard so a burst of failing requests triggers exactly one redirect.
let redirecting = false;

const redirectToLogin = (): void => {
  if (typeof window === "undefined") return;
  clearAuth();
  if (redirecting) return;
  if (window.location.pathname === "/login") return;
  redirecting = true;
  window.location.href = "/login";
};

const http = axios.create({
  baseURL: API_BASE,
});

// Attach the token; abort (without sending) when there isn't a usable one.
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getValidToken();
  if (!token) {
    redirectToLogin();
    return Promise.reject(new axios.Cancel(NO_AUTH_ERROR));
  }
  config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

// Any 401 means the session is no longer valid → clean redirect to /login.
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) redirectToLogin();
    return Promise.reject(error);
  }
);

export default http;

// `fetch` equivalent for the few native-fetch call sites, applying the same
// token + 401 rules. Throws NO_AUTH_ERROR (and redirects) when logged out.
export const authFetch = async (
  input: string,
  init: RequestInit = {}
): Promise<Response> => {
  const token = getValidToken();
  if (!token) {
    redirectToLogin();
    throw new Error(NO_AUTH_ERROR);
  }

  const url = /^https?:\/\//.test(input) ? input : `${API_BASE}${input}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) redirectToLogin();
  return res;
};
