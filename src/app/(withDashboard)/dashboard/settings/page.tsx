"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";

type User = {
    transactionid: string;
    createdAt: string;
    fullName: string;
    lastName: string;
    phone: string;
    passportId: string;
    email: string;
    password: string;
    confirmPassword: string;
};

const SettingsPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [formData, setFormData] = useState<User>({
        transactionid: "",
        createdAt: "",
        fullName: "",
        lastName: "",
        phone: "",
        passportId: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                setErrorMessage("");
    
                const response = await axios.get("https://luminedge-server.vercel.app/api/v1/users");
    
                if (response.data && response.data.users) {
                    const sortedUsers = response.data.users.sort(
                        (a: User, b: User) =>
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
    
                    setUsers(sortedUsers);
    
                    if (sortedUsers.length > 0) {
                        setFormData(sortedUsers[0]);
                    }
                } else {
                    throw new Error("Unexpected response structure");
                }
            } catch (error) {
                const err = error as any;
                console.error("Error fetching users:", err.response || err.message);
                if (err.response) {
                    setErrorMessage(
                        `Error: ${err.response.status} - ${err.response.data.message || "Unexpected Error"}`
                    );
                } else {
                    setErrorMessage("Failed to load users data. Please try again.");
                }
            } finally {
                setLoading(false);
            }
        };
    
        fetchUsers();
    }, []);
    
    // Handle form field changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Submit the updated user data
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await axios.put("https://luminedge-server.vercel.app/api/v1/users", formData, {
                headers: { "Content-Type": "application/json" },
            });

            if (response.status !== 200) throw new Error("Failed to update user details");

            setSuccessMessage("User details updated successfully!");
        } catch (error) {
            setErrorMessage("Error updating user details. Please try again.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

            {loading && <p className="text-center text-gray-500">Loading...</p>}
            {errorMessage && <p className="text-center text-red-500">{errorMessage}</p>}
            {successMessage && <p className="text-center text-green-500">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Personal Information</h2>

                    {/* Full Name */}
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                            Full Name
                        </label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            value={formData.fullName || ""}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#FACE39] focus:outline-none"
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                            Last Name
                        </label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={formData.lastName || ""}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#FACE39] focus:outline-none"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone || ""}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#FACE39] focus:outline-none"
                        />
                    </div>

                    {/* Passport ID */}
                    <div>
                        <label htmlFor="passportId" className="block text-sm font-medium text-gray-700">
                            Passport ID
                        </label>
                        <input
                            type="text"
                            id="passportId"
                            name="passportId"
                            value={formData.passportId || ""}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#FACE39] focus:outline-none"
                        />
                    </div>

                    {/* Transaction ID */}
                    <div>
                        <label htmlFor="transactionid" className="block text-sm font-medium text-gray-700">
                            Transaction ID
                        </label>
                        <input
                            type="text"
                            id="transactionid"
                            name="transactionid"
                            value={formData.transactionid || ""}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#FACE39] focus:outline-none"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email || ""}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#FACE39] focus:outline-none"
                        />
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            value={formData.password || ""}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#FACE39] focus:outline-none"
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600"
                            onClick={() => setShowPassword((prev) => !prev)}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>

                    {/* Confirm Password */}
                    <div className="relative">
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword || ""}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#FACE39] focus:outline-none"
                        />
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-[#FACE39] text-black px-6 py-2 rounded-full hover:bg-[#E5B732] transition-colors duration-300"
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsPage;
