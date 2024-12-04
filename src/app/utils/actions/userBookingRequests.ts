export const userBookingRequests = async (userId: string) => {
  const response = await fetch(
    `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/booking-requests/${userId}`
  );
  return response.json();
};
