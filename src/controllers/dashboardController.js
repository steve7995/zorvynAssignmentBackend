const { QueryTypes } = require("sequelize");
const { sequelize, Record, User } = require("../models/database");

/**
 * GET /api/dashboard/summary
 */
async function getSummary(req, res) {
  const totalIncome = (await Record.sum("amount", { where: { type: "income" } })) || 0;
  const totalExpenses = (await Record.sum("amount", { where: { type: "expense" } })) || 0;

  res.json({ totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses });
}

/**
 * GET /api/dashboard/category-totals
 */
async function getCategoryTotals(req, res) {
  const results = await sequelize.query(
    `SELECT category, type, SUM(amount) as total, COUNT(*) as count
     FROM records
     WHERE deleted_at IS NULL
     GROUP BY category, type
     ORDER BY total DESC`,
    { type: QueryTypes.SELECT }
  );
  res.json({ categoryTotals: results });
}

/**
 * GET /api/dashboard/monthly-trends
 */
async function getMonthlyTrends(req, res) {
  const results = await sequelize.query(
    `SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total, COUNT(*) as count
     FROM records
     WHERE deleted_at IS NULL AND date >= date('now', '-12 months')
     GROUP BY month, type
     ORDER BY month ASC`,
    { type: QueryTypes.SELECT }
  );
  res.json({ monthlyTrends: results });
}

/**
 * GET /api/dashboard/recent-activity
 */
async function getRecentActivity(req, res) {
  const records = await Record.findAll({
    include: [{ model: User, as: "user", attributes: ["name"] }],
    order: [["created_at", "DESC"]],
    limit: 10,
  });
  res.json({ recentActivity: records });
}

module.exports = { getSummary, getCategoryTotals, getMonthlyTrends, getRecentActivity };
