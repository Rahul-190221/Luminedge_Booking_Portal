"use client";

import React, { useState } from "react";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";

const ProfileSettings = () => {
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    jobTitle: "",
    phone: "",
    website: "",
    about: "",
    bio: "",
    profileImage: null as string | ArrayBuffer | null,
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (field: string, value: string) => {
    setProfile((prevState) => ({ ...prevState, [field]: value }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prevState) => ({ ...prevState, profileImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setProfile((prevState) => ({ ...prevState, profileImage: null }));
  };

  const handleSave = () => {
    console.log("Profile saved:", profile);
    alert("Profile data saved!");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Profile Settings</h1>
        <p className="text-gray-600 mb-6">Change your personal details.</p>

        {/* Profile Image Section */}
        <div className="flex items-center flex-col mb-6">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {profile.profileImage ? (
              <img
                src={typeof profile.profileImage === "string" ? profile.profileImage : undefined}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-500">No Image</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">Image must be 256×256 - Max 2MB</p>
          <div className="flex space-x-2 mt-4">
            <label
              htmlFor="upload-image"
              className="bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-blue-600"
            >
              Upload image
            </label>
            <input
              id="upload-image"
              type="file"
              className="hidden"
              onChange={handleImageUpload}
              accept="image/*"
            />
            <button
              onClick={handleImageRemove}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              Delete image
            </button>
          </div>
        </div>

        {/* Form Section */}
        <form>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Enter your email"
                className="h-10 w-full border border-gray-300 rounded-md px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={profile.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="Enter your phone number"
                className="h-10 w-full border border-gray-300 rounded-md px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Bio */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={profile.bio || ""}
                onChange={(e) => handleChange("bio", e.target.value)}
                placeholder="Write a short bio about yourself"
                className="w-full h-24 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
          </div>

          {/* Password Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={profile.password || ""}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Enter new password"
                className="h-10 w-full border border-gray-300 rounded-md px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 focus:outline-none"
              >
                {showPassword ? <IoEyeOffOutline size={20} className="mt-5" /> : <IoEyeOutline size={20}  className="mt-5"/>}
              </button>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={profile.confirmPassword || ""}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                placeholder="Confirm your password"
                className="h-10 w-full border border-gray-300 rounded-md px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
                <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-3 top-1/2 transform -translate-y-1/2 flex items-center text-gray-500 focus:outline-none"
                >
                {showConfirmPassword ? <IoEyeOffOutline size={20} className="mt-5" /> : <IoEyeOutline size={20} className="mt-5" />}
                </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="text-right mt-6">
            <button
              type="button"
              onClick={handleSave}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;
