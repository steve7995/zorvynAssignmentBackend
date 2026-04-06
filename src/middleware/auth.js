const jwt = require("jsonwebtoken");
const { User } = require("../models/database");

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(payload.userId);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authenticate };
