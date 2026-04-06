// This runs before any test file is loaded.
// Setting JWT_SECRET here ensures dotenv (called inside app.js) won't override it.
process.env.JWT_SECRET = "test-secret";
