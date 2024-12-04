"use server";
export const blockUserStatus = async (userId: string, newStatus: string) => {
  const response = await fetch(
    `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/status/${userId}`,
    { method: "PUT", body: JSON.stringify({ status: newStatus }) }
  );
  return response.json();
};

