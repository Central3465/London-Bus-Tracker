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
  Bell,
} from "lucide-react";
import { useUser } from "../contexts/UserContexts";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { getThemeClasses } from "../utils/themes";
import { CHANGELOG } from "../ChangelogData";

// ======================
// SUB-COMPONENTS
// ======================

// Seasonal icon schedule: { id, startsOn (inclusive), endsOn (exclusive) }
const SEASONAL_SCHEDULE = [
  {
    id: "halloween",
    startsOn: new Date("2025-10-20"),
    endsOn: new Date("2025-11-02"),
  },
  {
    id: "christmas",
    startsOn: new Date("2025-12-01"),
    endsOn: new Date("2026-01-07"),
  },
  // Add more later: easter, pride, etc.
];

const PlusBanner = ({ subscription }) => (
  <div className="mb-6 bg-linear-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-xl">
    <div className="flex items-center gap-3">
      <Star className="w-6 h-6" />
      <div>
        <h3 className="font-bold">Travelut Plus Active</h3>
        <p className="text-purple-100 text-sm">
          {subscription.daysRemaining} day
          {subscription.daysRemaining !== 1 ? "s" : ""} remaining
        </p>
      </div>
    </div>
  </div>
);

const DevToolsSection = ({ currentThemeClasses, user }) => {
  const [maxDays, setMaxDays] = useState(2);
  const [maxUses, setMaxUses] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState(() => {
    const saved = localStorage.getItem("devTrialCodes");
    return saved ? JSON.parse(saved) : [];
  });

  // 👇 NEW: All accounts state
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState(null);

  const saveCodes = (codes) => {
    setGeneratedCodes(codes);
    localStorage.setItem("devTrialCodes", JSON.stringify(codes));
  };

  const handleGenerate = async () => {
    if (!user?.email || user.email !== "hanlinbai667@gmail.com") return;
    const cleanMaxDays = Math.min(2, Math.max(1, parseInt(maxDays) || 2));
    const cleanMaxUses = Math.min(10, Math.max(1, parseInt(maxUses) || 1));
    setIsGenerating(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/generate-trial-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            maxDays: cleanMaxDays,
            maxUses: cleanMaxUses,
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        const newCode = {
          code: data.code,
          maxDays: data.maxDays,
          maxUses: data.maxUses,
          expiresAt: data.expiresAt,
          createdAt: new Date().toISOString(),
        };
        const updated = [newCode, ...generatedCodes.slice(0, 9)];
        saveCodes(updated);
        navigator.clipboard.writeText(data.code).catch(() => {});
        alert(
          `✅ Code: ${data.code}\nValid for ${data.maxDays} day(s), ${data.maxUses} use(s)`
        );
      } else {
        alert(`❌ Failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Generation error:", err);
      alert(`❌ Network error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 👇 NEW: Fetch all users
  const fetchAllUsers = async () => {
    if (!user?.email || user.email !== "hanlinbai667@gmail.com") return;
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch users");
      }
      const users = await res.json();
      setAllUsers(users);
    } catch (err) {
      console.error("Fetch users error:", err);
      setErrorUsers(err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  // 👇 NEW: Ban a user
  const handleBan = async (userId, email) => {
    if (
      !window.confirm(
        `⚠️ Ban ${email}?\nThis will block all access. Reason required.`
      )
    )
      return;

    const reason = prompt("Enter ban reason:");
    if (!reason) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/admin/ban`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ userId, reason }),
        }
      );
      if (res.ok) {
        alert(`✅ ${email} banned!`);
        fetchAllUsers(); // refresh
      } else {
        const data = await res.json();
        alert(`❌ Ban failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`❌ Network error: ${err.message}`);
    }
  };

  // 👇 NEW: Unban a user
  const handleUnban = async (userId, email) => {
    if (!window.confirm(`Are you sure you want to unban ${email}?`)) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/admin/unban`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ userId }),
        }
      );
      if (res.ok) {
        alert(`✅ ${email} unbanned!`);
        fetchAllUsers(); // refresh list
      } else {
        const data = await res.json();
        alert(`❌ Unban failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`❌ Network error: ${err.message}`);
    }
  };

  // 👇 NEW: Restrict a user (toggle)
  const handleRestrict = async (userId, email, isCurrentlyRestricted) => {
    const action = isCurrentlyRestricted ? "lift restriction" : "restrict";
    if (!window.confirm(`Are you sure you want to ${action} ${email}?`)) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/admin/restrict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ userId, restricted: !isCurrentlyRestricted }),
        }
      );
      if (res.ok) {
        alert(`✅ ${email} ${action}ed!`);
        fetchAllUsers(); // refresh
      } else {
        const data = await res.json();
        alert(`❌ Action failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`❌ Network error: ${err.message}`);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      alert(`📋 Copied: ${code}`);
    });
  };

  const handleClearHistory = () => {
    if (window.confirm("Clear all generated trial code history?")) {
      saveCodes([]);
    }
  };

  // Only show dev tools if you're the dev
  if (!user?.email || user.email !== "hanlinbai667@gmail.com") {
    return null;
  }

  return (
    <div
      className={`${currentThemeClasses.bg} rounded-xl p-6 border ${currentThemeClasses.border}`}
    >
      {/* Existing Trial Code Generator */}
      <h3
        className={`text-lg font-semibold ${currentThemeClasses.text} mb-4 flex items-center gap-2`}
      >
        <Star className="w-5 h-5 text-purple-600" />
        Developer Trial Codes
      </h3>
      <p className={`text-sm ${currentThemeClasses.textSecondary} mb-4`}>
        Generate trial codes with custom duration (1–2 days) and usage limits
        (1–10 redemptions).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label
            className={`block text-sm ${currentThemeClasses.textSecondary} mb-1`}
          >
            Max Days (1–2)
          </label>
          <input
            type="number"
            min="1"
            max="2"
            value={maxDays}
            onChange={(e) => setMaxDays(e.target.value)}
            className="w-full p-2 border rounded bg-white text-gray-900"
          />
        </div>
        <div>
          <label
            className={`block text-sm ${currentThemeClasses.textSecondary} mb-1`}
          >
            Max Uses (1–10)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="w-full p-2 border rounded bg-white text-gray-900"
          />
        </div>
      </div>
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60"
      >
        {isGenerating ? "Generating..." : "Generate Trial Code"}
      </button>

      {generatedCodes.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className={`font-medium ${currentThemeClasses.text}`}>
              Recent Codes
            </h4>
            <button
              onClick={handleClearHistory}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Clear history
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {generatedCodes.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 rounded border"
              >
                <div>
                  <code className="font-mono text-sm font-bold text-purple-700">
                    {item.code}
                  </code>
                  <p className="text-xs text-gray-600 mt-1">
                    {item.maxDays} day{item.maxDays !== 1 ? "s" : ""} •{" "}
                    {item.maxUses} use{item.maxUses !== 1 ? "s" : ""}
                    <br />
                    Expires: {new Date(item.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(item.code)}
                  className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 👇 NEW: All Accounts Viewer with Punishment Controls */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3
            className={`text-lg font-semibold ${currentThemeClasses.text} flex items-center gap-2`}
          >
            <User className="w-5 h-5" /> All Accounts
          </h3>
          <button
            onClick={fetchAllUsers}
            disabled={loadingUsers}
            className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-gray-800 disabled:opacity-60"
          >
            {loadingUsers ? "Loading..." : "Refresh"}
          </button>
        </div>

        {errorUsers && (
          <div className="mb-4 p-2 bg-red-100 text-red-800 rounded text-sm">
            ❌ {errorUsers}
          </div>
        )}

        {allUsers.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {allUsers.map((u) => (
              <div
                key={u.id}
                className="p-3 bg-gray-50 rounded border flex justify-between items-start"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {u.name || "—"}
                  </div>
                  <div className="text-sm text-gray-600">{u.email}</div>
                  <div className="text-xs mt-1 flex flex-wrap gap-2">
                    <span
                      className={
                        u.subscription?.isActive
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    >
                      {u.subscription?.isActive ? "✅ Plus" : "🆓 Free"}
                    </span>
                    {u.banned && (
                      <span className="text-red-600 font-bold">🚫 BANNED</span>
                    )}
                    {u.restricted && !u.banned && (
                      <span className="text-orange-600">⚠️ Restricted</span>
                    )}
                    {u.lastSeen && (
                      <span className="text-gray-500">
                        Last:{" "}
                        {new Date(u.lastSeen).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  {u.banReason && (
                    <div className="text-xs text-red-700 mt-1">
                      Reason: {u.banReason}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {u.banned ? (
                    <button
                      onClick={() => handleUnban(u.id, u.email)}
                      className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                    >
                      Unban
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBan(u.id, u.email)}
                      className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                    >
                      Ban
                    </button>
                  )}
                  <button
                    onClick={() => handleRestrict(u.id, u.email, u.restricted)}
                    className={`text-xs px-2 py-1 rounded ${
                      u.restricted
                        ? "bg-green-100 hover:bg-green-200 text-green-700"
                        : "bg-orange-100 hover:bg-orange-200 text-orange-700"
                    }`}
                  >
                    {u.restricted ? "Unrestrict" : "Restrict"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loadingUsers && (
            <p className={`text-sm ${currentThemeClasses.textSecondary}`}>
              Click "Refresh" to load accounts.
            </p>
          )
        )}
      </div>
    </div>
  );
};

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

const AlertSection = ({
  currentThemeClasses,
  alertsEnabled,
  hasPlus,
  onToggle,
}) => {
  return (
    <div
      className={`${currentThemeClasses.bg} rounded-xl p-6 border ${currentThemeClasses.border} transition-all duration-200 hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3
            className={`text-lg font-semibold ${currentThemeClasses.text} mb-2`}
          >
            Custom Alerts
          </h3>
          <p
            className={`text-sm ${currentThemeClasses.textSecondary} mb-4 max-w-prose`}
          >
            Stay informed with real-time alerts for your fleet and favorite
            stops. Enable notifications to receive updates even when you're not
            actively using the app.
          </p>
        </div>
        {hasPlus && (
          <div className="ml-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Plus
            </span>
          </div>
        )}
      </div>

      <label className="flex items-center space-x-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={alertsEnabled}
            onChange={onToggle} // ✅ use passed handler
            disabled={!hasPlus}
            className="sr-only"
          />
          <div
            className={`block w-11 h-6 rounded-full transition-colors ${
              alertsEnabled && hasPlus
                ? "bg-blue-600"
                : hasPlus
                ? "bg-gray-300 dark:bg-gray-600"
                : "bg-gray-200 opacity-60"
            }`}
          />
          <div
            className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
              alertsEnabled ? "transform translate-x-5" : ""
            } ${!hasPlus ? "opacity-50" : ""}`}
          />
        </div>
        <span
          className={`text-sm font-medium ${
            hasPlus
              ? currentThemeClasses.text
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          Enable Custom Alerts
        </span>
      </label>

      {!hasPlus && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          🔒 Available with <span className="font-medium">Travelut Plus</span>
        </p>
      )}
    </div>
  );
};

