const { User } = require("../models/database");

/**
 * GET /api/users — Admin only
 */
async function listUsers(req, res) {
  const users = await User.findAll({
    attributes: ["id", "name", "email", "role", "is_active", "created_at", "updated_at"],
  });
  res.json({ users });
}

/**
 * GET /api/users/:id — Admin only
 */
async function getUser(req, res) {
  const user = await User.findByPk(req.params.id, {
    attributes: ["id", "name", "email", "role", "is_active", "created_at", "updated_at"],
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
}

/**
 * PATCH /api/users/:id — Admin only (update role or active status)
 */
async function updateUser(req, res) {
  const { role, is_active } = req.body;

  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (role !== undefined) {
    const validRoles = ["admin", "analyst", "viewer"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
    }
    user.role = role;
  }

  if (is_active !== undefined) {
    user.is_active = Boolean(is_active);
  }

  if (role === undefined && is_active === undefined) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  await user.save();
  res.json({ message: "User updated" });
}

/**
 * GET /api/users/me — Any authenticated user
 */
function getProfile(req, res) {
  const { id, name, email, role, is_active, created_at } = req.user;
  res.json({ user: { id, name, email, role, is_active, created_at } });
}

module.exports = { listUsers, getUser, updateUser, getProfile };
