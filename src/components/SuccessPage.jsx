// src/components/SuccessPage.jsx
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContexts";
import React, { useEffect, useRef } from "react";

const SuccessPage = () => {
  const navigate = useNavigate();
  const { updateSubscription } = useUser();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const hasHandledSession = useRef(false);

  useEffect(() => {
    const verifyAndRedirect = async () => {
      // 🔒 Prevent multiple executions
      if (!sessionId || hasHandledSession.current) return;
      hasHandledSession.current = true;

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/verify-session/${sessionId}`
        );
        const data = await res.json();

        if (data.success) {
          console.log("✅ Payment verified — updating subscription");
          await updateSubscription();
        } else {
          console.warn("⚠️ Payment not yet verified");
        }
      } catch (err) {
        console.error("Error verifying session:", err);
        // Optional: reset the ref if you want to retry on error?
        // hasHandledSession.current = false;
      }

      setTimeout(() => {
        navigate("/plus");
      }, 2000);
    };

    verifyAndRedirect();
  }, [sessionId, updateSubscription, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">
          Payment Successful!
        </h2>
        <p className="text-gray-600 mt-2">
          Redirecting to your premium features...
        </p>
      </div>
    </div>
  );
};

export default SuccessPage;
