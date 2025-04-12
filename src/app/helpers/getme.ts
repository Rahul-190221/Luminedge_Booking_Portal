// hooks/useUser.ts
import axios from "axios";
import { getUserIdFromToken } from "../helpers/jwt";
import { useEffect, useState } from "react";

// Optional: Define a type for each mock
export type Mock = {
  mockType: string;
  testType: string;
  testSystem: string;
  mock: number;
  transactionId: string;
  mrValidation: string;
  createdAt: string;
};

const useUser = (): {
  user: any;
  mockTypes: string[];
  mocks: Mock[];
} => {
  const [userData, setUserData] = useState<any>(null);
  const [mockTypes, setMockTypes] = useState<string[]>([]);
  const [mocks, setMocks] = useState<Mock[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userIdFromToken = await getUserIdFromToken();

        if (userIdFromToken?.userId) {
          const response = await axios.get(
            `https://luminedge-server.vercel.app/api/v1/user/${userIdFromToken.userId}`
          );

          const fetchedMocks: Mock[] = response.data?.mocks || [];
          const fetchedUser = response.data?.user;

          setMocks(fetchedMocks);
          setMockTypes(fetchedMocks.map((mock) => mock.mockType));
          setUserData(fetchedUser);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchData();
  }, []);

  return { user: userData, mockTypes, mocks };
};

export default useUser;
