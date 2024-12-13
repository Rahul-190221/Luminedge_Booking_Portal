"use client";

import Image from "next/image";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { registerUser } from "../utils/actions/registerUser";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import britishLogo from '@/assets/british-logos.webp'; // Adjust path based on your folder structure
import { useState } from "react";
import { signIn } from "next-auth/react";
export type UserData = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  passportNumber: string;
  email: string;
  transactionId: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
};
export type formatData = {
  name: string;
  email: string;
  password: string;
  contactNo: string;
  transactionId: string;
  passportNumber: string;
  mock: number;
  result: Array<any>;
  isDeleted: boolean;
};

const RegisterPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<UserData>();

  const router = useRouter();

  // Watch password to validate confirm password
  const password = watch("password");
  console.log(password);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onSubmit = async (data: UserData) => {
    //console.log("clicked");
    //onsole.log(data);

    try {
      // Reformating data before API call
      const formattedData = {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        password: data.password,
        contactNo: data.phoneNumber,
        transactionId: data.transactionId,
        passportNumber: data.passportNumber,
        mock: 5, // You can adjust this based on actual data
        result: [], // Empty array as per the provided structure
        isDeleted: false, // Default value for isDeleted
      };

      // Add registration logic here (e.g., API call)
      // Assuming you are using a function like `registerUser` to send the data
      const response = await registerUser(formattedData);
      console.log(response);

      // Handle the response
      if (response.message === "User registered successfully") {
        toast.success("Registration successful");
        console.log("Registration successful", response);
        router.push("/waiting");
        // After 3 seconds, redirect to the dashboard
        setTimeout(() => {
          router.push("/login");
        }, 3000); // 3 seconds delay before redirecting to dashboard
        // Redirect user or show success message
      } else {
        toast.error(response.message);
        console.error("Registration failed", response.message);
      }
    } catch (err: any) {
      console.error("Error during registration:", err.message);
      throw new Error(err.message);
    }
  };

  return (
    // need to responsive
    <div className="my-10 px-4 md:px-8 lg:px-10 ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="hidden lg:block w-full lg:w-[80%] h-[70%] m-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 609.58 304.79"
            width="130"
            height="75"
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
          <h1 className=" font-bold text-5xl py-3">
            Welcome to <br /> Luminedge.
          </h1>
          <p className="text-sm">
                The most premium exam venue awarded by 
                <Image
                  src={britishLogo} // Use the imported image here
                  alt="British Logo"
                  className="inline-block ml-2 h-10 w-auto" // Increased height to 10
                />
                </p>
          <p className="text-sm mt-10 lg:mt-40 ">
            If you have already an account <br className="hidden lg:block" />
            you can{" "}
            <Link className="text-[#ffd23c] font-bold px-2" href="/login">
              Sign in here
            </Link>
          </p>
        </div>

        <div className="card shadow-lg card-body w-full lg:w-[80%] mx-auto">
          {/* Show logo on mobile */}
          <div className="lg:hidden  mb-6  px-3 ">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 609.58 304.79"
              width="130"
              height="75"
              className="drop-shadow-lg"
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
            <h1 className="font-bold text-2xl pt-3 pb-1  ">
              Welcome to{" "}
              <span className="text-amber-400 font-bold">Luminedge</span>
            </h1>
            <p className="text-sm">
                The most premium exam venue awarded by 
                <Image
                  src={britishLogo} // Use the imported image here
                  alt="British Logo"
                  className="inline-block ml-2 h-10 w-auto" // Increased height to 10
                />
                </p>
          </div>
          <h1 className="text-2xl md:text-3xl text-amber-500 font-bold mt-4">
  Sign Up
</h1>
<form
  onSubmit={handleSubmit(onSubmit)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();  // Prevent default Enter key behavior (form reset or submitting multiple times)
      const form = (e.target as HTMLElement).closest("form");  // Cast to HTMLElement and use closest method
      form?.requestSubmit();  // Programmatically trigger form submission
    }
  }}
  className="w-full max-w-4xl mx-auto"
