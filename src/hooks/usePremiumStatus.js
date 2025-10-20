// hooks/usePremiumStatus.js
import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

export const usePremiumStatus = () => {
  const { user } = useAuth();
  const [premiumStatus, setPremiumStatus] = useState({
    loading: true,
    isActive: false,
    daysRemaining: 0,
  });

  useEffect(() => {
    if (!user) {
      setPremiumStatus({ loading: false, isActive: false, daysRemaining: 0 });
      return;
    }

    const unsub = onSnapshot(
      doc(db, "subscriptions", user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const now = new Date();
          const expiry = data.expiryDate.toDate();
          const isActive = data.status === "active" && expiry > now;
          const daysRemaining = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));

          setPremiumStatus({ loading: false, isActive, daysRemaining });
        } else {
          setPremiumStatus({ loading: false, isActive: false, daysRemaining: 0 });
        }
      },
      (error) => {
        console.error("Subscription listener error:", error);
        setPremiumStatus({ loading: false, isActive: false, daysRemaining: 0 });
      }
    );

    return unsub;
  }, [user]);

  return premiumStatus;
};