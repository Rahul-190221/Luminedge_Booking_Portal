import { signOut } from "next-auth/react";
import Cookies from 'js-cookie';

export const logout = async () => {
  // Clear everything from local storage
  localStorage.clear();

  // Optionally clear cookies using document.cookie or a library like js-cookie
  // Example with js-cookie:

  Cookies.remove('accessToken');

  // Redirect to login using signOut
  await signOut({ callbackUrl: "https://luminedge-booking.netlify.app/login" });
};
