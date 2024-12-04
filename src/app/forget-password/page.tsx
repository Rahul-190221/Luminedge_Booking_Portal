"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { forgetPassword } from "../utils/actions/forgetPassword";
import Link from "next/link";

export type ForgetPasswordFormValues = {
  email: string;
};

const ForgetPasswordPage = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgetPasswordFormValues>();

  const onSubmit = async (data: ForgetPasswordFormValues) => {
    setIsLoading(true);
    try {
      // Implement your forget password logic here
      //console.log("Email submitted:", data.email);
      const response = await forgetPassword(data.email);
      if (response.message === "Password reset link sent successfully") {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("An error occurred while sending the reset link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="card shadow-lg card-body w-full max-w-md mx-auto p-6 bg-white">
        <Link
          href="/"
          className="text-2xl text-[#FACE39] md:text-3xl font-bold mt-6 lg:mt-10 text-center"
        >
          Luminedge
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold  text-center">
          Forget Password
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
          <div className="form-control mb-3">
            <label className="label">
              <span className="label-text font-bold ml-2">Email</span>
            </label>
            <input
              type="email"
              {...register("email", { required: "Email is required" })}
              placeholder="Enter your email"
              className="input input-bordered border-[#FACE39] w-full"
              required
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="form-control mt-4">
            <button
              type="submit"
              className="btn bg-[#FACE39] w-full"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgetPasswordPage;
