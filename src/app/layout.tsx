"use client"; // Add this line to indicate the component is client-side

import { Toaster } from "react-hot-toast";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <title>Luminedge Booking Portal</title>
        <meta name="description" content="Your page description here." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div className="min-h-screen w-[100%] mx-auto">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
