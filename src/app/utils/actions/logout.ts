// Shared logout for the custom backend-JWT session used by every active
// sidebar (student, admin, teacher, BDM).
//
// The destination is deliberately a same-origin *relative* path, so it
// resolves against whichever host serves the frontend (localhost, staging,
// production) and can never resolve against the backend API origin.
//
// Two defects are fixed here:
//   1. The previous implementation finished with NextAuth's
//      `signOut({ callbackUrl: "https://luminedge.io/login" })`. That pinned a
//      deployed domain into the browser's logout path, which is wrong on every
//      other host (local development, staging, previews).
//   2. NextAuth is a different session system from the custom JWT login this
//      application actually uses (`POST /api/v1/login` plus the `accessToken`
//      value in localStorage and the cookie the edge middleware reads), and
//      NextAuth resolves its own callback against NEXTAUTH_URL — configured to
//      the API origin — which would strand a JWT-only user on `<backend>/login`.
//
// The app's NextAuth/Google path is unreachable today: the Google buttons in
// both `login/page.tsx` and `register/page.tsx` are commented out and `signIn`
// is never imported anywhere. This helper therefore stays JWT-only and does not
// touch NextAuth at all. A `document.cookie` name check cannot be trusted as an
// OAuth indicator (HttpOnly session cookies are invisible to it), so that
// heuristic is deliberately not used. If OAuth is ever enabled, its session
// teardown must be implemented and verified separately; see T13 in
// tests/logout-redirect.test.mjs, which fails the moment a Google sign-in path
// becomes reachable.
import { clearAuth } from "@/app/helpers/jwt";

// Single, origin-independent destination for every role.
export const LOGIN_PATH = "/login";

export const logout = async (): Promise<void> => {
  // Nothing to clear (and no navigation to perform) outside the browser.
  if (typeof window === "undefined") return;

  // 1. Remove the backend JWT from both stores the app reads: localStorage for
  //    the client helpers, the `accessToken` cookie for the edge middleware.
  clearAuth();

  // 2. Preserve the previous behaviour of wiping the remaining client state
  //    (adminName/adminEmail caches, cached TRF drafts in sessionStorage) so a
  //    shared device leaves no residue behind. Storage can be unavailable in
  //    private mode; the token is already gone at this point either way.
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* ignore unavailable storage */
  }

  // 3. Same-origin navigation to the frontend login page. Never the backend.
  window.location.replace(LOGIN_PATH);
};
