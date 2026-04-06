/**
 * Validates that required fields exist and are non-empty strings.
 */
function requireFields(body, fields) {
  const missing = [];
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || String(body[f]).trim() === "") {
      missing.push(f);
    }
  }
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }
  return null;
}

/**
 * Validates an email address (basic check).
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates a date string (YYYY-MM-DD).
 */
function isValidDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
}

module.exports = { requireFields, isValidEmail, isValidDate };
