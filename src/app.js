require("dotenv").config();

const express = require("express");
const { initDB } = require("./models/database");
const { seedDefaultAdmin } = require("./models/seed");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const recordRoutes = require("./routes/recordRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { setupSwagger } = require("./swagger");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Global middleware ──
app.use(express.json());


// ── Health check ──
app.get("/", (req, res) => {
  res.json({
    message: "Finance Dashboard API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth/login, /api/auth/register",
      users: "/api/users",
      records: "/api/records",
      dashboard: "/api/dashboard/summary, /category-totals, /monthly-trends, /recent-activity",
    },
  });
});

// ── Swagger Docs ──
setupSwagger(app);

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err); 
  res.status(500).json({ error: "Internal server error" });
});


// ── Start server ──
async function start() {
  await initDB();
  seedDefaultAdmin();

  app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
  });
}

// Only start the server when this file is run directly (not imported by tests)
if (require.main === module) {
  start();
}

module.exports = app;
