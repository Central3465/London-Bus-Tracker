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
} from "lucide-react";

const premiumFeatures = [
  {
    icon: <Bell className="w-6 h-6" />,
    title: "Journey Alerts",
    description: "Get real-time email or push notifications when your bus is delayed or cancelled.",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Reliability Insights",
    description: "See how often your bus runs on time—based on historical TfL data.",
  },
  {
    icon: <Map className="w-6 h-6" />,
    title: "Offline Map Mode",
    description: "View bus stops and routes without internet—perfect for tunnels and low-signal areas.",
  },
  {
    icon: <Moon className="w-6 h-6" />,
    title: "Custom Themes",
    description: "Choose from dark mode, high-contrast, or minimalist UI skins.",
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: "Ad-Free Experience",
    description: "Enjoy a clean, distraction-free interface with no banners or ads.",
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: "Multi-Modal Journeys",
    description: "Plan trips using buses, Tube, DLR, walking, and cycling—all in one view.",
  },
];

// Mock subscription status (in real app: from context or API)
const mockSubscription = {
  isActive: true,
  daysRemaining: 45,
};

const pricingTiers = [
  { label: "1 Month", price: "£2.99", days: 30 },
  { label: "3 Months", price: "£7.99", days: 90 },
  { label: "6 Months", price: "£14.99", days: 180 },
  { label: "1 Year", price: "£24.99", days: 365 },
];

const PremiumPage = () => {
  const [selectedTier, setSelectedTier] = useState(null);

  const handlePurchase = (tier) => {
    // Later: integrate payment flow (Stripe, etc.)
    alert(`You selected: ${tier.label} for ${tier.price}. Payment integration coming soon!`);
  };

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
            Unlock powerful features to make your commute smarter, smoother, and stress-free.
          </p>
        </div>

        {/* Subscription Status (if active) */}
        {mockSubscription.isActive && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-10 max-w-md mx-auto text-center">
            <div className="flex items-center justify-center space-x-2 text-green-700 font-medium">
              <CheckCircle className="w-5 h-5" />
              <span>LBT Plus Active</span>
            </div>
            <p className="mt-1 text-green-600">
              <Calendar className="w-4 h-4 inline mr-1" />
              {mockSubscription.daysRemaining} days remaining
            </p>
          </div>
        )}

        {/* Premium Features Grid */}
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
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Tiers */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Choose Your Plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <div
                key={index}
                className={`border rounded-xl p-5 flex flex-col items-center text-center transition-all ${
                  selectedTier?.label === tier.label
                    ? "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-indigo-300"
                }`}
                onClick={() => setSelectedTier(tier)}
              >
                <h3 className="font-bold text-gray-900">{tier.label}</h3>
                <p className="text-2xl font-bold text-indigo-600 mt-2">{tier.price}</p>
                <p className="text-xs text-gray-500 mt-1">({tier.days} days access)</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePurchase(tier);
                  }}
                  className="mt-4 w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-500 mt-6">
            All plans auto-renew unless cancelled. No free trial. You can top up anytime.
          </p>
        </div>

        {/* Footer Note */}
        <div className="text-center text-sm text-gray-500">
          <p>Core bus tracking remains free. LBT Plus unlocks advanced features.</p>
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;