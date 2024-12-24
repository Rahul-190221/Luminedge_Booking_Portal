"use client";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { resetPassword } from "../utils/actions/resetPassword";
import { useRouter } from "next/navigation";

export type ResetFormValues = {
  newPassword: string;
  confirmPassword: string;
  userId: string;
  token: string;
};

const ResetPasswordPage = ({
  searchParams,
}: {
  searchParams: { userId: string; token: string };
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>();

  const router = useRouter();

  const onSubmit = async (data: ResetFormValues) => {
    // Handle password reset logic here
    console.log(searchParams);
    data.userId = searchParams.userId;
    data.token = searchParams.token;
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      // Assume resetPassword is a function that handles the password reset
      await resetPassword(data);
      toast.success("Password reset successfully");
      localStorage.removeItem("accessToken");
      router.push("/login");
    } catch (error) {
      console.error("Reset error:", error);
      toast.error("An error occurred while resetting password");
    }
  };

  return (
    <div className="my-8 px-4 md:px-8 lg:px-10">
      <div className="card shadow-lg card-body w-full lg:w-[80%] mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="">
          <h1 className="text-2xl md:text-3xl font-bold mt-6 lg:mt-10">
            Reset Password
          </h1>

          <div className="form-control mt-4 mb-3">
            <label className="label">
              <span className="label-text font-bold ml-2">New Password</span>
            </label>
            <div className="relative">
              <input
                {...register("newPassword", {
                  required: "New password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 6 characters",
                  },
                })}
                type={showPassword ? "text" : "password"}
                placeholder="********"
                className="input w-full input-bordered border-[#FACE39]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.newPassword.message}
                </p>
              )}
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text font-bold ml-2">
                Confirm Password
              </span>
            </label>
            <input
              {...register("confirmPassword", {
                required: "Confirm password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 6 characters",
                },
              })}
              type="password"
              placeholder="********"
              className="input w-full input-bordered border-[#FACE39]"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="form-control mt-4">
            <button type="submit" className="btn bg-[#FACE39]">
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
