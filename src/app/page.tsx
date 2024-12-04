"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const HomePage = () => {
  const router = useRouter();

  useEffect(() => {
    router.push("/login"); // Automatically redirects to the sign-in page
  }, [router]);

  return null;
};

export default HomePage;
