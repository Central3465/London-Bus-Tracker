// src/contexts/UserContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchUserAndSub = async () => {
    const email = localStorage.getItem("userEmail"); // Or from login state
    if (!email) return;

    try {
      const res = await fetch(`http://localhost:5000/api/user/${email}`);
      const data = await res.json();
      setSubscription(data.subscription);
    } catch (e) {
      console.warn("Failed to fetch subscription");
    }
    setLoading(false);
  };

  fetchUserAndSub();
}, []);

  const updateSubscription = (newSub) => {
    setSubscription(newSub);
    localStorage.setItem("lbtSubscription", JSON.stringify(newSub));
  };

  return (
    <UserContext.Provider value={{ user, subscription, loading, updateSubscription }}>
      {children}
    </UserContext.Provider>
  );
};