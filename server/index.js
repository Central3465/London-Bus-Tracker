// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripeRoutes = require("./routes/stripe");
const jwt = require("jsonwebtoken");
const { getDB } = require("./utils/db");

const app = express();

// CORS for JWT (no credentials needed)
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.use("/api", stripeRoutes);

app.get("/api/user/me", authenticateToken, async (req, res) => {
  const db = await getDB();
  const user = db.users[req.user.id];
  if (!user) return res.status(404).json({ error: "User not found" });
  
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    subscription: user.subscription,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});