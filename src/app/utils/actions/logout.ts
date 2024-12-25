import { signOut } from "next-auth/react";
import Cookies from 'js-cookie';

export const logout = async () => {
  // Clear everything from local storage
  localStorage.clear();

  // Clear cookies using js-cookie
  Cookies.remove('accessToken');

  // Redirect to login on the primary domain
  await signOut({ callbackUrl: "https://luminedge.io/login" });
};
