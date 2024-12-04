import axios from "axios";
import { getUserIdFromToken } from "./jwt";
import { useEffect, useState } from "react";

const GetMe = () => {
    const [userId, setUserId] = useState<string | null>(null);
    const [userData, setUserData] = useState<any>(null);
  
    useEffect(() => {
      const fetchData = async () => {
        try {
          const userIdFromToken = await getUserIdFromToken();
          console.log(userIdFromToken);
          if (userIdFromToken) {
            setUserId(userIdFromToken.userId);
            const response = await axios.get(
              `https://luminedge-mock-test-booking-server.vercel.app/api/v1/user/${userIdFromToken.userId}`
            );
            setUserData(response.data);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          setUserData(null);
        }
      };
  
      fetchData();
    }, []);
  
    console.log(userData);
  
   
    
    return userData?.user;
};

export default GetMe;