const LockedSection = ({ feature, navigate }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center min-h-[300px]">
    <Lock className="w-12 h-12 text-gray-400 mb-4" />
    <p className="text-gray-600 mb-4">
      Unlock <span className="font-bold">{feature}</span> with Travelut Plus
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
        `${import.meta.env.VITE_API_BASE_URL}/user/update`,
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

const PrivacySection = ({ currentThemeClasses, onLogout, navigate }) => {
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

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "⚠️ This cannot be undone.\n\nAll your data — including favorites, subscription, and profile — will be permanently deleted. Continue?"
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Account deleted. Redirecting...");
        onLogout(); // clears local state
        setTimeout(() => navigate("/"), 1500);
      } else {
        setMessage(`❌ ${data.error || "Deletion failed"}`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error("Delete account error:", err);
      setMessage("❌ Network error");
      setTimeout(() => setMessage(""), 3000);
    }
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
            Permanently delete your account and all associated data.
          </p>
          <button
            onClick={handleDeleteAccount}
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
  user,
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
    // 🍏 NEW: Pink Apple Theme
    {
      id: "pink-apple",
      name: "Pink Apple",
      icon: Palette,
      description: "Soft pink vibes, Cupertino style",
      preview: "bg-pink-50 text-pink-900",
      accent: "bg-pink-500",
      plusOnly: true,
    },
    // 🎃 NEW: Halloween Theme (Limited)
    {
      id: "halloween",
      name: "Halloween",
      icon: Moon,
      description: "Spooky dark-orange theme",
      preview: "bg-orange-900 text-yellow-200",
      accent: "bg-purple-600",
      plusOnly: true,
      isSpecial: true,
      startsOn: new Date("2025-10-20"),
      endsOn: new Date("2025-11-02"),
    },
    // 🎄 NEW: Christmas Theme (Limited)
    {
      id: "christmas",
      name: "Christmas",
      icon: Star,
      description: "Festive red & green joy",
      preview: "bg-red-900 text-green-200",
      accent: "bg-green-500",
      plusOnly: true,
      isSpecial: true,
      startsOn: new Date("2025-12-01"),
      endsOn: new Date("2026-01-07"),
    },
  ];

  useEffect(() => {
    if (!hasPlus) return;

    const now = new Date();
    const seasonalTheme = themes.find(
      (t) =>
        t.isSpecial &&
        now >= t.startsOn &&
        now < t.endsOn &&
        localStorage.getItem("autoSeasonalThemes") !== "false"
    );

    if (seasonalTheme && selectedTheme !== seasonalTheme.id) {
      onThemeSelect(seasonalTheme.id);
    }
  }, [hasPlus, selectedTheme]);

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

  const [autoSeasonalIcons, setAutoSeasonalIcons] = useState(() => {
    return localStorage.getItem("autoSeasonalIcons") === "true";
  });

  const [autoSeasonalThemes, setAutoSeasonalThemes] = useState(() => {
    return localStorage.getItem("autoSeasonalThemes") === "true";
  });

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

  const [autoSeasonal, setAutoSeasonal] = useState(() => {
    return localStorage.getItem("autoSeasonalIcons") === "true";
  });

  const now = new Date();

  const availableThemes = themes.filter((theme) => {
    // Hide if Plus-only and user doesn't have Plus
    if (theme.plusOnly && !hasPlus) return false;

    // Hide seasonal themes outside their window
    if (theme.isSpecial) {
      return now >= theme.startsOn && now < theme.endsOn;
    }

    return true;
  });

  return (
    <div className="relative">
      <div
        className={`${currentThemeClasses.bg} rounded-xl p-6 border ${currentThemeClasses.border}`}
      >
        <h3
          className={`text-lg font-semibold ${currentThemeClasses.text} mb-4 flex items-center gap-2`}
        >
          Appearance
          <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
            Travelut Plus
          </span>
          <span className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
            Beta
          </span>
        </h3>
        <p className={`mb-6 ${currentThemeClasses.textSecondary}`}>
          Customize the app icon
        </p>
        {!user && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <Info className="w-4 h-4 inline mr-1" />
            You're viewing as a guest. Custom icons only appear in the header
            when you're signed in.
          </div>
        )}
        <br></br>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {customIcons.map((icon) => {
            const isSelected = selectedIcon === icon.id;
            const isSpecial = icon.isSpecial;
            const isDisabled = icon.isDisabled;

            return (
              <div
                key={icon.id} // 👈 now this is the direct child of .map()
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
            );
          })}
        </div>
        {hasPlus && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-medium ${currentThemeClasses.text}`}>
                  Auto Seasonal Icons
                </h4>
                <p
                  className={`text-sm ${currentThemeClasses.textSecondary} mt-1`}
                >
                  Let Travelut automatically switch to festive icons during holidays.
                </p>
              </div>
              <button
                onClick={() => {
                  const newState = !autoSeasonalIcons;
                  setAutoSeasonalIcons(newState);
                  localStorage.setItem("autoSeasonalIcons", String(newState));
                  if (newState) {
                    const now = new Date();
                    const activeSeason = SEASONAL_SCHEDULE.find(
                      (s) => now >= s.startsOn && now < s.endsOn
                    );
                    if (activeSeason) {
                      onIconSelect(activeSeason.id);
                    }
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSeasonalIcons ? "bg-purple-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSeasonalIcons ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}
        <br></br>
        <p className={`mb-6 ${currentThemeClasses.textSecondary}`}>
          Customize the look and feel of the app
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableThemes.map((theme) => {
            const Icon = theme.icon;
            const isSelected = selectedTheme === theme.id;
            const { themeClasses } = useTheme();
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
      {hasPlus && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`font-medium ${currentThemeClasses.text}`}>
                Auto Seasonal Themes
              </h4>
              <p
                className={`text-sm ${currentThemeClasses.textSecondary} mt-1`}
              >
                Let Travelut automatically switch to festive thems during holidays.
              </p>
            </div>
            <button
              onClick={() => {
                const newState = !autoSeasonalThemes;
                setAutoSeasonalThemes(newState);
                localStorage.setItem("autoSeasonalThemes", String(newState));
                if (newState) {
                  const now = new Date();
                  const activeSeason = SEASONAL_SCHEDULE.find(
                    (s) => now >= s.startsOn && now < s.endsOn
                  );
                  if (activeSeason) {
                    // 👇 Should call onThemeSelect, not onIconSelect!
                    onThemeSelect(activeSeason.id);
                  }
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoSeasonalThemes ? "bg-purple-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSeasonalThemes ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      )}
      {!hasPlus && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10">
          <Lock className="w-12 h-12 text-white mb-4" />
          <p className="text-white text-center px-4 max-w-xs">
            Unlock custom themes with{" "}
            <span className="font-bold">Travelut Plus</span>
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
        Travelut Plus
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

const ChangelogSection = ({ currentThemeClasses, navigate }) => {
  const [expanded, setExpanded] = useState(false);

  const getTypeColor = (type) => {
    switch (type) {
      case "feature":
        return "text-purple-700 bg-purple-100";
      case "improvement":
        return "text-blue-700 bg-blue-100";
      case "fix":
        return "text-green-700 bg-green-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const latest = CHANGELOG[0];
  const older = CHANGELOG.slice(1);

  return (
    <div
      className={`${currentThemeClasses.bg} rounded-xl p-6 border ${currentThemeClasses.border}`}
    >
      <h3
        className={`text-lg font-semibold ${currentThemeClasses.text} mb-4 flex items-center gap-2`}
      >
        <Info className="w-5 h-5" /> What’s New
      </h3>

      {/* Latest version */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <span className="font-bold text-black dark:text-black">
            {latest.version}
          </span>
          <span className="text-sm text-gray-500">{latest.date}</span>
        </div>
        {latest.highlights && (
          <p className="text-sm font-medium mb-3 text-gray-800 dark:text-black">
            {latest.highlights.join(" • ")}
          </p>
        )}
        <ul className="space-y-2">
          {latest.entries.map((entry, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${getTypeColor(
                  entry.type
                )}`}
              >
                {entry.type}
              </span>
              <span className={`${currentThemeClasses.textSecondary} text-sm`}>
                {entry.text}
                {entry.text.includes("(Plus only)") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/plus");
                    }}
                    className="ml-1 text-purple-600 hover:underline text-xs font-medium"
                  >
                    Upgrade
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Older versions toggle */}
      {older.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`text-sm font-medium ${currentThemeClasses.textSecondary} hover:${currentThemeClasses.text}`}
        >
          {expanded
            ? "Show less"
            : `View ${older.length} older update${
                older.length !== 1 ? "s" : ""
              }`}
        </button>
      )}

      {/* Older versions (collapsible) */}
      {expanded && (
        <div className="mt-4 space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {older.map((release, idx) => (
            <div key={idx}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {release.version}
                </span>
                <span className="text-xs text-gray-500">{release.date}</span>
              </div>
              <ul className="space-y-1">
                {release.entries.map((entry, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${getTypeColor(
                        entry.type
                      )}`}
                    >
                      {entry.type}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.text}
                      {entry.text.includes("(Plus only)") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/plus");
                          }}
                          className="ml-1 text-purple-600 hover:underline text-xs"
                        >
                          Upgrade
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SettingsPage = ({ currentTheme, onThemeChange }) => {
  const navigate = useNavigate();
  const { logout, updateSubscription } = useUser();
  const { user, subscription } = useUser();
  const hasPlus = subscription?.isActive;
  if (subscription) {
    console.log("Today:", new Date().toISOString().split("T")[0]);
    console.log("Expires:", subscription.expiresAt);
    console.log("Raw daysRemaining from backend:", subscription.daysRemaining);
  } else {
    console.log("No subscription data yet (or user not logged in)");
  }
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [selectedIcon, setSelectedIcon] = useState("default");
  const [activeSection, setActiveSection] = useState("account");

  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    return localStorage.getItem("customAlertsEnabled") === "true";
  });

  const handleAlertsToggle = () => {
    const newState = !alertsEnabled;
    setAlertsEnabled(newState);
    localStorage.setItem("customAlertsEnabled", String(newState));
  };

  useEffect(() => {
    const savedIcon = localStorage.getItem("appIcon") || "default";
    const autoSeasonalEnabled =
      localStorage.getItem("autoSeasonalIcons") === "true";

    if (autoSeasonalEnabled && hasPlus) {
      const now = new Date();
      const activeSeason = SEASONAL_SCHEDULE.find(
        (s) => now >= s.startsOn && now < s.endsOn
      );
      if (activeSeason) {
        // Only auto-apply if user hasn't manually overridden during this season
        const lastManualIcon = localStorage.getItem("manualIconOverride");
        const seasonKey = `${activeSeason.id}-${
          activeSeason.startsOn.toISOString().split("T")[0]
        }`;
        if (lastManualIcon !== seasonKey) {
          applyIcon(activeSeason.id);
          localStorage.setItem("appIcon", activeSeason.id);
          setSelectedIcon(activeSeason.id);
          return;
        }
      }
    }

    // Fallback to saved icon
    setSelectedIcon(savedIcon);
    applyIcon(savedIcon);
  }, [hasPlus]); // 👈 depend on hasPlus so it rechecks after login/subscription

  useEffect(() => {
    if (user && subscription) {
      // Optional: only refetch if data is older than X minutes
      const lastFetched = localStorage.getItem("subscriptionLastFetched");
      const now = Date.now();
      if (!lastFetched || now - parseInt(lastFetched) > 5 * 60 * 1000) {
        updateSubscription();
        localStorage.setItem("subscriptionLastFetched", now.toString());
      }
    }
  }, [user, updateSubscription]);

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
    onThemeChange(themeId);
    saveIconPreference(selectedIcon);
  };

  const handleIconSelect = (iconId) => {
    setSelectedIcon(iconId);
    saveIconPreference(iconId);
    applyIcon(iconId);
    window.dispatchEvent(
      new CustomEvent("appIconChanged", { detail: { iconId } })
    );

    // If this is a manual pick during a seasonal period, disable auto for this season
    const autoSeasonalEnabled =
      localStorage.getItem("autoSeasonalIcons") === "true";
    if (autoSeasonalEnabled && hasPlus) {
      const now = new Date();
      const currentSeason = SEASONAL_SCHEDULE.find(
        (s) => now >= s.startsOn && now < s.endsOn
      );
      if (currentSeason) {
        const seasonKey = `${currentSeason.id}-${
          currentSeason.startsOn.toISOString().split("T")[0]
        }`;
        localStorage.setItem("manualIconOverride", seasonKey);
      }
    }
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
            Travelut Plus
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
  const currentThemeClasses = getThemeClasses(currentTheme);

  const sidebarItems = [
    { id: "account", label: "Account", icon: User },
    { id: "whats-new", label: "What’s New", icon: Info },
    { id: "appearance", label: "Appearance", icon: Palette, plusOnly: true },
    {
      id: "disruptions",
      label: "Service Alerts",
      icon: AlertTriangle,
      plusOnly: true,
    },
    { id: "alerts", label: "Disruption Alerts", icon: Bell, plusOnly: true },
    {
      id: "subscription",
      label: "Subscription",
      icon: CreditCard,
      plusOnly: true,
    },
    { id: "privacy", label: "Privacy & Data", icon: Shield },
    ...(user?.email === "hanlinbai667@gmail.com"
      ? [{ id: "dev", label: "Dev Tools", icon: Star }]
      : []),
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
          {activeSection === "whats-new" && (
            <ChangelogSection
              currentThemeClasses={currentThemeClasses}
              navigate={navigate}
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
              user={user}
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
          {activeSection === "alerts" && hasPlus ? (
            <AlertSection
              currentThemeClasses={currentThemeClasses}
              alertsEnabled={alertsEnabled} // ✅ now reactive
              hasPlus={hasPlus}
              onToggle={handleAlertsToggle}
            />
          ) : activeSection === "alerts" ? (
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
            <PrivacySection
              currentThemeClasses={currentThemeClasses}
              onLogout={() => {
                logout();
                navigate("/signin");
              }}
              navigate={navigate}
            />
          )}
          {activeSection === "dev" &&
            user?.email === "hanlinbai667@gmail.com" && (
              <DevToolsSection
                currentThemeClasses={currentThemeClasses}
                user={user}
              />
            )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
