"use client";

import Link from "next/link";
import {
  IoBagRemoveOutline,
  IoWalletOutline,
  IoCloudDownloadOutline,
  IoLogOutOutline,
} from "react-icons/io5";
import { TbMoneybag, TbReport, TbBell } from "react-icons/tb";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { usePathname } from "next/navigation";
import { logout } from "@/app/utils/actions/logout";
import GetMe from "@/app/helpers/getme";
import { RxAvatar } from "react-icons/rx";
import { FaArrowDown } from "react-icons/fa";
import { IoMailOutline, IoSettingsOutline, IoHomeOutline } from "react-icons/io5"; // Import the icons
import { AiOutlineHome } from "react-icons/ai"; // Import Home icon
import { RiHomeOfficeFill } from "react-icons/ri"; // Importing the correct icon



const SidebarAdmin = () => {
  const [isOpen, setIsOpen] = useState(false); // State for mobile toggle
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="flex">
      {/* Toggle button for mobile view */}
      <button onClick={toggleSidebar} className="p-2 md:hidden z-50">
        {isOpen ? (
          <FaTimes className="h-6 w-6" />
        ) : (
          <div className="flex border-r border-gray-200 gap-4 items-center">
            <FaBars className="h-6 w-6" />
          </div>
        )}
      </button>

 {/* Sidebar container */}
 <div
        className={`fixed top-0 left-0 h-full w-64 bg-white md:bg-transparent transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out z-50 md:relative md:flex md:flex-col md:items-start`}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <Link href="/" className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 609.58 304.79"
              width="110"
              height="70"
              className="mr-2"
            >
              <defs>
                <style>{`.cls-1 { fill: #00000f; stroke-width: 0px; }`}</style>
              </defs>
              <g id="Layer_1-2" data-name="Layer 1">
                <g id="SvgjsG1033">
                  <path
                    className="cls-1"
                    d="M95.25,38.17c31.55,0,57.15,25.71,57.15,57.3,0,18.05-8.22,34.64-22.62,45.47-21.49,16.26-30.17,34.23-33.17,49.34h-2.72c-2.98-15.11-11.68-33.08-33.19-49.34-14.36-10.83-22.62-27.42-22.62-45.47,0-31.59,25.64-57.3,57.17-57.3M95.25,0C42.64,0,0,42.75,0,95.47c0,31.25,14.72,58.56,37.8,75.98,10.62,8.04,19.38,18.38,19.38,32.67v24.33h76.16v-24.33c0-14.29,8.74-24.63,19.35-32.67,23.1-17.41,37.8-44.72,37.8-75.98C190.49,42.75,147.86,0,95.25,0h0Z"
                  />
                  <rect
                    className="cls-1"
                    x="57.18"
                    y="266.62"
                    width="76.16"
                    height="38.17"
                  />
                </g>
                <g id="SvgjsG1034">
                  <path
                    className="cls-1"
                    d="M239.3,161.56h16.16v9.46h-26.87v-51.56h10.7v42.11h0ZM286.58,134.33h10.28v36.68h-9.74l-.25-4.42c-2.57,3.25-6.64,5.14-11.67,5.14-8.81,0-13.67-4.6-13.67-12.7v-24.69h10.31v22.48c0,4.85,3.03,6.64,6.6,6.64,4.25,0,8.1-2.14,8.14-8.89v-20.23h0ZM350.95,133.62c7.85,0,12.92,4,12.92,11.53v25.87h-10.28v-22.95c0-4.32-2.71-6.21-5.78-6.21-3.68,0-6.92,2.11-6.92,8.46v20.7h-10.38v-22.84c0-4.39-2.64-6.32-5.89-6.32-3.57,0-6.89,2.11-6.89,8.99v20.16h-10.24v-36.68h10.24v4.32c2.43-3.25,6.14-5.03,10.63-5.03,5.32,0,9.31,1.93,11.24,5.5,2.57-3.68,6.49-5.5,11.35-5.5h0ZM379.1,128.83c-3.25,0-5.96-2.64-5.96-5.92s2.71-5.89,5.96-5.89,5.89,2.64,5.89,5.89-2.71,5.92-5.89,5.92ZM373.86,171.01v-36.68h10.35v36.68h-10.35ZM416.5,133.62c8.81,0,13.67,4.57,13.67,12.7v24.69h-10.31v-22.48c0-4.89-3.03-6.67-6.57-6.67-4.25,0-8.1,2.14-8.17,8.92v20.23h-10.28v-36.68h10.28v4.07c2.57-3.03,6.53-4.78,11.38-4.78h0ZM474.63,152.14l-.11,2.46h-27.19c.43,6.1,4.5,9.03,9.38,9.03,3.68,0,6.53-1.71,7.92-4.96l9.42,1.39c-2.43,7.42-9.03,11.67-17.27,11.67-11.85,0-19.59-6.99-19.59-19.06s7.96-19.13,19.27-19.13c10.38,0,18.13,5.74,18.16,18.59h0ZM456.54,140.83c-4.67,0-7.92,2.18-8.92,7.07h16.84c-.54-4.67-3.71-7.07-7.92-7.07h0ZM508.46,116.2h10.28v54.81h-9.74l-.25-4.78c-2.11,3.6-6.53,5.64-11.53,5.64-9.67,0-17.66-7.14-17.66-19.13s8.03-19.13,17.66-19.13c4.82,0,9.06,1.82,11.24,5.14v-22.55h0ZM499.57,163.34c5.46,0,9.71-4.18,9.71-10.6s-4.28-10.63-9.71-10.63-9.74,4.03-9.74,10.63,4.28,10.6,9.74,10.6ZM554.63,134.33h9.78v33.93c0,14.27-7.74,20.05-19.45,20.05-10.53,0-16.24-4.42-18.91-11.38l8.53-3.64c2.07,4.75,5.07,7.03,9.99,7.03,6.49,0,9.53-4.07,9.53-11.31v-4.28c-2.14,2.93-6.35,5-11.13,5-9.1,0-16.74-7.17-16.74-18.13s7.67-17.98,16.81-17.98c5.14,0,9.35,2.28,11.35,5.57l.25-4.85ZM545.6,161.41c5.35,0,9.49-4.35,9.49-9.81s-4.07-9.85-9.49-9.85-9.46,4.18-9.46,9.85,4.14,9.81,9.46,9.81ZM609.58,152.14l-.11,2.46h-27.19c.43,6.1,4.5,9.03,9.38,9.03,3.68,0,6.53-1.71,7.92-4.96l9.42,1.39c-2.43,7.42-9.03,11.67-17.27,11.67-11.85,0-19.59-6.99-19.59-19.06s7.96-19.13,19.27-19.13c10.38,0,18.13,5.74,18.16,18.59h0ZM591.49,140.83c-4.67,0-7.92,2.18-8.92,7.07h16.84c-.54-4.67-3.71-7.07-7.92-7.07h0Z"
                  />
                </g>
              </g>
            </svg>
          </Link>
          <button onClick={toggleSidebar} className="p-2 md:hidden">
            <FaTimes className="h-8 w-8" />
          </button>
        </div>
        <ul className="menu min-h-screen rounded-box">
          <li
            className={`hover:bg-[#FACE39] hover:text-black flex justify-center rounded-full ${
              pathname === "/admin/dashboard"
                ? "bg-[#FACE39] text-black font-bold rounded-full"
                : ""
            }`}
          >
            <Link href="/admin/dashboard" className="flex items-center px-4 py-3">
              <IoHomeOutline className="h-5 w-5 mr-2" />
              <span className="inline">Dashboard</span>
            </Link>
          </li>
          <li className="hover:bg-[#FACE39] hover:text-black flex justify-center">
            <Link
              href="/admin/create-schedule"
              className={`flex items-center px-4 py-3 ${
                pathname === "/admin/create-schedule"
                  ? "bg-[#FACE39] text-black font-bold rounded-full"
                  : ""
              }`}
            >
              <IoBagRemoveOutline className="h-5 w-5 mr-2" />
              <span className="inline">Create Schedule</span>
            </Link>
          </li>

          <li
            className={`hover:bg-[#FACE39] hover:text-black flex justify-center ${
              pathname === "/admin/available-schedules"
                ? "bg-[#FACE39] text-black font-bold rounded-full"
                : ""
            }`}
          >
            <Link
              href="/admin/available-schedules"
              className="flex items-center px-4 py-3"
            >
              <IoCloudDownloadOutline className="h-5 w-5 mr-2" />
              <span className="inline">Available Schedules</span>
            </Link>
          </li>

{/* Home Based Booking */}
<li className={`flex justify-center transition-all duration-200 
  ${pathname === "/admin/homebased" ? "bg-[#FACE39] text-black font-bold rounded-full"
                  : ""
              }`}>
  <Link href="/admin/homebased" className="flex items-center px-4 py-3">
    <RiHomeOfficeFill className="h-5 w-5 mr-2" /> {/* Replaced the icon here */}
    <span className="inline">Home Based Booking</span>
  </Link>
</li>
        <li
            className={`hover:bg-[#FACE39] hover:text-black flex justify-center ${
              pathname === "/admin/all-users"
                ? "bg-[#FACE39] text-black font-bold rounded-full"
                : ""
            }`}
          >
            <Link href="/admin/all-users" className="flex items-center px-4 py-3">
              <IoWalletOutline className="h-5 w-5 mr-2" />
              <span className="inline">All Users</span>
            </Link>
          </li>
            {/* Email Menu Item
    <li
      className={`hover:bg-[#FACE39] hover:text-black flex justify-center ${
        pathname === ""
          ? "bg-[#FACE39] text-black font-bold rounded-full"
          : ""
      }`}
    >
      <Link href="" className="flex items-center px-4 py-3">
        <IoMailOutline className="h-5 w-5 mr-2" />
        <span className="inline">Email</span>
      </Link>
    </li> */}
    
    {/* Settings Menu Item */}
    {/* <li
      className={`hover:bg-[#FACE39] hover:text-black flex justify-center ${
        pathname === "/admin/settings"
          ? "bg-[#FACE39] text-black font-bold rounded-full"
          : ""
      }`}
    >
      <Link href="/admin/settings" className="flex items-center px-4 py-3">
        <IoSettingsOutline className="h-5 w-5 mr-2" />
        <span className="inline">Setting</span>
      </Link>
    </li> */}
          {/* <li
            className={`hover:bg-[#FACE39] hover:text-black flex justify-center ${
              pathname === "/admin/notifications"
                ? "bg-[#FACE39] text-black font-bold rounded-full"
                : ""
            }`}
          >
            <Link
              href="/admin/notifications"
              className="flex items-center px-4 py-3"
            >
              <TbBell className="h-5 w-5 mr-2" />
              <span className="inline">Notifications</span>
            </Link>
          </li> */}
         
           {/* Settings Menu Item */}
    {/* <li
      className={`hover:bg-[#FACE39] hover:text-black flex justify-center ${
        pathname === "/admin/settings"
          ? "bg-[#FACE39] text-black font-bold rounded-full"
          : ""
      }`}
    >
      <Link href="" className="flex items-center px-4 py-3">
        <IoSettingsOutline className="h-5 w-5 mr-2" />
        <span className="inline">Setting</span>
      </Link>
    </li> */}

{/* <li className={`hover:bg-[#FACE39] hover:text-black flex justify-center ${pathname === "/admin/analysis" ? "bg-[#FACE39] text-black font-bold rounded-full" : ""}`}>
  <Link href="/admin/analysis" className="flex items-center px-4 py-3">
    <TbReport className="h-5 w-5 mr-2" />
    <span className="inline">Analysis</span>
  </Link>
</li> */}
    <li className="hover:bg-[#FACE39] hover:text-black flex justify-center">
            <button
              onClick={() => logout()}
              className="flex items-center px-4 py-3"
            >
              <IoLogOutOutline className="h-5 w-5 mr-2" />
              <span className="inline">Logout</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SidebarAdmin;
