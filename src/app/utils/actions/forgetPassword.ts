
export const forgetPassword = async (email: string) => {
  const response = await fetch(
    `https://luminedge-mock-test-booking-server.vercel.app/api/v1/auth/forget-password`,
    {
    
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
    }
  );
  const data = await response.json();
  console.log("forgetPassword", data);
  return data;
};

