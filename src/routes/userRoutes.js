const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

// Any logged-in user can see their own profile
router.get("/me", authenticate, userController.getProfile);

// Admin-only: list all users, get one, or update one
router.get("/", authenticate, authorize("admin"), userController.listUsers);
router.get("/:id", authenticate, authorize("admin"), userController.getUser);
router.patch("/:id", authenticate, authorize("admin"), userController.updateUser);

module.exports = router;
