"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FiDownload } from "react-icons/fi";
import { AiOutlineEye } from "react-icons/ai";
import { toast } from "react-hot-toast";
import { User } from "@/components/tableAdmin";
import { fetchAllUsers } from "@/app/utils/actions/fetchAllUsers";
import { blockUserStatus } from "@/app/utils/actions/blockUserStatus";
import TableBDM from "@/components/tableBDM";

const BDMTable = () => {
  return (
    <>
      <TableBDM />
    </>
  );
};

export default BDMTable;
