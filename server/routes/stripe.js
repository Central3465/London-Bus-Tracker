// server/routes/stripe.js
require("dotenv").config();
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const fs = require("fs-extra");
const path = require("path");
const jwt = require("jsonwebtoken"); // ← Add this
const { getDB, saveDB } = require("../utils/db");
const {
  fetchBodsDatasetList,
  fetchBodsDataset,
  parseTransXChange,
} = require("../../src/utils/bodsParser.js");
const axios = require("axios");

const router = express.Router();

// Load DB
const DB_PATH = path.join(__dirname, "..", "db.json");

// Secret for JWT signing
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("🪪 Raw token received:", JSON.stringify(token)); // This will show "null" if missing

  if (!token || token === "null" || token === "undefined") {
    console.log("❌ Invalid token value");
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("❌ JWT error:", err.message);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

router.get("/bods/timetable", authenticateToken, async (req, res) => {
  const { line, date } = req.query;

  if (!line || !date) {
    return res.status(400).json({ error: "line and date required" });
  }

  // Optional: restrict to Plus users only
  const db = await getDB();
  const user = db.users[req.user.id];
  if (!user.subscription?.isActive) {
    return res.status(403).json({ error: "Timetable replay is Plus-only" });
  }

  try {
    // Step 1: Get dataset list
    const list = await fetchBodsDatasetList(5);
    const dataset = list.results.find(
      (d) =>
        d.name.toLowerCase().includes("london") || d.description?.includes(line)
    );
    if (!dataset) throw new Error("No London dataset found");

    // Step 2: Get download URL
    const details = await fetchBodsDataset(dataset.id);
    const downloadUrl = details.download_url;
    if (!downloadUrl) throw new Error("No download URL");

    // Step 3: Fetch XML
    const xmlRes = await axios.get(downloadUrl, { responseType: "text" });
    const stops = parseTransXChange(xmlRes.data, line);

    // Step 4: Enrich with coordinates from TfL (optional but recommended)
    const enrichedStops = [];
    for (const stop of stops) {
      try {
        // TfL StopPoint API uses naptanId = stop.id
        const tflRes = await axios.get(
          `https://api.tfl.gov.uk/StopPoint/${stop.id}`,
          {
            params: {
              app_id: process.env.TFL_APP_ID,
              app_key: process.env.TFL_APP_KEY,
            },
          }
        );
        const tflStop = tflRes.data;
        enrichedStops.push({
          ...stop,
          lat: tflStop.lat,
          lng: tflStop.lon,
        });
      } catch (err) {
        // Fallback: skip or use centroid
        console.warn(`⚠️ Could not geocode stop ${stop.id}`);
        enrichedStops.push({ ...stop, lat: null, lng: null });
      }
    }

    res.json({ stops: enrichedStops });
  } catch (err) {
    console.error("BODS timetable error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 🆕 DELETE ACCOUNT ROUTE
router.delete("/account", authenticateToken, async (req, res) => {
  const userId = req.user.id; // from JWT

  try {
    const db = await getDB();

    // Check if user exists
    if (!db.users[userId]) {
      return res.status(404).json({ error: "User not found" });
    }

    // Optional: Cancel Stripe subscription if active
    const user = db.users[userId];
    if (user.subscription?.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.del(user.subscription.stripeSubscriptionId);
        console.log(`✅ Cancelled Stripe subscription for ${userId}`);
      } catch (err) {
        console.warn("⚠️ Failed to cancel Stripe sub:", err.message);
        // Don't block deletion if Stripe fails
      }
    }

    // Delete user from DB
    delete db.users[userId];
    await saveDB(db);

    console.log(`🗑️ User ${userId} deleted`);
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error("❌ Delete account error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// GET /api/admin/users
// Backend: Express route for /api/admin/users
// GET /api/admin/users
// GET /api/admin/users
router.get("/admin/users", authenticateToken, async (req, res) => {
  try {
    // 🔒 Only allow your dev account
    if (req.user.email !== "hanlinbai667@gmail.com") {
      return res.status(403).json({ error: "Forbidden: admin access only" });
    }

    const db = await getDB();

    // 🗃️ Convert user object to array and sanitize
    const safeUsers = Object.values(db.users || {}).map((u) => ({
      id: u.id || "unknown",
      name: u.name || "—",
      email: u.email,
      createdAt: u.createdAt || null,
      lastSeen: u.lastSeen || null,
      subscription: u.subscription
        ? {
            isActive: !!u.subscription.isActive,
            plan: u.subscription.plan,
            expiresAt: u.subscription.expiresAt,
          }
        : null,
      banned: !!u.banned,
      banReason: u.banReason || null,
      restricted: !!u.restricted,
    }));

    res.json(safeUsers);
  } catch (err) {
    console.error("❌ Admin users fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Ban a user
router.post("/admin/ban", authenticateToken, async (req, res) => {
  if (req.user.email !== "hanlinbai667@gmail.com") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { userId, reason } = req.body;
  try {
    const db = await getDB();
    if (!db.users[userId]) {
      return res.status(404).json({ error: "User not found" });
    }
    db.users[userId] = {
      ...db.users[userId],
      banned: true,
      banReason: reason || "No reason provided",
      bannedAt: new Date().toISOString(),
    };
    await saveDB(db);
    res.json({ success: true });
  } catch (err) {
    console.error("Ban error:", err);
    res.status(500).json({ error: "Failed to ban user" });
  }
});

// Restrict a user (e.g., disable Plus features)
router.post("/admin/restrict", authenticateToken, async (req, res) => {
  if (req.user.email !== "hanlinbai667@gmail.com") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { userId, restricted } = req.body;
  try {
    const db = await getDB();
    if (!db.users[userId]) {
      return res.status(404).json({ error: "User not found" });
    }
    db.users[userId] = {
      ...db.users[userId],
      restricted: !!restricted,
    };
    await saveDB(db);
    res.json({ success: true });
  } catch (err) {
    console.error("Restrict error:", err);
    res.status(500).json({ error: "Failed to update restriction" });
  }
});

// 🆕 REDEEM TRIAL CODE
router.post("/redeem-trial", authenticateToken, async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  if (!code) {
    return res.status(400).json({ error: "Trial code is required" });
  }

  const db = await getDB();

  if (db.users[userId]?.subscription?.isActive) {
    return res
      .status(400)
      .json({ error: "You already have an active subscription" });
  }

  const trialCode = db.trialCodes?.[code];
  if (!trialCode) {
    return res.status(404).json({ error: "Invalid or expired trial code" });
  }

  const now = new Date();
  const expiresAt = new Date(trialCode.expiresAt);
  if (now > expiresAt) {
    return res.status(400).json({ error: "Trial code has expired" });
  }

  // ✅ Check usage count
  if (!Array.isArray(trialCode.usedBy)) trialCode.usedBy = [];
  if (trialCode.usedBy.length >= trialCode.maxUses) {
    return res
      .status(400)
      .json({ error: "This trial code has reached its usage limit" });
  }

  if (trialCode.usedBy.includes(userId)) {
    return res.status(400).json({ error: "You've already used this code" });
  }

  // Activate trial
  const maxDays = Math.min(trialCode.maxDays || 2, 2);
  const trialExpiresAt = new Date(
    now.getTime() + maxDays * 24 * 60 * 60 * 1000
  ).toISOString();

  db.users[userId] = {
    ...db.users[userId],
    subscription: {
      isActive: true,
      plan: "Trial",
      daysRemaining: maxDays,
      expiresAt: trialExpiresAt,
      stripeSubscriptionId: null,
    },
  };

  // Record usage
  trialCode.usedBy.push(userId);
  await saveDB(db);

  console.log(`✅ Trial activated for ${userId} using code ${code}`);
  res.json({ success: true, subscription: db.users[userId].subscription });
});

// 🆕 GENERATE TRIAL CODE (owner-only)
router.post("/generate-trial-code", authenticateToken, async (req, res) => {
  const { maxDays = 2, maxUses = 1 } = req.body;
  const userId = req.user.id;

  if (req.user.email !== "hanlinbai667@gmail.com") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const db = await getDB();

  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const code = `TRIAL-${randomPart}`;

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString(); // valid 7 days

  db.trialCodes = db.trialCodes || {};
  db.trialCodes[code] = {
    expiresAt,
    maxDays: Math.min(maxDays, 2),
    maxUses: Math.max(1, Math.min(10, parseInt(maxUses) || 1)), // cap at 10
    usedBy: [], // now an array!
  };

  await saveDB(db);

  console.log(
    `🆕 Generated trial code: ${code} (max ${maxDays} days, ${maxUses} uses)`
  );
  res.json({
    code,
    expiresAt,
    maxDays: Math.min(maxDays, 2),
    maxUses: Math.max(1, Math.min(10, maxUses)),
  });
});

// Create Checkout Session
router.post("/create-checkout-session", async (req, res) => {
  const { email, plan } = req.body;

  if (!email || !plan) {
    return res.status(400).json({ error: "Email and plan required" });
  }

  // Map plan to price ID
  const prices = {
    Monthly: "price_1SKPVxGsGX4c72uB5UZ1c8Vm",
    Yearly: "price_1SKPWeGsGX4c72uBxPZ6D5EI",
  };

  const priceId = prices[plan];
  if (!priceId) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        plan: plan,
        email: email,
      },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET user subscription by email
router.get("/user/:email", async (req, res) => {
  const { email } = req.params;
  const db = await getDB();
  const userId = email.split("@")[0]; // Simple ID — improve later
  const user = db.users[userId];

  if (!user) {
    return res.json({ subscription: null });
  }

  const now = new Date();
  const expiresAt = new Date(user.subscription.expiresAt);
  const daysRemaining = Math.max(
    0,
    Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24))
  );

  res.json({
    subscription: {
      ...user.subscription,
      daysRemaining,
    },
  });
});

// 🆕 SIGN UP ROUTE
router.post("/signup", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ error: "Email, password, and name are required" });
  }

  const db = await getDB();

  // Check if user already exists
  const userId = email.split("@")[0];
  if (db.users[userId]) {
    return res.status(409).json({ error: "User already exists" });
  }

  // Create new user
  const newUser = {
    id: userId,
    email,
    name,
    password: password, // ⚠️ In production, hash this with bcrypt!
    subscription: {
      isActive: false,
      plan: null,
      daysRemaining: 0,
      expiresAt: null,
      stripeSubscriptionId: null,
    },
  };

  db.users[userId] = newUser;

  // Save to DB
  await saveDB(db);

  // Generate JWT token
  const token = jwt.sign({ id: userId, email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({
    user: {
      id: userId,
      email,
      name,
    },
    token,
    subscription: newUser.subscription,
  });
});

// 🆕 LOGIN ROUTE
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const db = await getDB();
  const userId = email.split("@")[0];
  const user = db.users[userId];

  if (user.banned) {
    return res.status(403).json({ error: "Account banned", banned: true });
  }

  if (user.restricted) {
    // Optionally strip Plus features even if subscription is active
    user.subscription.isActive = false;
  }

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // ⚠️ In production, compare hashed passwords!
  if (user.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Generate JWT token
  const token = jwt.sign({ id: userId, email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({
    user: {
      id: userId,
      email,
      name: user.name,
    },
    token,
    subscription: user.subscription,
  });
});

// Update user profile
router.patch("/user/update", authenticateToken, async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user.id; // from JWT

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const db = await getDB();
    const user = db.users[userId];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update
    user.name = name;
    user.email = email;

    // Also update the key if email changed (⚠️ your current ID = email.split("@")[0])
    // For now, we assume email local part doesn't change — or you'll break the ID!
    // (In real app: use UUIDs, not email-derived IDs)

    await saveDB(db);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      message: "Profile updated successfully",
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ✅ Verify checkout session (used by frontend SuccessPage)
router.get("/verify-session/:id", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id);

    if (!session || session.payment_status !== "paid") {
      return res.json({ success: false });
    }

    const customerEmail = session.customer_details.email;
    const plan = session.metadata.plan;
    const subscriptionId = session.subscription;

    // Same logic as webhook — ensure user subscription is activated
    const days = { Monthly: 30, Yearly: 365 }[plan] || 30;
    const expiresAt = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    const db = await getDB();
    const userId = customerEmail.split("@")[0];

    if (!db.users[userId]) {
      console.warn(`⚠️ No user found for ${customerEmail}`);
      return res.status(404).json({ success: false, error: "User not found" });
    }

    db.users[userId] = {
      ...db.users[userId],
      subscription: {
        isActive: true,
        plan,
        daysRemaining: days,
        expiresAt,
        stripeSubscriptionId: subscriptionId,
      },
    };

    await saveDB(db);

    console.log(`✅ Verified and activated subscription for ${customerEmail}`);

    return res.json({ success: true });
  } catch (err) {
    console.error("Error verifying session:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook to handle successful payment
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      console.log(
        `Activating subscription for email: ${customerEmail}, userId: ${userId}`
      );
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerEmail = session.customer_details.email;
      const subscriptionId = session.subscription;

      const plan = session.metadata.plan;
      const days = {
        Monthly: 30,
        Yearly: 365,
      }[plan];

      const expiresAt = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000
      ).toISOString();

      const db = await getDB();
      const userId = customerEmail.split("@")[0];

      db.users[userId] = {
        ...db.users[userId],
        subscription: {
          isActive: true,
          plan,
          daysRemaining: days,
          expiresAt,
          stripeSubscriptionId: subscriptionId,
        },
      };

      await saveDB(db);

      console.log(`✅ Subscription activated for ${customerEmail}`);
    }

    res.json({ received: true });
  }
);

module.exports = router;
