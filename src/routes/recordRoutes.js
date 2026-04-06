const express = require("express");
const router = express.Router();
const recordController = require("../controllers/recordController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");

// All authenticated users can read records
router.get("/", authenticate, authorize("admin", "analyst", "viewer"), recordController.listRecords);
router.get("/:id", authenticate, authorize("admin", "analyst", "viewer"), recordController.getRecord);

// Only admins can create, update, and delete
router.post("/", authenticate, authorize("admin"), recordController.createRecord);
router.put("/:id", authenticate, authorize("admin"), recordController.updateRecord);
router.delete("/:id", authenticate, authorize("admin"), recordController.deleteRecord);

module.exports = router;
