import { ResetFormValues } from "@/app/reset-password/page";

export const resetPassword = async (data: ResetFormValues) => {
  console.log("resetPassword", data);
  const response = await fetch(
    `https://luminedge-server.vercel.app/api/v1/auth/reset-password`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      cache: "no-store",
    }
  );
  const responseData = await response.json();
  console.log("resetPassword", responseData);
  return responseData;
};
