const express = require("express");
const router = express.Router();

const dispatchController = require("../controller/dispatchController");
const authMiddleware = require("../util/auth");

/* CREATE DISPATCH */
router.post(
  "/create",
  authMiddleware,
  dispatchController.createDispatch
);

/* UPDATE DISPATCH */
router.put(
  "/update/:id",
  authMiddleware,
  dispatchController.updateDispatch
);

/* GET SINGLE DISPATCH */
router.get(
  "/:id",
  authMiddleware,
  dispatchController.getDispatchById
);

/* GET ALL DISPATCHES */
router.get(
  "/",
  authMiddleware,
  dispatchController.getAllDispatches
);

module.exports = router;