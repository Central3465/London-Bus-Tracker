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
  useEffect(() => {
    console.log("API Base URL:", import.meta.env.VITE_API_BASE_URL);
  }, []);
  const API_BASE = import.meta.env.VITE_API_BASE_URL; // ✅ Single source of truth

  // Auto-login on app start
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            setSubscription(data.subscription || null);
          } else {
            localStorage.removeItem("token");
          }
        })
        .catch((err) => {
          console.error("Auto-login failed", err);
          localStorage.removeItem("token");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [API_BASE]);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({})); // avoid JSON parse crash

    if (!res.ok) {
      const errorMessage =
        data.error || data.message || `Login failed (${res.status})`;
      const error = new Error(errorMessage);
      error.status = res.status; // attach status for UI logic
      throw error;
    }

    localStorage.setItem("token", data.token);
    setUser(data.user);
    setSubscription(data.subscription || null);
  };

  const signup = async (email, password, name) => {
    const res = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Signup failed");

    localStorage.setItem("token", data.token);
    setUser(data.user);
    setSubscription(data.subscription || null);
    return data;
  };

  const logout = () => {
    setUser(null);
    setSubscription(null);
    localStorage.removeItem("token");
  };

  const updateSubscription = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(
        `${API_BASE}/user/${encodeURIComponent(user.email)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
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
