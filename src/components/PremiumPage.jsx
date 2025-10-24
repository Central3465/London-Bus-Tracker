// src/components/PremiumPage.jsx
import React, { useState } from "react";
import {
  Star,
  Bell,
  Map,
  BarChart3,
  Moon,
  Smartphone,
  Lock,
  CreditCard,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  User,
} from "lucide-react";
import { useUser } from "../contexts/UserContexts";
import { Link } from "react-router-dom";
import { getThemeClasses } from "../utils/themes";

const premiumFeatures = [
  {
    icon: <Bell className="w-6 h-6" />,
    title: "Journey Alerts",
    description:
      "Get real-time email or push notifications when your bus is delayed or cancelled.",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Reliability Insights",
    description:
      "See how often your bus runs on time—based on historical TfL data.",
  },
  {
    icon: <Map className="w-6 h-6" />,
    title: "Offline Map Mode",
    description:
      "View bus stops and routes without internet—perfect for tunnels and low-signal areas.",
  },
  {
    icon: <Moon className="w-6 h-6" />,
    title: "Custom Themes",
    description:
      "Choose from dark mode, high-contrast, or minimalist UI skins.",
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: "Ad-Free Experience",
    description:
      "Enjoy a clean, distraction-free interface with no banners or ads.",
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: "Multi-Modal Journeys",
    description:
      "Plan trips using buses, Tube, DLR, walking, and cycling—all in one view.",
  },
];

const pricingPlans = [
  { label: "Monthly", price: "£2.99 / month", interval: "month", days: 30 },
  { label: "Yearly", price: "£24.99 / year", interval: "year", days: 365 },
];

const PremiumPage = () => {
  const { user, subscription, updateSubscription } = useUser();
  const [selectedTier, setSelectedTier] = useState(null);
  const [error, setError] = useState("");
  const [trialCode, setTrialCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { themeClasses } = getThemeClasses();

  const handlePurchase = async () => {
    if (!selectedTier) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email, // 👈 You need to send the user's email!
            plan: selectedTier.label,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error("Invalid response from server.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const handleRedeemTrial = async () => {
    if (!user) {
      setError("You must be signed in to redeem a trial code.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/redeem-trial`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ code: trialCode }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to redeem code");
      }

      // Update local subscription state
      if (updateSubscription) updateSubscription();

      setTrialCode("");
      alert("🎉 Trial activated! Enjoy LBT Plus for free.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActiveSubscription =
    subscription?.isActive && (subscription.daysRemaining || 0) > 0;

  return (
    <div
      className="min-h-screen py-8 px-4 sm:px-6 lg:px-8"
      style={{
        background: `linear-gradient(135deg,
        #ff00cc,   /* hot pink */
        #6a0dad,   /* dark violet */
        #0077ff,   /* bright blue */
        #00cc99,   /* teal */
        #ffcc00,   /* gold */
        #ff6600    /* orange */
      )`,
        backgroundSize: "300% 300%",
        animation: "rainbowShift 8s ease infinite",
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-r from-purple-600 to-indigo-600 text-white mb-4">
            <Star className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            London Bus Tracker <span className="text-indigo-600">Plus</span>
          </h1>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
            {hasActiveSubscription
              ? "Your premium features are unlocked!"
              : "Unlock powerful features to make your commute smarter, smoother, and stress-free."}
          </p>
        </div>

        {/* Subscription Status Banner */}
        {hasActiveSubscription && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-10 max-w-2xl mx-auto text-center animate-in fade-in duration-300">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="flex items-center space-x-2 text-green-700 font-semibold text-lg">
                <CheckCircle className="w-6 h-6" />
                <span>LBT Plus Active</span>
              </div>
              <p className="text-green-600 flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {subscription.daysRemaining} day
                  {subscription.daysRemaining !== 1 ? "s" : ""} remaining
                </span>
              </p>
              <button
                onClick={() => updateSubscription && updateSubscription()}
                className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Refresh status
              </button>
            </div>
          </div>
        )}

        {/* Features — now with consistent premium colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {premiumFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Purchase Section */}
        {!hasActiveSubscription ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
              Choose Your Subscription
            </h2>

            <div className="flex justify-center space-x-4 mb-6">
              {pricingPlans.map((plan) => (
                <button
                  key={plan.label}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    selectedTier?.label === plan.label
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-indigo-50"
                  }`}
                  onClick={() => {
                    setSelectedTier(plan);
                    setError("");
                  }}
                >
                  {plan.label}
                </button>
              ))}
            </div>

            {selectedTier ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">
                    {selectedTier.price}
                  </p>
                </div>

                {user ? (
                  <>
                    {error && (
                      <div className="max-w-md mx-auto flex items-center text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {error}
                      </div>
                    )}
                    <div className="text-center">
                      <button
                        onClick={handlePurchase}
                        disabled={isSubmitting}
                        className={`mt-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                          isSubmitting
                            ? "bg-indigo-400 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-700"
                        } text-white`}
                      >
                        {isSubmitting ? "Redirecting..." : "Subscribe Now"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="text-center">
                      <Link
                        to="/signin"
                        className="inline-flex items-center justify-center w-full px-4 py-2.5 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Sign in to subscribe
                      </Link>
                    </div>
                    <p className="text-center text-sm text-gray-600">
                      Don’t have an account?{" "}
                      <Link
                        to="/signup"
                        className="font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Sign up
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-500">
                Select a plan to continue
              </p>
            )}
            <br></br>
            {/* 🔑 Trial Code Redemption */}
            {!hasActiveSubscription && (
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 max-w-md mx-auto">
                <h3 className="font-medium text-gray-900 text-center mb-3">
                  Have a trial code?
                </h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Enter code (e.g. TRIAL-ABC123)"
                    value={trialCode}
                    onChange={(e) => {
                      setTrialCode(e.target.value.trim().toUpperCase());
                      setError("");
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    disabled={isSubmitting}
                  />
                  <button
                    onClick={handleRedeemTrial}
                    disabled={!trialCode || isSubmitting}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 disabled:opacity-60"
                  >
                    Redeem
                  </button>
                </div>
                {error && (
                  <p className="text-red-600 text-xs mt-2 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {error}
                  </p>
                )}
              </div>
            )}
            <p className="text-center text-xs text-gray-500 mt-6">
              Subscriptions renew automatically unless cancelled. Manage or
              cancel anytime in your account settings.
            </p>
          </div>
        ) : (
          <div className="text-center mb-8">
            <p className="text-gray-600">
              Thank you for supporting London Bus Tracker! 🚌✨
            </p>
          </div>
        )}

        <div className="text-center text-sm text-gray-500">
          <p>
            Core bus tracking remains free. LBT Plus unlocks advanced features.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
