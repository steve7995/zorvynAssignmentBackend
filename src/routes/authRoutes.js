const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

// Public route — anyone can log in
router.post("/login", authController.login);

// Protected route — only admins can create new users
router.post("/register", authenticate, authorize("admin"), authController.register);

module.exports = router;
