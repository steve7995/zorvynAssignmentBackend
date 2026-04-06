const { Op } = require("sequelize");
const { Record } = require("../models/database");
const { requireFields, isValidDate } = require("../utils/validators");

/**
 * POST /api/records — Admin only
 */
async function createRecord(req, res) {
  const { type, amount, category, date, description } = req.body;

  const err = requireFields(req.body, ["type", "amount", "category", "date"]);
  if (err) return res.status(400).json({ error: err });

  if (!["income", "expense"].includes(type)) {
    return res.status(400).json({ error: "Type must be 'income' or 'expense'" });
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: "Amount must be a positive number" });
  }

  if (!isValidDate(date)) {
    return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });
  }

  const record = await Record.create({
    user_id: req.user.id,
    type,
    amount: numAmount,
    category: category.trim(),
    date,
    description: description || "",
  });

  res.status(201).json({ message: "Record created", record });
}

/**
 * GET /api/records — All authenticated users (with filters & pagination)
 * Query params: type, category, start_date, end_date, page, limit
 */
async function listRecords(req, res) {
  const { type, category, start_date, end_date, page = 1, limit = 20 } = req.query;

  const where = {};
  if (type) where.type = type;
  if (category) where.category = category;
  if (start_date || end_date) {
    where.date = {};
    if (start_date) where.date[Op.gte] = start_date;
    if (end_date) where.date[Op.lte] = end_date;
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await Record.findAndCountAll({
    where,
    order: [["date", "DESC"]],
    limit: limitNum,
    offset,
  });

  res.json({
    records: rows,
    pagination: { page: pageNum, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) },
  });
}

/**
 * GET /api/records/:id
 */
async function getRecord(req, res) {
  const record = await Record.findByPk(req.params.id);
  if (!record) return res.status(404).json({ error: "Record not found" });
  res.json({ record });
}

/**
 * PUT /api/records/:id — Admin only
 */
async function updateRecord(req, res) {
  const { type, amount, category, date, description } = req.body;

  const record = await Record.findByPk(req.params.id);
  if (!record) return res.status(404).json({ error: "Record not found" });

  let hasUpdate = false;

  if (type !== undefined) {
    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ error: "Type must be 'income' or 'expense'" });
    }
    record.type = type;
    hasUpdate = true;
  }

  if (amount !== undefined) {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return res.status(400).json({ error: "Amount must be positive" });
    record.amount = num;
    hasUpdate = true;
  }

  if (category !== undefined) { record.category = category.trim(); hasUpdate = true; }
  if (date !== undefined) {
    if (!isValidDate(date)) return res.status(400).json({ error: "Invalid date format" });
    record.date = date;
    hasUpdate = true;
  }
  if (description !== undefined) { record.description = description; hasUpdate = true; }

  if (!hasUpdate) return res.status(400).json({ error: "No fields to update" });

  await record.save();
  res.json({ message: "Record updated" });
}

/**
 * DELETE /api/records/:id — Admin only (soft delete via Sequelize paranoid)
 */
async function deleteRecord(req, res) {
  const record = await Record.findByPk(req.params.id);
  if (!record) return res.status(404).json({ error: "Record not found" });

  await record.destroy(); // sets deleted_at, not a real DELETE
  res.json({ message: "Record deleted (soft delete)" });
}

module.exports = { createRecord, listRecords, getRecord, updateRecord, deleteRecord };
