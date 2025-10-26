// src/components/PrivacyPolicy.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p className="mb-4">
        Last Updated: {new Date().toLocaleDateString()}
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Introduction</h2>
      <p className="mb-4">
        Welcome to Travelut, operated by BAI Studios ("we", "us", or "our"). This Privacy Policy explains how we collect, use, and protect your personal information when you use our mobile application.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Information We Collect</h2>
      <p className="mb-4">
        We may collect the following information:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Location Data:</strong> To provide real-time bus tracking and journey planning.</li>
        <li><strong>Device Information:</strong> Including device type, OS version, and unique identifiers for analytics and troubleshooting.</li>
        <li><strong>User Preferences:</strong> Such as favorite stops, theme settings, and notification preferences, stored locally on your device.</li>
        <li><strong>Usage Data:</strong> Information on how you interact with the app, including features used and frequency of use.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. How We Use Your Information</h2>
      <p className="mb-4">
        We use your information to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Provide and improve our services.</li>
        <li>Send you notifications about service disruptions or alerts (if enabled).</li>
        <li>Analyze usage patterns to enhance user experience.</li>
        <li>Comply with legal obligations under UK law and GDPR.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Data Sharing and Disclosure</h2>
      <p className="mb-4">
        We do not sell your personal data. We may share it only with:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Third-party service providers (e.g., Google Maps API) necessary for app functionality.</li>
        <li>Legal authorities if required by law.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Data Retention</h2>
      <p className="mb-4">
        We retain your data only as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Your Rights Under GDPR</h2>
      <p className="mb-4">
        You have the right to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Access your personal data.</li>
        <li>Request correction or deletion of your data.</li>
        <li>Withdraw consent at any time.</li>
        <li>Lodge a complaint with the UK Information Commissioner’s Office (ICO).</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">7. Changes to This Policy</h2>
      <p className="mb-4">
        We may update this policy from time to time. The latest version will always be available in the app.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">8. Contact Us</h2>
      <p className="mb-4">
        If you have questions about this Privacy Policy, please contact us at:
        <br />
        <strong>BAI Studios</strong><br />
        Email: <a href="mailto:privacy@bai.studio" className="text-blue-600 hover:underline">privacy@bai.studio</a><br />
        Website: <a href="https://bai.studio" className="text-blue-600 hover:underline">https://bai.studio</a>
      </p>

      <div className="mt-8 text-sm text-gray-500">
        This policy is governed by the laws of the United Kingdom and complies with the General Data Protection Regulation (GDPR).
      </div>
    </div>
  );
};

export default PrivacyPolicy;