require("dotenv").config();
const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // ← allows frontend on localhost:5173 to talk to localhost:5000
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public"))); // Optional: serve static files

// Routes
app.use("/api", require("./routes/stripe"));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});