>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mt-4 mb-3">
    {/* First Name */}
    <div className="form-control my-1">
      <label className="label">
        <span className="label-text text-gray-600 ml-2 font-semibold whitespace-nowrap text-sm sm:text-base">
          First Name*
        </span>
      </label>
      <input
        type="text"
        {...register("firstName", {
          required: "First name is required",
        })}
        placeholder="(As per Passport/NID)"
        className="input bg-gray-50 h-[40px] w-full text-sm sm:text-base"
      />
      {errors.firstName && (
        <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
      )}
    </div>

    {/* Last Name */}
    <div className="form-control my-1">
      <label className="label">
        <span className="label-text text-gray-600 ml-2 font-semibold whitespace-nowrap text-sm sm:text-base">
          Last Name*
        </span>
      </label>
      <input
        type="text"
        {...register("lastName", {
          required: "Last name is required",
        })}
        placeholder="(As per Passport/NID)"
        className="input bg-gray-50 h-[40px] w-full text-sm sm:text-base"
      />
      {errors.lastName && (
        <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
      )}
    </div>
  </div>

  {/* Phone Number */}
  <div className="form-control my-1">
    <label className="label">
      <span className="label-text text-gray-600 ml-2 font-semibold text-sm sm:text-base">
        Phone Number*
      </span>
    </label>
    <input
      type="tel"
      {...register("phoneNumber", {
        required: "Phone number is required",
      })}
      placeholder="01400403474"
      className="input bg-gray-50 h-[40px] w-full text-sm sm:text-base"
    />
    {errors.phoneNumber && (
      <p className="text-red-500 text-sm">{errors.phoneNumber.message}</p>
    )}
  </div>

  {/* Passport Number */}
  <div className="form-control my-1">
    <label className="label">
      <span className="label-text text-gray-600 ml-2 font-semibold text-sm sm:text-base">
        Passport / NID Number*
      </span>
    </label>
    <input
      type="text"
      {...register("passportNumber", {
        required: "Passport number is required",
      })}
      placeholder="Must be valid"
      className="input bg-gray-50 h-[40px] w-full text-sm sm:text-base"
    />
    {errors.passportNumber && (
      <p className="text-red-500 text-sm">{errors.passportNumber.message}</p>
    )}
  </div>
{/* Money Receipt Number */}
<div className="form-control my-1">
    <label className="label">
      <span className="label-text text-gray-600 ml-2 font-semibold text-sm sm:text-base">
        Money Receipt Number*
      </span>
    </label>
    <input
      type="text"
      {...register("transactionId", {
        required: "Transaction ID is required",
      })}
      placeholder=""
      className="input bg-gray-100 h-[40px] w-full text-sm sm:text-base"
    />
    {errors.transactionId && (
      <p className="text-red-500 text-sm">{errors.transactionId.message}</p>
    )}
  </div>
  {/* Email */}
  <div className="form-control my-1">
    <label className="label">
      <span className="label-text text-gray-600 ml-2 font-semibold text-sm sm:text-base">
        Email*
      </span>
    </label>
    <input
      type="email"
      {...register("email", { required: "Email is required" })}
      placeholder=""
      className="input bg-gray-100 h-[40px] w-full text-sm sm:text-base"
    />
    {errors.email && (
      <p className="text-red-500 text-sm">{errors.email.message}</p>
    )}
  </div>

  

  <div className="grid md:grid-cols-2 gap-4">
    {/* Password Field */}
    <div className="form-control my-1">
      <label className="label">
        <span className="label-text text-gray-600 ml-2 font-semibold text-sm sm:text-base">
          Password*
        </span>
      </label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          })}
          className="input bg-gray-50 h-[40px] w-full text-sm sm:text-base"
          placeholder=""
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? (
            <FaEyeSlash className="w-5 h-5 text-gray-600" />
          ) : (
            <FaEye className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>
      {errors.password && (
        <p className="text-red-500 text-sm">{errors.password.message}</p>
      )}
    </div>

    {/* Confirm Password Field */}
    <div className="form-control my-1">
      <label className="label">
        <span className="label-text text-gray-600 ml-2 font-semibold text-sm sm:text-base">
          Confirm Password*
        </span>
      </label>
      <div className="relative">
        <input
          type={showConfirmPassword ? "text" : "password"}
          {...register("confirmPassword", {
            required: "Confirm Password is required",
            validate: (value) =>
              value === password || "Passwords do not match",
          })}
          className="input bg-gray-50 h-[40px] w-full text-sm sm:text-base"
          placeholder=""
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2"
          onClick={() => setShowConfirmPassword((prev) => !prev)}
        >
          {showConfirmPassword ? (
            <FaEyeSlash className="w-5 h-5 text-gray-600" />
          ) : (
            <FaEye className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>
      {errors.confirmPassword && (
        <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>
      )}
    </div>
  </div>

  {/* Agree to Terms */}
  <div className="form-control mb-6">
    <label className="cursor-pointer flex items-center">
      <input
        type="checkbox"
        {...register("terms", {
          required: "You must agree to the terms",
        })}
        className="checkbox checkbox-warning mr-2"
      />
      <span className="label-text ml-2 text-sm sm:text-base">
        I agree to all{" "}
        <span className="text-[#FACE39] font-semibold">
          <Link href="/terms-and-conditions">
            terms and conditions
          </Link>
        </span>
      </span>
    </label>
    {errors.terms && (
      <p className="text-red-500 text-sm">{errors.terms.message}</p>
    )}
  </div>

  {/* Sign Up Button */}
  <div className="form-control my-6">
    <button type="submit" className="btn bg-[#FACE39] w-full sm:w-auto">
      Sign Up
    </button>
  </div>
</form>

          {/* Google Sign Up */}
          {/* <div
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="border-2 border-[#FACE39] rounded-xl py-3 my-6 mx-auto w-full flex justify-center mb-10 mt-2"
          >
            <FcGoogle className="text-2xl mr-2" />
            <span className="font-semibold">Sign up with Google</span>
          </div> */}
          {/* Add this sign in message for all screen sizes */}
          <div className="text-center mt-6 text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#FACE39] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
