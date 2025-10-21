// src/components/NotFoundPage.jsx
import React from 'react';
import { AlertTriangle, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <div className="mb-6 p-4 bg-orange-50 rounded-full">
        <AlertTriangle className="w-16 h-16 text-orange-500" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Oops! Page Not Found</h1>
      <p className="text-gray-600 max-w-md mb-6">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
      >
        <Home className="w-4 h-4" />
        Back to Live Buses
      </Link>
    </div>
  );
};

export default NotFoundPage;