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
  Mail,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useUser } from "../contexts/UserContexts";

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
  const { subscription, updateSubscription } = useUser();
  const [selectedTier, setSelectedTier] = useState(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePurchase = async () => {
    setError("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, plan: selectedTier.label }),
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

  // ✅ Check if subscription is active AND has days remaining
  const hasActiveSubscription =
    subscription?.isActive && (subscription.daysRemaining || 0) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white mb-4">
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

        {/* ✅ Subscription Status Banner — Always shown if active */}
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

        {/* Features — Always shown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {premiumFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
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

        {/* ✅ Conditional Rendering: Show purchase UI ONLY if no active subscription */}
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
                    setEmail("");
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

                {/* Email Input */}
                <div className="max-w-md mx-auto space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="max-w-md mx-auto flex items-center text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {error}
                  </div>
                )}

                {/* Subscribe Button */}
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
              </div>
            ) : (
              <p className="text-center text-gray-500">
                Select a plan to continue
              </p>
            )}

            <p className="text-center text-xs text-gray-500 mt-6">
              Subscriptions renew automatically unless cancelled. Manage or cancel
              anytime in your account settings.
            </p>
          </div>
        ) : (
          // ✅ Optional: Show a "Thank You" message when subscribed
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