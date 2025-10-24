// src/components/CancelPage.jsx
import React from 'react';
import { XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from "../contexts/ThemeContext";

const CancelPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-6 p-4 bg-red-50 rounded-full">
        <XCircle className="w-16 h-16 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
      <p className="text-gray-600 mb-6">
        Your subscription was not activated. You can try again anytime.
      </p>
      <Link
        to="/plus"
        className="inline-block px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Try Again
      </Link>
    </div>
  );
};

export default CancelPage;