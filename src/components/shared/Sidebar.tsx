"use client";

import Link from "next/link";
import {
  IoBagRemoveOutline,
  IoWalletOutline,
  IoCloudDownloadOutline,
  IoLogOutOutline,
} from "react-icons/io5";
import { TbMoneybag, TbReport } from "react-icons/tb";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { usePathname } from "next/navigation";
import { logout } from "@/app/utils/actions/logout";
import GetMe from "@/app/helpers/getme";
import { RxAvatar } from "react-icons/rx";
import { FaArrowDown } from "react-icons/fa";
import { IoMailOutline, IoSettingsOutline } from "react-icons/io5"; // Import the icons

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const user = GetMe();

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
          <Link href="" className="flex items-center">
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
                {/* SVG logo code */}
              </g>
            </svg>
          </Link>
          <button onClick={toggleSidebar} className="p-2 md:hidden">
            <FaTimes className="h-8 w-8" />
          </button>
        </div>
        {/* Sidebar links */}
        <ul className="menu min-h-screen rounded-box px-2">
          {/* Dashboard link */}
          <li
            className={`hover:bg-[#FACE39] hover:text-black rounded-full ${
              pathname === "/dashboard" ? "bg-[#FACE39] text-black font-bold" : ""
            }`}
          >
            <Link href="/dashboard" className="flex items-center px-4 py-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {/* SVG path */}
              </svg>
              <span className="inline">Dashboard</span>
            </Link>
          </li>

          {/* Courses link */}
          <li
            className={`hover:bg-[#FACE39] hover:text-black rounded-full ${
              pathname === "/dashboard/courses" ? "bg-[#FACE39] text-black font-bold" : ""
            }`}
          >
            <Link href="/dashboard/courses" className="flex items-center px-4 py-3">
              <TbReport className="h-5 w-5 mr-2" />
              <span className="inline">Courses</span>
            </Link>
          </li>

          {/* Terms and Conditions link */}
          <li
            className={`hover:bg-[#FACE39] hover:text-black rounded-full ${
              pathname === "/dashboard/terms" ? "bg-[#FACE39] text-black font-bold" : ""
            }`}
          >
            <Link href="/dashboard/terms" className="flex items-center px-4 py-3">
              <IoSettingsOutline className="h-5 w-5 mr-2" />
              <span className="inline">Terms and Conditions</span>
            </Link>
          </li>

          {/* Logout button */}
          <li className="hover:bg-[#FACE39] hover:text-black rounded-full">
            <button onClick={() => logout()} className="flex items-center px-4 py-3 w-full text-left">
              <IoLogOutOutline className="h-5 w-5 mr-2" />
              <span className="inline">Logout</span>
            </button>
          </li>
          {/* <div className="flex items-center gap-2 ml-1 py-2 px-2 transition-colors duration-300 w-full overflow-hidden">
  <RxAvatar className="text-2xl flex-shrink-0" />
  <h1 className="text-lg text-amber-400 font-semibold truncate w-full overflow-hidden">
    {user && user.name}
  </h1>
  <FaArrowDown className="text-lg text-yellow-400 flex-shrink-0" />
</div> */}


        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
