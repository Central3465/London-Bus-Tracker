// src/components/SubmitRequest.jsx
import React, { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

const SubmitRequest = () => {
  const [formData, setFormData] = useState({
    type: "suggestion",
    subject: "",
    message: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // 🔐 CAPTCHA state
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState(null);
  const [userCaptchaInput, setUserCaptchaInput] = useState("");

  // Generate a new CAPTCHA on mount
  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10); // 0–9
    const b = Math.floor(Math.random() * 10);
    setCaptchaQuestion(`${a} + ${b}`);
    setCaptchaAnswer(a + b);
    setUserCaptchaInput("");
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔐 CAPTCHA validation
    if (parseInt(userCaptchaInput, 10) !== captchaAnswer) {
      setSubmitStatus("error");
      alert("Incorrect CAPTCHA answer. Please try again.");
      generateCaptcha(); // refresh CAPTCHA on failure
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/submit-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) throw new Error("Failed to submit");

      setSubmitStatus("success");
      setFormData({ type: "suggestion", subject: "", message: "", email: "" });
      generateCaptcha(); // refresh after success too
    } catch (err) {
      console.error(err);
      setSubmitStatus("error");
      alert("Something went wrong. Please try again.");
      generateCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Submit a Request</h2>

      <div className="flex items-start p-4 mb-4 text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-lg">
        <AlertTriangle className="w-5 h-5 shrink-0 mr-3 mt-0.5" />
        <p>
          We get live data directly from TfL and bustimes.org—official, reliable
          sources. Only report an issue if you’re 100% sure it’s wrong (like,
          “I’m literally on the bus and it says I’m in Scotland” sure).
        </p>
      </div>

      {submitStatus === "success" && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          ✅ Thank you! Your request has been sent.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ... your existing form fields ... */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Request Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="suggestion">Suggestion</option>
            <option value="bug">Bug Report</option>
            <option value="ban-appeal">Ban Appeal</option>
            <option value="contact">General Contact</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Subject</label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="A brief summary"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows="5"
            placeholder="Details..."
            required
          ></textarea>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="your@email.com"
            required
          />
        </div>

        {/* 🔐 CAPTCHA FIELD */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            CAPTCHA: What is {captchaQuestion}?
          </label>
          <input
            type="number"
            value={userCaptchaInput}
            onChange={(e) => setUserCaptchaInput(e.target.value)}
            className="w-full p-2 border rounded"
            required
            min="0"
            max="18"
          />
          <button
            type="button"
            onClick={generateCaptcha}
            className="mt-1 text-sm text-blue-600 hover:underline"
          >
            ← Can’t read it? Get a new one
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 px-4 rounded font-medium ${
            isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isSubmitting ? "Sending..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
};

export default SubmitRequest;
