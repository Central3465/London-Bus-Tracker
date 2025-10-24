// src/contexts/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { getThemeClasses } from "../utils/themes";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("appTheme") || "light";
    setTheme(savedTheme);
  }, []);

  // Apply theme to body
  useEffect(() => {
    const themeClasses = getThemeClasses(theme);
    localStorage.setItem("appTheme", theme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.add("bg-white"); // or bg-black for dark mode fallback
  }, []);

  // Get theme classes for components
  const themeClasses = getThemeClasses(theme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeClasses }}>
      {children}
    </ThemeContext.Provider>
  );
};
