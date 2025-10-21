// src/components/SuccessPage.jsx
import React, { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SuccessPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-6 p-4 bg-green-50 rounded-full">
        <CheckCircle className="w-16 h-16 text-green-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
      <p className="text-gray-600 mb-6">
        Your subscription is now active. Redirecting to the app...
      </p>
      <button
        onClick={() => navigate('/')}
        className="text-blue-600 hover:underline font-medium"
      >
        Go to Home Now
      </button>
    </div>
  );
};

export default SuccessPage;