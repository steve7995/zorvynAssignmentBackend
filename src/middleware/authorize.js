/**
 * Middleware factory: restricts access to certain roles.
 *
 * Usage:  router.post("/records", authorize("admin"), controller.create);
 *
 * @param  {...string} allowedRoles  e.g. "admin", "analyst"
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${allowedRoles.join(", ")}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
}

module.exports = { authorize };
