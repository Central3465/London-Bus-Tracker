import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContexts";
import React, { useEffect } from "react";

const SuccessPage = () => {
  const navigate = useNavigate();
  const { updateSubscription } = useUser();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  useEffect(() => {
    const verifyAndRedirect = async () => {
      if (!sessionId) return;

      try {
        // ✅ Verify payment with backend
        const res = await fetch(`http://${import.meta.env.VITE_API_BASE}/api/verify?session_id=${sessionId}`);
        const data = await res.json();

        if (data.success) {
          console.log("✅ Payment verified — updating subscription");
          await updateSubscription();
        } else {
          console.warn("⚠️ Payment not yet verified");
        }
      } catch (err) {
        console.error("Error verifying session:", err);
      }

      // Redirect after a short delay
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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Payment Successful!</h2>
        <p className="text-gray-600 mt-2">Redirecting to your premium features...</p>
      </div>
    </div>
  );
};

export default SuccessPage;
