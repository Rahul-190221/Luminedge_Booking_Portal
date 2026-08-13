"use client";

import { useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    const reqId = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Catch expired/invalid sessions mid-flight: clear creds and bounce to login.
    const resId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error?.response?.status === 401 &&
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          localStorage.removeItem("accessToken");
          Cookies.remove("accessToken");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqId);
      axios.interceptors.response.eject(resId);
    };
  }, []);

  return (
    <html lang="en" data-theme="light">
      <head>
        <title>Luminedge Booking Portal</title>
        <meta name="description" content="Your page description here." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Add the favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body suppressHydrationWarning>
        <div className="min-h-screen w-[100%] mx-auto">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
