const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const fs = require("fs-extra");
const path = require("path");

const router = express.Router();

// Load DB
const DB_PATH = path.join(__dirname, "..", "db.json");

const getDB = async () => {
  const data = await fs.readJson(DB_PATH);
  return data;
};

const saveDB = async (data) => {
  await fs.writeJson(DB_PATH, data, { spaces: 2 });
};

// Create Checkout Session
router.post("/create-checkout-session", async (req, res) => {
  const { email, plan } = req.body;

  if (!email || !plan) {
    return res.status(400).json({ error: "Email and plan required" });
  }

  // Map plan to price ID (you can set these up in Stripe Dashboard)
  const prices = {
    Monthly: "price_1SKPVxGsGX4c72uB5UZ1c8Vm", // ← Replace with real Stripe Price IDs
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
      success_url: "http://localhost:5173/success",
      cancel_url: "http://localhost:5173/premium",
      metadata: {
        plan: plan, // 👈 "Monthly" or "Yearly"
        email: email,
      },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: err.message }); // ✅ use 'err'
  }
});

if (event.type === "checkout.session.completed") {
  const session = event.data.object;

  const customerEmail = session.customer_details.email;
  const subscriptionId = session.subscription;
  const plan = session.metadata.plan; // 👈 Now we get the real plan!

  // Map frontend plan names to days
  const days = {
    Monthly: 30,
    Yearly: 365,
  }[plan];

  if (days == null) {
    console.error("Unknown plan in webhook:", plan);
    return res.json({ received: true }); // still acknowledge
  }

  const expiresAt = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString();
  const userId = customerEmail.split("@")[0];

  const db = await getDB();
  db.users[userId] = {
    email: customerEmail,
    subscription: {
      isActive: true,
      plan, // e.g., "Monthly"
      daysRemaining: days,
      expiresAt,
      stripeSubscriptionId: subscriptionId,
    },
  };

  await saveDB(db);
  console.log(`✅ Subscription activated for ${customerEmail} (${plan})`);
}

// GET user subscription by email (for frontend to check status)
router.get("/user/:email", async (req, res) => {
  const { email } = req.params;
  const db = await getDB();
  const userId = email.split("@")[0];
  const user = db.users[userId];

  if (!user) {
    return res.json({ subscription: null });
  }

  // Calculate days remaining
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

// Webhook to handle successful payment
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const customerEmail = session.customer_details.email;
      const subscriptionId = session.subscription;

      // In real app, fetch plan details from Stripe
      const plan = "1 Month"; // ← Simplified; use metadata or lookup from Stripe

      const days = {
        "1 Month": 30,
        "3 Months": 90,
        "6 Months": 180,
        "1 Year": 365,
      }[plan];

      const expiresAt = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000
      ).toISOString();

      const db = await getDB();
      const userId = customerEmail.split("@")[0]; // Simple ID — improve later

      db.users[userId] = {
        email: customerEmail,
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
