// src/contexts/UserContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";

const UserContext = createContext();

export const useUser = () => {
  return useContext(UserContext);
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  // Check if user is already logged in when component mounts
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedSubscription = localStorage.getItem("subscription");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    if (storedSubscription) {
      setSubscription(JSON.parse(storedSubscription));
    }

    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      setUser(data.user);
      setSubscription(data.subscription || null);

      // Store user and subscription in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.subscription) {
        localStorage.setItem("subscription", JSON.stringify(data.subscription));
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  const signup = async (email, password, name) => {
    try {
      const response = await fetch("http://localhost:5000/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        throw new Error("Signup failed");
      }

      const data = await response.json();
      setUser(data.user);
      setSubscription(data.subscription || null);

      // Store user and subscription in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.subscription) {
        localStorage.setItem("subscription", JSON.stringify(data.subscription));
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setSubscription(null);
    localStorage.removeItem("user");
    localStorage.removeItem("subscription");
  };

  const updateSubscription = async () => {
  if (!user?.email) return; // Need email to fetch

  try {
    const response = await fetch(`http://localhost:5000/api/user/${encodeURIComponent(user.email)}`);
    if (response.ok) {
      const data = await response.json();
      setSubscription(data.subscription);
      // Also update localStorage
      if (data.subscription) {
        localStorage.setItem("subscription", JSON.stringify(data.subscription));
      }
    }
  } catch (err) {
    console.error("Failed to refresh subscription", err);
  }
};

  const value = {
    user,
    subscription,
    isLoading,
    login,
    signup,
    logout,
    updateSubscription,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
