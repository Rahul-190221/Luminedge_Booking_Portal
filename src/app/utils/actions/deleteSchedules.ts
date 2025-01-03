"use server";

export const deleteSchedule = async (id: string) => {
  const response = await fetch(
    `https://luminedge-server.vercel.app/api/v1/admin/delete-schedule/${id}`,
    { method: "DELETE" }
  );
  return response.json();
};
