"use client";
import React, { useState, useEffect } from "react";
import { FaBell, FaUserPlus, FaBookOpen } from "react-icons/fa"; // Importing icons from React Icons

interface Notification {
  id: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  type: "new_user" | "book_request";
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications");
        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }
        const data = await response.json();

        if (data.length > notifications.length) {
          setNotifications(data);
          setHasNewNotification(true);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch notifications"
        );
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 10000);
    return () => clearInterval(intervalId);
  }, [notifications.length]);

  const handleMarkAllAsRead = () => {
    setHasNewNotification(false);
    setNotifications((prevNotifications) =>
      prevNotifications.map((notif) => ({ ...notif, isRead: true }))
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <header className="flex justify-between items-center pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
        <button
          onClick={handleMarkAllAsRead}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Mark All as Read
        </button>
      </header>

      {error && <div className="mt-2 text-red-600">{error}</div>}

      <div className="mt-6 bg-white shadow rounded-lg divide-y divide-gray-100 max-h-[75vh] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start p-4 ${
                !notification.isRead ? "bg-blue-50" : ""
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mr-4">
                {notification.type === "new_user" && (
                  <FaUserPlus className="h-6 w-6 text-green-600" />
                )}
                {notification.type === "book_request" && (
                  <FaBookOpen className="h-6 w-6 text-blue-600" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <p className="text-sm text-gray-800">{notification.message}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {new Date(notification.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
