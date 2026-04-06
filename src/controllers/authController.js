const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models/database");
const { requireFields, isValidEmail } = require("../utils/validators");

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  const { name, email, password, role } = req.body;

  const err = requireFields(req.body, ["name", "email", "password"]);
  if (err) return res.status(400).json({ error: err });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email format" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const validRoles = ["admin", "analyst", "viewer"];
  const assignedRole = validRoles.includes(role) ? role : "viewer";

  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already exists" });

  const user = await User.create({
    name,
    email,
    password: bcrypt.hashSync(password, 10),
    role: assignedRole,
  });

  res.status(201).json({
    message: "User created",
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;

  const err = requireFields(req.body, ["email", "password"]);
  if (err) return res.status(400).json({ error: err });

  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  if (!user.is_active) return res.status(403).json({ error: "Account is deactivated" });

  const match = bcrypt.compareSync(password, user.password);
  if (!match) return res.status(401).json({ error: "Invalid email or password" });

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

  res.json({
    message: "Login successful",
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

module.exports = { register, login };
