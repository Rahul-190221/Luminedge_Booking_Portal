"use client";

import { useEffect } from "react";
import axios from "axios";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    const id = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return () => axios.interceptors.request.eject(id);
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
