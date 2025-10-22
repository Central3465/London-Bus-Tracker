// src/components/SettingsPage.jsx
import React, { useState, useEffect } from "react";
import {
  Settings,
  Moon,
  Sun,
  Contrast,
  Palette,
  AlertTriangle,
  Lock,
  User,
  CreditCard,
  Shield,
  Star,
  Check,
  Info,
  Ban,
} from "lucide-react";
import { useUser } from "../contexts/UserContexts";
import { useNavigate } from "react-router-dom";

// ======================
// SUB-COMPONENTS
// ======================

const PlusBanner = ({ subscription }) => (
  <div className="mb-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-xl">
    <div className="flex items-center gap-3">
      <Star className="w-6 h-6" />
      <div>
        <h3 className="font-bold">LBT Plus Active</h3>
        <p className="text-purple-100 text-sm">
          {subscription.daysRemaining} day
          {subscription.daysRemaining !== 1 ? "s" : ""} remaining
        </p>
      </div>
    </div>
  </div>
);

const Sidebar = ({
  sidebarItems,
  hasPlus,
  activeSection,
  setActiveSection,
  currentThemeClasses,
  navigate,
}) => (
  <div
    className={`${currentThemeClasses.bg} rounded-xl p-4 w-full md:w-64 h-fit border ${currentThemeClasses.border}`}
  >
    <h2
      className={`font-bold ${currentThemeClasses.text} mb-4 flex items-center gap-2`}
    >
      <Settings className="w-5 h-5" /> Settings
    </h2>
    <nav className="space-y-1">
      {sidebarItems.map((item) => {
        const Icon = item.icon;
        const isLocked = item.plusOnly && !hasPlus;
        return (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
              activeSection === item.id
                ? "bg-indigo-100 text-indigo-700 font-medium"
                : `${currentThemeClasses.textSecondary} hover:${currentThemeClasses.text}`
            } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
            {item.plusOnly && (
              <Lock className="w-3 h-3 ml-auto text-purple-600" />
            )}
          </button>
        );
      })}
    </nav>
  </div>
);

const LockedSection = ({ feature, navigate }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center min-h-[300px]">
    <Lock className="w-12 h-12 text-gray-400 mb-4" />
    <p className="text-gray-600 mb-4">
      Unlock <span className="font-bold">{feature}</span> with LBT Plus
    </p>
    <button
      onClick={() => navigate("/plus")}
      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
    >
      Upgrade to Plus
    </button>
  </div>
);

const AccountSection = ({ currentThemeClasses, user, navigate, onLogout }) => {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found — redirecting to sign in");
        navigate("/signin");
        return;
      }
      const res = await fetch(
        "http://${import.meta.env.VITE_API_BASE}/api/user/update",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ name, email }),
        }
      );

      const data = await res.json();
      localStorage.setItem("token", data.token); // 👈 THIS IS CRITICAL
      if (res.ok) {
        setMessage("✅ Profile updated!");
        setIsEditing(false);
      } else {
        setMessage(`❌ ${data.error || "Update failed"}`);
      }
    } catch (err) {
      setMessage("❌ Network error");
    }
    setTimeout(() => setMessage(""), 3000);
  };

  if (!user) {
    return (
      <div
        className={`${currentThemeClasses.bg} rounded-xl p-6 border ${currentThemeClasses.border} flex flex-col items-center justify-center text-center min-h-[200px]`}
      >
        <User className="w-10 h-10 text-gray-400 mb-3" />
        <p className={`text-lg font-medium ${currentThemeClasses.text} mb-2`}>
          You're not logged in
        </p>
        <p className={`${currentThemeClasses.textSecondary} mb-4 max-w-md`}>
          Please sign in to access your account settings and manage your
          profile.
        </p>
        <button
          onClick={() => navigate("/signin")}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${currentThemeClasses.bg} rounded-xl p-6 border ${currentThemeClasses.border}`}
    >
      <h3 className={`text-lg font-semibold ${currentThemeClasses.text} mb-4`}>
        Account
      </h3>
      {message && (
        <div
          className={`mb-4 p-2 rounded text-sm ${
            message.includes("✅")
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label
            className={`block text-sm ${currentThemeClasses.textSecondary} mb-1`}
          >
            Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded bg-white text-gray-900"
            />
          ) : (
            <p className={currentThemeClasses.text}>{name}</p>
          )}
        </div>
        <div>
          <label
            className={`block text-sm ${currentThemeClasses.textSecondary} mb-1`}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full p-2 border rounded bg-gray-100 text-gray-700 cursor-not-allowed"
          />
        </div>
        <div className="pt-4 flex gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setName(user.name);
                  setEmail(user.email);
                  setIsEditing(false);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Edit Profile
            </button>
          )}
        </div>
        <hr className={`my-6 ${currentThemeClasses.border}`} />
        <button
          onClick={onLogout}
          className={`text-sm text-red-600 hover:text-red-800 font-medium`}
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

