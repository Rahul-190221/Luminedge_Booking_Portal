/** @type {import('next').NextConfig} */

function validateBuildApiOrigin() {
  const isHosted = Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.HOSTED_BUILD);
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (isHosted) {
    if (!raw || !raw.trim()) {
      throw new Error(
        "Build-time validation error: Missing required NEXT_PUBLIC_API_BASE_URL in hosted production environment."
      );
    }
    let url;
    try {
      url = new URL(raw.trim());
    } catch {
      throw new Error(`Build-time validation error: NEXT_PUBLIC_API_BASE_URL is not a valid URL: "${raw}".`);
    }
    if (url.protocol !== "https:") {
      throw new Error(`Build-time validation error: NEXT_PUBLIC_API_BASE_URL must use https://, got "${url.protocol}".`);
    }
    const isLoopback =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "0.0.0.0" ||
      url.hostname.endsWith(".local");
    if (isLoopback) {
      throw new Error("Build-time validation error: NEXT_PUBLIC_API_BASE_URL cannot use a localhost/loopback destination in hosted builds.");
    }
    if (url.username || url.password) {
      throw new Error("Build-time validation error: NEXT_PUBLIC_API_BASE_URL must not contain embedded credentials.");
    }
    if ((url.pathname && url.pathname !== "/") || url.search || url.hash) {
      throw new Error("Build-time validation error: NEXT_PUBLIC_API_BASE_URL must be a pure origin without path, query or fragment.");
    }
  } else if (raw && raw.trim()) {
    let url;
    try {
      url = new URL(raw.trim());
    } catch {
      throw new Error(`Build-time validation error: NEXT_PUBLIC_API_BASE_URL is not a valid URL: "${raw}".`);
    }
    if (url.username || url.password) {
      throw new Error("Build-time validation error: NEXT_PUBLIC_API_BASE_URL must not contain embedded credentials.");
    }
    if ((url.pathname && url.pathname !== "/") || url.search || url.hash) {
      throw new Error("Build-time validation error: NEXT_PUBLIC_API_BASE_URL must be a pure origin without path, query or fragment.");
    }
  }
}

validateBuildApiOrigin();

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

module.exports = nextConfig;
