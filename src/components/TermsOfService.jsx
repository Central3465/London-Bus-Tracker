// src/components/TermsOfService.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
      <p className="mb-4">
        Last Updated: {new Date().toLocaleDateString()}
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
      <p className="mb-4">
        By downloading, installing, or using Travelut, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Description of Service</h2>
      <p className="mb-4">
        Travelut is a mobile application designed to provide real-time bus tracking, journey planning, and transit information for users in the United Kingdom. The service is provided “as is” and “as available”.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. User Responsibilities</h2>
      <p className="mb-4">
        You agree not to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Use the app for any unlawful purpose.</li>
        <li>Attempt to reverse engineer, decompile, or disassemble the app.</li>
        <li>Use automated scripts or bots to access the app.</li>
        <li>Harass, abuse, or impersonate other users.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Intellectual Property</h2>
      <p className="mb-4">
        All content, trademarks, and logos in the app are owned by BAI Studios or its licensors. You may not reproduce, distribute, or create derivative works without prior written permission.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Disclaimers and Limitation of Liability</h2>
      <p className="mb-4">
        We make no warranties regarding the accuracy, reliability, or availability of the app. In no event shall BAI Studios be liable for any direct, indirect, incidental, or consequential damages arising from your use of the app.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Changes to Terms</h2>
      <p className="mb-4">
        We reserve the right to modify these terms at any time. Your continued use of the app constitutes acceptance of the revised terms.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">7. Governing Law</h2>
      <p className="mb-4">
        These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">8. Contact Us</h2>
      <p className="mb-4">
        For questions about these Terms of Service, please contact us at:
        <br />
        <strong>BAI Studios</strong><br />
        Email: <a href="mailto:legal@bai.studio" className="text-blue-600 hover:underline">legal@bai.studio</a><br />
        Website: <a href="https://bai.studio" className="text-blue-600 hover:underline">https://bai.studio</a>
      </p>

      <div className="mt-8 text-sm text-gray-500">
        These Terms of Service comply with UK law and the General Data Protection Regulation (GDPR).
      </div>
    </div>
  );
};

export default TermsOfService;