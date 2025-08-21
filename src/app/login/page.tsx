"use client";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { loginUser } from "../utils/actions/loginUser";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { getUserIdFromToken } from "../helpers/jwt";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

export type FormValues = {
  email: string;
  password: string;
};
const britishLogo = '/assets/british-logos.svg';
const LoginPage = () => {
  const [user, setUser] = useState<any>(null); // Store user details here
  const [, setIsLoading] = useState<boolean>(false); // To manage loading state
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: {},
  } = useForm<FormValues>();
  const router = useRouter();

  // Check user role on initial load if already logged in
  useEffect(() => {
    const checkUserRole = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const userData = getUserIdFromToken(); // Get user details from token
        console.log(userData);
      }
    };

    checkUserRole();
  }, []);

  // Redirect based on the user's role if logged in
  useEffect(() => {
    if (user) {
      setTimeout(() => {
        if (user.role === "admin") {
          router.push("/admin/dashboard");
        }  
        else if (user.role === "bdm") {
          router.push("/bdm/dashboard");
        }
        else if (user.role === "user") {
          router.push("/dashboard");
        }
        else if (user.role === "teacher") {
          router.push("teacher/dashboard");
        }

      }, 500); // Delay to ensure state update
    }
  }, [user]);

  async function onSubmit(data: FormValues) {
    setIsLoading(true); // Set loading state while logging in
    try {
      const response = await loginUser(data); // loginUser should return accessToken

      if (response.accessToken) {
        toast.success("Successfully logged in");
        Cookies.set("accessToken", response.accessToken, { expires: 10 }); // Expires in 10 days
        localStorage.setItem("accessToken", response.accessToken);

        const userData = getUserIdFromToken(); // Get user details from token
        setUser(userData); // Store the user details in the state
      } else {
        toast.error("Invalid email or password");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("An error occurred while logging in");
    } finally {
      setIsLoading(false); // Reset loading state
    }
  }

  return (
   <div className="my-4 px-2 md:px-4 lg:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="hidden lg:block w-full lg:w-[80%] h-[70%] m-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 609.58 304.79"
            width="150"
            height="100"
          >
            <defs>
              <style>{`.cls-1 { fill: #00000f; stroke-width: 0px; }`}</style>
            </defs>
            <g id="Layer_1-2" data-name="Layer 1">
              <g id="SvgjsG1033">
                <path
                  className="cls-1"
                  d="M95.25,38.17c31.55,0,57.15,25.71,57.15,57.3,0,18.05-8.22,34.64-22.62,45.47-21.49,16.26-30.17,34.23-33.17,49.34h-2.72c-2.98-15.11-11.68-33.08-33.19-49.34-14.36-10.83-22.62-27.42-22.62-45.47,0-31.59,25.64-57.3,57.17-57.3M95.25,0C42.64,0,0,42.75,0,95.47c0,31.25,14.72,58.56,37.8,75.98,10.62,8.04,19.38,18.38,19.38,32.67v24.33h76.16v-24.33c0-14.29,8.74-24.63,19.35-32.67,23.1-17.41,37.8-44.72,37.8-75.98C190.49,42.75,147.86,0,95.25,0h0Z"
                  width={50} // Add appropriate width
                  height={50} // Add appropriate height
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
          <h1 className=" font-bold text-5xl py-2 lg:py-6 text-[#00000f]">
            Welcome to <br /> Luminedge.
          </h1>
          <div className="text-lg mt-4 lg:mt-3 text-xl lg:text-2xl text-[#00000f]">
          The most premium exam venue awarded by <br /> 
          <span className="block h-2"></span> {/* Add this line to create space */}
          <Image
            src={britishLogo} // Use the imported image here
            width={90} // Add width property
            height={35} // Add height property
            className="inline-block ml-0 h-10 w-auto" // Increased height to 10
            alt={""}
          />
        </div>
        <p className="text-lg mt-4 lg:mt-20 text-[#00000f]">
            If you don&apos;t have an account <br />
            you can{" "}
            <Link className="text-[#FACE39] font-bold px-2" href="/register">
              Sign up here
            </Link>
          </p>
        </div>

        <div
        className="card card-body w-full lg:w-[80%] mx-auto mt-20 lg:mt-32 px-4 py-6 rounded-xl"
        style={{
          boxShadow: "0px 10px 30px rgba(250, 206, 57, 0.35)" // yellow glow
        }}
      >

          <form onSubmit={handleSubmit(onSubmit)} className="">
            {/* Show logo on mobile */}
            <div className="lg:hidden  mb-6  pb-4  ">
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
              <p className="text-sm text-[#00000f]">
                The most premium exam venue awarded by <br />
                <Image
              src={britishLogo} // Use the imported image here
              width={90} // Add width property
              height={35} // Add height property
              className="inline-block ml-0 h-10 w-auto" // Increased height to 10
              alt={""}             />
                </p>
            </div>
            
  <h1 className="text-2xl md:text-3xl font-bold mt-8">Sign in</h1>

{/* Email */}
<div className="form-control">
  <label className="label">
    <span className="label-text font-bold ml-0">Email*</span>
  </label>
  <input
    type="email"
    {...register("email")}
    placeholder="enter your email"
    className="input input-bordered border-[#FACE39] w-full"
    required
  />
</div>

{/* Password */}
<div className="form-control">
  <label className="label">
    <span className="label-text font-bold ml-0">Password*</span>
  </label>
  <div className="relative">
    <input
      {...register("password")}
      type={showPassword ? "text" : "password"}
      placeholder="********"
      className="input input-bordered border-[#FACE39] w-full pr-10"
      required
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? <FaEyeSlash /> : <FaEye />}
    </button>
  </div>
</div>

<Link href="/forget-password">
  <p className="text-xs text-end text-[#00000f] mt-2">Forgot password?</p>
</Link>

{/* Sign in button */}
<div className="form-control mt-8 lg:mt-12">
  <button type="submit" className="btn bg-[#FACE39] w-full">
    Sign in
  </button>
</div>
</form>
          {/* <p className="text-center">OR </p>
          <div className="border-2 border-[#FACE39] rounded-xl py-2 my-4 lg:my-6 mx-auto w-full flex justify-center">
            <span
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className=" font-bold flex items-center gap-2 text-sm md:text-base"
            >
              <FcGoogle /> Sign in with Google
            </span>
          </div> */}
          <p className="text-center text-sm md:text-base mt-4">
            Don&apos;t have an account?{" "}
            <Link className="text-[#FACE39] font-bold" href="/register">
              Sign up now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
