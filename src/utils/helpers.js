/**
 * Run a SELECT query with positional parameters using prepared statements.
 * sql.js's exec() doesn't handle positional bind correctly, so we use prepare/step.
 *
 * @param {Database} db     - sql.js database instance
 * @param {string}   sql    - SQL query with ? placeholders
 * @param {Array}    params - values to bind
 * @returns {Array<Object>} - array of row objects
 */
function query(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

module.exports = { query };
