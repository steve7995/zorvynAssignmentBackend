const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

// Analysts and admins can access dashboard summaries
router.get("/summary", authenticate, authorize("admin", "analyst"), dashboardController.getSummary);
router.get("/category-totals", authenticate, authorize("admin", "analyst"), dashboardController.getCategoryTotals);
router.get("/monthly-trends", authenticate, authorize("admin", "analyst"), dashboardController.getMonthlyTrends);
router.get("/recent-activity", authenticate, authorize("admin", "analyst"), dashboardController.getRecentActivity);

module.exports = router;
