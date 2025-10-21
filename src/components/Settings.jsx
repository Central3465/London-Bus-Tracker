import React, { useState, useEffect } from "react";
import {
  Settings,
  Moon,
  Sun,
  Contrast,
  Palette,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { useUser } from "../contexts/UserContexts";
import { useNavigate } from 'react-router-dom';

const SettingsPage = ({ currentTheme, onThemeChange, setActiveTab }) => {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const navigate = useNavigate();
  const { subscription } = useUser();
  const hasPlus = subscription?.isActive;

  // Helper function to get theme-specific classes
  const getThemeClasses = (theme) => {
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
      default: // light
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

  const themes = [
    {
      id: "light",
      name: "Light Mode",
      icon: Sun,
      description: "Clean, bright interface with soft colors",
      preview: "bg-white text-gray-900",
      accent: "bg-blue-600",
    },
    {
      id: "dark",
      name: "Dark Mode",
      icon: Moon,
      description: "Reduced eye strain with dark backgrounds",
      preview: "bg-gray-900 text-white",
      accent: "bg-blue-500",
    },
    {
      id: "high-contrast",
      name: "High Contrast",
      icon: Contrast,
      description: "Enhanced visibility for accessibility",
      preview: "bg-black text-yellow-300",
      accent: "bg-yellow-400",
    },
    {
      id: "minimalist",
      name: "Minimalist",
      icon: Palette,
      description: "Simplified UI with essential elements only",
      preview: "bg-gray-50 text-gray-800 border border-gray-200",
      accent: "bg-gray-700",
    },
  ];

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
    onThemeChange(themeId);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div
        className={`${currentThemeClasses.bg} rounded-xl shadow-sm p-6 mb-6 border ${currentThemeClasses.border}`}
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className={`text-2xl font-bold ${currentThemeClasses.text}`}>
            App Settings
          </h2>
        </div>

        {/* 👇 Appearance Section Wrapper — now with relative positioning */}
        <div className="relative">
          <div className={`${hasPlus ? "" : "opacity-40 pointer-events-none"}`}>
            <h3
              className={`text-lg font-semibold ${currentThemeClasses.text} mb-4 flex items-center gap-2`}
            >
              Appearance
              <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                LBT Plus Only
              </span>
              <span className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                Beta
              </span>
            </h3>

            {/* Beta Warning Box */}
            <div
              className={`${
                currentTheme === "dark"
                  ? "bg-gray-800/50 border-gray-700"
                  : currentTheme === "high-contrast"
                  ? "bg-black border-yellow-500"
                  : "bg-blue-50 border-blue-200"
              } rounded-xl p-4 mb-6 border backdrop-blur-sm`}
            >
              <div className="flex items-start space-x-3">
                <AlertTriangle
                  className={`flex-shrink-0 mt-0.5 w-5 h-5 ${
                    currentTheme === "high-contrast"
                      ? "text-yellow-400"
                      : "text-blue-500"
                  }`}
                />
                <div>
                  <p
                    className={`text-sm ${
                      currentTheme === "high-contrast"
                        ? "text-yellow-300"
                        : "text-blue-800"
                    }`}
                  >
                    All themes except Light Mode are in beta.
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      currentTheme === "high-contrast"
                        ? "text-yellow-400"
                        : "text-blue-700"
                    }`}
                  >
                    You might spot small visual bugs. If tiny imperfections make
                    you angry… stick with Light Mode! 😅
                  </p>
                </div>
              </div>
            </div>

            <p className={`mb-6 ${currentThemeClasses.textSecondary}`}>
              Customize the look and feel of the app to suit your preferences
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {themes.map((theme) => {
                const Icon = theme.icon;
                const isSelected = selectedTheme === theme.id;
                const themeClasses = getThemeClasses(theme.id);

                return (
                  <div
                    key={theme.id}
                    onClick={() => handleThemeSelect(theme.id)}
                    className={`relative rounded-xl p-5 cursor-pointer transition-all duration-200 border-2 ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-500/20"
                        : `${currentThemeClasses.border} ${currentThemeClasses.hoverBorder}`
                    } ${themeClasses.bg}`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${theme.accent}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-medium ${themeClasses.text}`}>
                          {theme.name}
                        </h4>
                        <p
                          className={`text-sm ${themeClasses.textSecondary} mt-1`}
                        >
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

          {/* ✅ Lock Overlay — now INSIDE the relative container */}
          {!hasPlus && (
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10">
              <Lock className="w-12 h-12 text-white mb-4" />
              <p className="text-white text-center px-4 max-w-xs">
                Unlock custom themes and appearances with{" "}
                <span className="font-bold">LBT Plus</span>
              </p>
              <button
                onClick={() => {
                  navigate('/plus');
                }}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Upgrade to Plus
              </button>
            </div>
          )}
        </div>

        {/* 👇 Theme Preview — keep this OUTSIDE the locked section */}
        <div
          className={`${
            currentTheme === "dark"
              ? "bg-gray-800 border-gray-700"
              : currentTheme === "high-contrast"
              ? "bg-black border-yellow-500"
              : "bg-blue-50 border-blue-100"
          } rounded-xl p-5 border mt-6`}
        >
          <h3
            className={`font-medium ${
              currentTheme === "high-contrast"
                ? "text-yellow-300"
                : "text-blue-900"
            } mb-2`}
          >
            Theme Preview
          </h3>
          <div className="flex items-center space-x-4">
            <div
              className={`w-16 h-16 rounded-lg ${
                themes.find((t) => t.id === selectedTheme)?.preview
              } flex items-center justify-center border ${
                selectedTheme === "high-contrast"
                  ? "border-yellow-500"
                  : "border-gray-300"
              }`}
            >
              <BusIcon theme={selectedTheme} />
            </div>
            <div>
              <p
                className={`text-sm ${
                  currentTheme === "high-contrast"
                    ? "text-yellow-300"
                    : "text-blue-800"
                }`}
              >
                Current selection:{" "}
                <span className="font-medium">
                  {themes.find((t) => t.id === selectedTheme)?.name}
                </span>
              </p>
              <p
                className={`text-xs ${
                  currentTheme === "high-contrast"
                    ? "text-yellow-400"
                    : "text-blue-700"
                } mt-1`}
              >
                Changes apply immediately across the entire app
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for bus icon preview
const BusIcon = ({ theme }) => {
  const getIconColor = () => {
    switch (theme) {
      case "dark":
        return "text-blue-400";
      case "high-contrast":
        return "text-yellow-400";
      case "minimalist":
        return "text-gray-700";
      default:
        return "text-blue-600";
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`w-8 h-8 ${getIconColor()}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 12V8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4m8-4v4m-8-4h8m-8 4h8m-8 4h8m-8 4h8M6 18h12a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2Z" />
    </svg>
  );
};

export default SettingsPage;
