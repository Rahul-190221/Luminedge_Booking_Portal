"use server";
export const fetchAllUsers = async () => {
  console.log("Fetching all users");
  console.log(process.env.NEXT_PUBLIC_BACKEND_URL)

  try {
    const response = await fetch(
      `https://luminedge-server.vercel.app/api/v1/user/all`,
      {
        method: "GET",
        cache: "no-store",
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error; // Re-throw the error after logging it
  }
};

