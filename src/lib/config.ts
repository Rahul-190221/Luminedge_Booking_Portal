/**
 * Authoritative frontend API origin resolver.
 * Ensures the API base URL is explicitly configured, fail-closed against silent
 * fallback to unintended backends, and strictly validated.
 */

function resolveApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;

  const isHostedProduction =
    Boolean(process.env.NETLIFY || process.env.VERCEL) ||
    (process.env.NODE_ENV === "production" && !raw);

  if (!raw || !raw.trim()) {
    if (isHostedProduction) {
      throw new Error(
        "Missing required environment variable: NEXT_PUBLIC_API_BASE_URL. A valid HTTPS API origin must be configured for production deployment."
      );
    }
    // Local development fallback only when unconfigured in local dev/test
    return "http://localhost:5000";
  }

  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      `Invalid NEXT_PUBLIC_API_BASE_URL: "${trimmed}" is not a valid URL.`
    );
  }

  // Reject embedded credentials
  if (parsed.username || parsed.password) {
    throw new Error(
      "Invalid NEXT_PUBLIC_API_BASE_URL: Embedded credentials (username/password) are not permitted."
    );
  }

  // Reject unexpected path, query strings, and fragments
  if ((parsed.pathname && parsed.pathname !== "/") || parsed.search || parsed.hash) {
    throw new Error(
      "Invalid NEXT_PUBLIC_API_BASE_URL: Must be a pure origin without path, query parameters, or fragment."
    );
  }

  const isLoopback =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "0.0.0.0" ||
    parsed.hostname.endsWith(".local");

  if (Boolean(process.env.NETLIFY || process.env.VERCEL)) {
    if (parsed.protocol !== "https:") {
      throw new Error(
        `Invalid NEXT_PUBLIC_API_BASE_URL for hosted deployment: Must use https://, got "${parsed.protocol}".`
      );
    }
    if (isLoopback) {
      throw new Error(
        "Invalid NEXT_PUBLIC_API_BASE_URL for hosted deployment: Loopback or localhost destinations are not allowed."
      );
    }
  } else {
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(
        `Invalid NEXT_PUBLIC_API_BASE_URL protocol: "${parsed.protocol}". Must be http: or https:.`
      );
    }
  }

  return parsed.origin;
}

export const API_BASE = resolveApiBase();
