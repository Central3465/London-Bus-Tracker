// src/utils/themes.js
export const getThemeClasses = (theme) => {
  switch (theme) {
    case "dark":
      return {
        bg: "bg-gradient-to-b from-gray-900 to-gray-800",
        text: "text-gray-100",
        textSecondary: "text-gray-400",
        border: "border-gray-700",
        hoverBorder: "hover:border-gray-500",
      };
    case "high-contrast":
      return {
        bg: "bg-black",
        text: "text-yellow-300",
        textSecondary: "text-yellow-500",
        border: "border-yellow-500",
        hoverBorder: "hover:border-yellow-300",
      };
    case "minimalist":
      return {
        bg: "bg-gradient-to-b from-white to-gray-100",
        text: "text-gray-900",
        textSecondary: "text-gray-600",
        border: "border-gray-200",
        hoverBorder: "hover:border-gray-400",
      };
    case "pink-apple":
      return {
        bg: "bg-gradient-to-b from-pink-100 to-pink-200",
        text: "text-pink-900",
        textSecondary: "text-pink-700",
        border: "border-pink-300",
        hoverBorder: "hover:border-pink-500",
      };
    case "halloween":
      return {
        bg: "bg-gradient-to-b from-orange-900 to-black",
        text: "text-yellow-200",
        textSecondary: "text-orange-300",
        border: "border-purple-800",
        hoverBorder: "hover:border-purple-600",
      };
    case "christmas":
      return {
        bg: "bg-gradient-to-b from-red-900 to-green-900",
        text: "text-green-100",
        textSecondary: "text-red-300",
        border: "border-green-700",
        hoverBorder: "hover:border-green-500",
      };
    default:
      return {
        bg: "bg-gradient-to-b from-gray-50 to-white",
        text: "text-gray-900",
        textSecondary: "text-gray-600",
        border: "border-gray-300",
        hoverBorder: "hover:border-gray-400",
      };
  }
};