const PrivacySection = ({ currentThemeClasses }) => {
  const [message, setMessage] = useState("");

  const handleClearCache = () => {
    localStorage.removeItem("cachedStops");
    localStorage.removeItem("recentJourneys");
    setMessage("✅ Cache cleared");
    setTimeout(() => setMessage(""), 2000);
  };

  const handleExportData = () => {
    const data = {
      cachedStops: JSON.parse(localStorage.getItem("cachedStops") || "[]"),
      recentJourneys: JSON.parse(
        localStorage.getItem("recentJourneys") || "[]"
      ),
      theme: localStorage.getItem("theme") || "light",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lbt-data-export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`${currentThemeClasses.bg} rounded-xl p-6 border ${currentThemeClasses.border}`}
    >
      <h3 className={`text-lg font-semibold ${currentThemeClasses.text} mb-4`}>
        Privacy & Data
      </h3>
      {message && (
        <div className="mb-4 p-2 bg-green-100 text-green-800 rounded text-sm">
          {message}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <h4 className={`font-medium ${currentThemeClasses.text}`}>
            Clear App Cache
          </h4>
          <p className={`text-sm ${currentThemeClasses.textSecondary} mt-1`}>
            Removes saved stops and journey history.
          </p>
          <button
            onClick={handleClearCache}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Clear cached data
          </button>
        </div>
        <div>
          <h4 className={`font-medium ${currentThemeClasses.text}`}>
            Export Your Data
          </h4>
          <p className={`text-sm ${currentThemeClasses.textSecondary} mt-1`}>
            Download a JSON of your local data.
          </p>
          <button
            onClick={handleExportData}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Export data
          </button>
        </div>
        <div>
          <h4 className={`font-medium ${currentThemeClasses.text}`}>
            Delete Account
          </h4>
          <p className={`text-sm ${currentThemeClasses.textSecondary} mt-1`}>
            Permanently delete your account.
          </p>
          <button
            onClick={() => {
              if (window.confirm("⚠️ This cannot be undone. Delete account?")) {
                alert("Delete account API not implemented yet!");
              }
            }}
            className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
};

const AppearanceSection = ({
  hasPlus,
  currentTheme,
  currentThemeClasses,
  selectedTheme,
  onThemeSelect,
  navigate,
  selectedIcon, // 👈
  onIconSelect,
  refreshIcon,
}) => {
  const themes = [
    {
      id: "light",
      name: "Light Mode",
      icon: Sun,
      description: "Clean, bright interface",
      preview: "bg-white text-gray-900",
      accent: "bg-blue-600",
    },
    {
      id: "dark",
      name: "Dark Mode",
      icon: Moon,
      description: "Reduced eye strain",
      preview: "bg-gray-900 text-white",
      accent: "bg-blue-500",
    },
    {
      id: "high-contrast",
      name: "High Contrast",
      icon: Contrast,
      description: "Enhanced visibility",
      preview: "bg-black text-yellow-300",
      accent: "bg-yellow-400",
    },
    {
      id: "minimalist",
      name: "Minimalist",
      icon: Palette,
      description: "Simplified UI",
      preview: "bg-gray-50 text-gray-800 border border-gray-200",
      accent: "bg-gray-700",
    },
  ];

  const customIcons = [
    {
      id: "default",
      name: "Default",
      preview: "/src/assets/Bus.png",
      description: "Your classic blue bus",
    },
    {
      id: "routemaster",
      name: "Routemaster Red",
      preview: "/src/assets/icon-routemaster.png",
      description: "Iconic London red",
    },
    {
      id: "nightbus",
      name: "Night Bus Black",
      preview: "/src/assets/icon-nightbus.png",
      description: "Glow-in-the-dark vibes",
    },
    {
      id: "electric",
      name: "Electric Green",
      preview: "/src/assets/electricbus.png",
      description: "Eco-friendly & fresh",
    },
    {
      id: "halloween",
      name: "Halloween Special",
      preview: "/src/assets/HalloweenBus.png", // 👈 make sure this file exists
      description: "Spooky seasonal icon",
      isSpecial: true,
      expires: "1/11/2025",
    },
    {
      id: "christmas",
      name: "Christmas Special",
      preview: "/src/assets/Christmasbus.png", // 👈 Make sure this file exists
      description: "Festive holiday icon",
      isSpecial: true,
      startsOn: "1/12/2025", // 👈 Activation date
      isDisabled: new Date() < new Date("2025-12-01"), // 👈 Disable if today is before Dec 1, 2025
    },
  ];

  const BusIcon = ({ theme }) => {
    const color =
      theme === "dark"
        ? "text-blue-400"
        : theme === "high-contrast"
        ? "text-yellow-400"
        : theme === "minimalist"
        ? "text-gray-700"
        : "text-blue-600";
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`w-8 h-8 ${color}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 12V8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4m8-4v4m-8-4h8m-8 4h8m-8 4h8m-8 4h8M6 18h12a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2Z" />
      </svg>
    );
  };

  return (
    <div className="relative">
      <div className={`${hasPlus ? "" : "opacity-40 pointer-events-none"}`}>
        <h3
          className={`text-lg font-semibold ${currentThemeClasses.text} mb-4 flex items-center gap-2`}
        >
          Appearance
          <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
            LBT Plus
          </span>
          <span className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
            Beta
          </span>
        </h3>
        <p className={`mb-6 ${currentThemeClasses.textSecondary}`}>
          Customize the app icon
        </p>
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-yellow-800">Icon Updated!</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Click below to refresh the app icon in the header.
              </p>
            </div>
            <button
              onClick={refreshIcon}
              className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
            >
              🔄 Refresh Header Icon
            </button>
          </div>
        </div>
        <br></br>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {customIcons.map((icon) => {
            const isSelected = selectedIcon === icon.id;
            const isSpecial = icon.isSpecial;
            const isDisabled = icon.isDisabled;

            return (
              <>
                <div
                  key={icon.id}
                  onClick={() => !isDisabled && onIconSelect(icon.id)}
                  className={`relative rounded-xl p-4 cursor-pointer transition-all duration-200 border-2 ${
                    isDisabled
                      ? "opacity-60 cursor-not-allowed bg-gray-50"
                      : isSelected
                      ? "border-blue-500 ring-2 ring-blue-500/20"
                      : `${currentThemeClasses.border} hover:${currentThemeClasses.hoverBorder}`
                  } ${isSpecial ? "ring-2 ring-green-400 bg-green-50" : ""}`}
                >
                  <img
                    src={icon.preview}
                    alt={icon.name}
                    className={`w-12 h-12 mx-auto mb-2 ${
                      isDisabled ? "grayscale" : ""
                    }`}
                  />
                  <p
                    className={`text-sm font-medium text-center ${
                      isSpecial
                        ? isDisabled
                          ? "text-gray-500"
                          : "text-green-800 font-bold"
                        : currentThemeClasses.text
                    }`}
                  >
                    {icon.name}
                  </p>
                  {isSpecial && (
                    <div className="mt-1 text-xs font-medium text-center">
                      {isDisabled ? (
                        <span className="text-gray-500">
                          Starts: {icon.startsOn}
                        </span>
                      ) : (
                        <>
                          <span className="text-green-600">Available now!</span>
                          <span className="text-green-600">
                            <br></br>Expires: {icon.expires}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {isSelected && !isDisabled && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {isDisabled && (
                    <div className="absolute inset-0 bg-black/10 rounded-xl flex items-center justify-center">
                      <Ban className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                </div>
              </>
            );
          })}
        </div>
        <br></br>
        <p className={`mb-6 ${currentThemeClasses.textSecondary}`}>
          Customize the look and feel of the app
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes.map((theme) => {
            const Icon = theme.icon;
            const isSelected = selectedTheme === theme.id;
            const themeClasses = {
              bg: theme.preview.split(" ")[0],
              text: theme.preview.includes("text-white")
                ? "text-white"
                : theme.preview.includes("text-yellow")
                ? "text-yellow-300"
                : "text-gray-900",
              textSecondary: theme.preview.includes("text-yellow")
                ? "text-yellow-400"
                : "text-gray-600",
              border: "border-gray-300",
              hoverBorder: "hover:border-gray-400",
            };
            return (
              <div
                key={theme.id}
                onClick={() => onThemeSelect(theme.id)}
                className={`relative rounded-xl p-5 cursor-pointer transition-all duration-200 border-2 ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : `${currentThemeClasses.border} ${currentThemeClasses.hoverBorder}`
                } ${
                  theme.preview.includes("bg-")
                    ? theme.preview.split(" ")[0]
                    : ""
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${theme.accent}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium ${themeClasses.text}`}>
                      {theme.name}
                    </h4>
                    <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
                      {theme.description}
                    </p>
                  </div>
                </div>
                <div
                  className={`absolute top-4 right-4 w-8 h-8 rounded-full ${
                    theme.preview
                  } flex items-center justify-center border ${
                    isSelected
                      ? theme.id === "high-contrast"
                        ? "border-yellow-300"
                        : "border-white"
                      : theme.id === "high-contrast"
                      ? "border-yellow-500"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <div
                      className={`w-3 h-3 rounded-full ${
                        theme.id === "high-contrast"
                          ? "bg-yellow-300"
                          : "bg-white"
                      }`}
                    ></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!hasPlus && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10">
          <Lock className="w-12 h-12 text-white mb-4" />
          <p className="text-white text-center px-4 max-w-xs">
            Unlock custom themes with{" "}
            <span className="font-bold">LBT Plus</span>
          </p>
          <button
            onClick={() => navigate("/plus")}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            Upgrade to Plus
          </button>
        </div>
      )}
    </div>
  );
};

const SubscriptionSection = ({ subscription, currentThemeClasses }) => (
  <div
    className={`${currentThemeClasses.bg} rounded-xl shadow-sm p-6 mb-6 border ${currentThemeClasses.border}`}
  >
    <h3
      className={`text-lg font-semibold ${currentThemeClasses.text} mb-4 flex items-center gap-2`}
    >
      Subscription
      <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
        LBT Plus
      </span>
    </h3>
    <div className="space-y-4">
      <div>
        <p className={`text-sm ${currentThemeClasses.textSecondary}`}>Plan</p>
        <p className={`font-medium ${currentThemeClasses.text}`}>
          {subscription.plan} • £
          {subscription.plan === "Monthly" ? "2.99" : "24.99"} /{" "}
          {subscription.plan === "Monthly" ? "month" : "year"}
        </p>
      </div>
      <div>
        <p className={`text-sm ${currentThemeClasses.textSecondary}`}>
          Expires
        </p>
        <p className={`font-medium ${currentThemeClasses.text}`}>
          {new Date(subscription.expiresAt).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={async () => {
          const res = await fetch(
            "http://localhost:5000/api/create-portal-session",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          const { url } = await res.json();
          window.location.href = url;
        }}
        className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
      >
        Manage subscription on Stripe →
      </button>
    </div>
  </div>
);

// ======================
// MAIN COMPONENT
// ======================

const SettingsPage = ({ currentTheme, onThemeChange }) => {
  const navigate = useNavigate();
  const { logout } = useUser();
  const { user, subscription } = useUser();
  const hasPlus = subscription?.isActive;
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [selectedIcon, setSelectedIcon] = useState("default");
  const [activeSection, setActiveSection] = useState("account");

  useEffect(() => {
    const savedIcon = localStorage.getItem("appIcon") || "default";
    setSelectedIcon(savedIcon);
    applyIcon(savedIcon); // Apply it immediately
  }, []);

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
    onThemeChange(themeId);
    saveIconPreference(selectedIcon);
  };

  const handleIconSelect = (iconId) => {
    setSelectedIcon(iconId);
    saveIconPreference(iconId);
    // 👇 This is the magic: dynamically change the <link> tag for favicon/apple-touch-icon
    applyIcon(iconId);
  };

  const refreshIcon = () => {
    // Force App.jsx to re-read localStorage by triggering a state update
    window.dispatchEvent(new Event("storage"));
  };

  const applyIcon = (iconId) => {
    const iconPath = `/icons/icon-${iconId}.png`;

    // Update favicon
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) favicon.href = iconPath;

    // Update apple-touch-icon (for iOS home screen)
    const appleTouchIcon = document.querySelector(
      'link[rel="apple-touch-icon"]'
    );
    if (appleTouchIcon) appleTouchIcon.href = iconPath;

    // Update manifest (if you have one)
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      fetch(manifestLink.href)
        .then((res) => res.json())
        .then((manifest) => {
          manifest.icons.forEach((icon) => {
            icon.src = iconPath; // ⚠️ This is simplified—you might need to replace the whole manifest
          });
          // Replacing manifest is complex—usually you’d generate it server-side.
          // For now, just updating favicon/apple-touch-icon is enough for most users.
        });
    }
  };

  const DisruptionAlertsSection = ({ currentThemeClasses }) => {
    const [isEnabled, setIsEnabled] = useState(() => {
      return localStorage.getItem("disruptionAlertsEnabled") === "true";
    });
    const [permission, setPermission] = useState("default"); // "granted", "denied", "default"

    useEffect(() => {
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }
    }, []);

    const toggleAlerts = async () => {
      if (!isEnabled) {
        // Request permission
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          alert(
            "Notifications blocked. Enable in browser settings to get alerts."
          );
          return;
        }
      }

      const newState = !isEnabled;
      setIsEnabled(newState);
      localStorage.setItem("disruptionAlertsEnabled", String(newState));
    };

    return (
      <div
        className={`${currentThemeClasses.bg} rounded-xl p-6 border ${currentThemeClasses.border}`}
      >
        <h3
          className={`text-lg font-semibold ${currentThemeClasses.text} mb-4 flex items-center gap-2`}
        >
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          Service Disruption Alerts
          <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
            LBT Plus
          </span>
        </h3>
        <p className={`${currentThemeClasses.textSecondary} mb-6`}>
          Get browser notifications when your favorite bus routes or nearby
          lines have delays or disruptions.
        </p>

        <div className="flex items-center justify-between">
          <span className={`${currentThemeClasses.text}`}>
            Enable real-time alerts
          </span>
          <button
            onClick={toggleAlerts}
            disabled={permission === "denied"}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isEnabled ? "bg-blue-600" : "bg-gray-300"
            } ${
              permission === "denied" ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {permission === "denied" && (
          <p className="mt-3 text-sm text-red-600">
            ⚠️ Notifications are blocked. Please enable them in your browser
            settings.
          </p>
        )}

        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <Info className="w-4 h-4 inline mr-1" />
            Alerts are based on your <strong>favorited stops</strong> and{" "}
            <strong>recent journeys</strong>.
          </p>
        </div>
      </div>
    );
  };

  const getThemeClasses = (theme) => {
    // ... (your existing getThemeClasses function)
    switch (theme) {
      case "dark":
        return {
          bg: "bg-gray-800",
          text: "text-gray-100",
          textSecondary: "text-gray-300",
          border: "border-gray-700",
          hoverBorder: "hover:border-gray-600",
        };
      case "high-contrast":
        return {
          bg: "bg-black",
          text: "text-yellow-300",
          textSecondary: "text-yellow-400",
          border: "border-yellow-500",
          hoverBorder: "hover:border-yellow-400",
        };
      case "minimalist":
        return {
          bg: "bg-white",
          text: "text-gray-800",
          textSecondary: "text-gray-600",
          border: "border-gray-200",
          hoverBorder: "hover:border-gray-300",
        };
      default:
        return {
          bg: "bg-white",
          text: "text-gray-900",
          textSecondary: "text-gray-600",
          border: "border-gray-200",
          hoverBorder: "hover:border-gray-300",
        };
    }
  };

  const currentThemeClasses = getThemeClasses(currentTheme);

  const sidebarItems = [
    { id: "account", label: "Account", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette, plusOnly: true },
    {
      id: "disruptions",
      label: "Service Alerts",
      icon: AlertTriangle,
      plusOnly: true,
    },
    {
      id: "subscription",
      label: "Subscription",
      icon: CreditCard,
      plusOnly: true,
    },
    { id: "privacy", label: "Privacy & Data", icon: Shield },
  ];

  const saveIconPreference = (iconId) => {
    localStorage.setItem("appIcon", iconId);
    // Optional: Send to backend if you want to sync across devices
    // fetch("/api/user/update", { method: "PATCH", body: JSON.stringify({ appIcon: iconId }) });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {hasPlus && <PlusBanner subscription={subscription} />}
      <div className="flex flex-col md:flex-row gap-6">
        <Sidebar
          sidebarItems={sidebarItems}
          hasPlus={hasPlus}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          currentThemeClasses={currentThemeClasses}
          navigate={navigate}
        />
        <div className="flex-1">
          {activeSection === "account" && (
            <AccountSection
              currentThemeClasses={currentThemeClasses}
              user={user}
              navigate={navigate}
              onLogout={() => {
                logout(); // 👈 clears context + localStorage
                navigate("/signin");
              }}
            />
          )}
          {activeSection === "appearance" && (
            <AppearanceSection
              hasPlus={hasPlus}
              currentTheme={currentTheme}
              currentThemeClasses={currentThemeClasses}
              selectedTheme={selectedTheme}
              onThemeSelect={handleThemeSelect}
              selectedIcon={selectedIcon} // 👈 add this
              onIconSelect={handleIconSelect} // 👈 add this
              navigate={navigate}
            />
          )}
          {activeSection === "disruptions" && hasPlus ? (
            <DisruptionAlertsSection
              currentThemeClasses={currentThemeClasses}
            />
          ) : activeSection === "disruptions" ? (
            <LockedSection
              feature="Real-Time Disruption Alerts"
              navigate={navigate}
            />
          ) : null}
          {activeSection === "subscription" && hasPlus ? (
            <SubscriptionSection
              subscription={subscription}
              currentThemeClasses={currentThemeClasses}
            />
          ) : activeSection === "subscription" ? (
            <LockedSection feature="Subscription" navigate={navigate} />
          ) : null}
          {activeSection === "privacy" && (
            <PrivacySection currentThemeClasses={currentThemeClasses} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
