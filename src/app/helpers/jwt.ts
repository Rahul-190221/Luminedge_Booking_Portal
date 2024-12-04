// jwt.ts
import { jwtDecode } from "jwt-decode";
import { getFromLocalStorage, removeFromLocalStorage } from "../utils/local-storage";
export const authKey = "accessToken";

interface CustomJwtPayload {
  userId: string;
  role: string;
  [key: string]: any;  // for other potential payload properties
}

export const isLoggedIn = () => {
  const authToken = getFromLocalStorage(authKey);
  if (authToken) {
     return !!authToken;
  }
};

export const removeUser = () => {
  return removeFromLocalStorage(authKey);
};

export const getUserIdFromToken = () => {
  // Ensure that the code runs only on the client side
  if (typeof window === "undefined") {
    return null; // If running server-side, return null (or handle as needed)
  }

  console.log("getUserIdFromToken");

  // Access the localStorage on the client side
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    console.error("No access token found in localStorage.");
    //redirect to login
    window.location.href = "/login";
    return null; // No token found
  }

  // Decode the token with type
  const decoded = jwtDecode<CustomJwtPayload>(accessToken);

  if (decoded && decoded.userId) {
    return decoded;
  } else {
    console.error("userId not found in the token.");
    return null;
  }
};
export const getUserIdOnlyFromToken = () => {
  // Ensure that the code runs only on the client side
  if (typeof window === "undefined") {
    return null; // If running server-side, return null (or handle as needed)
  }

  // Access the localStorage on the client side
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    console.error("No access token found in localStorage.");
    //redirect to login
    window.location.href = "/login";
    return null; // No token found
  }

  // Decode the token with type
  const decoded = jwtDecode<CustomJwtPayload>(accessToken);

  if (decoded && decoded.userId) {
    return decoded.userId;
  } else {
    console.error("userId not found in the token.");
    return null;
  }
};
