"use client";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { loginUser } from "../utils/actions/loginUser";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { getUserIdFromToken } from "../helpers/jwt";
import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import LuminedgeLogo from "@/components/LuminedgeLogo";

export type FormValues = {
  email: string;
  password: string;
};
const britishLogo = '/assets/british-logos.svg';
const LoginPage = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit } = useForm<FormValues>();
  const router = useRouter();

  // Redirect based on the user's role if logged in
  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") router.push("/admin/dashboard");
    else if (user.role === "bdm") router.push("/bdm/dashboard");
    else if (user.role === "user") router.push("/dashboard");
    else if (user.role === "teacher") router.push("/teacher/dashboard");
  }, [user, router]);

  async function onSubmit(data: FormValues) {
    setIsLoading(true); // Set loading state while logging in
    try {
      const response = await loginUser(data); // loginUser should return accessToken

      if (response.accessToken) {
        toast.success("Successfully logged in");
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
   <div className="min-h-screen flex items-center py-10 px-2 md:px-6 lg:px-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 w-full">
        <div className="hidden lg:flex flex-col justify-center login-slide-left w-full lg:w-[85%] ml-auto">
          <LuminedgeLogo width={150} height={100} />
          <h1 className=" font-bold text-5xl py-2 lg:py-6 text-[#00000f]">
            Welcome to <br /> Luminedge.
          </h1>
          <div className="mt-4 lg:mt-3 text-xl lg:text-2xl text-[#00000f]">
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
        className="card card-body w-full lg:w-[85%] mr-auto px-6 py-8 rounded-xl login-slide-right yellow-card-shadow"
      >

          <form onSubmit={handleSubmit(onSubmit)} className="">
            {/* Show logo on mobile */}
            <div className="lg:hidden  mb-6  pb-4  ">
              <LuminedgeLogo width={130} height={75} className="drop-shadow-lg" />
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
  <button
    type="submit"
    disabled={isLoading}
    className="btn bg-[#FACE39] w-full disabled:opacity-70 flex items-center justify-center gap-2"
  >
    {isLoading ? (
      <>
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Signing in…
      </>
    ) : "Sign in"}
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
