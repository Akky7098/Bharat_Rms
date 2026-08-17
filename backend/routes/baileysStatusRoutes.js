const express =
  require("express");

const router =
  express.Router();

const {
  getStatus,
  showQrPage,
  getGroups,
} =
  require("../controller/baileysStatusController");

/*
 * Initial test routes.
 *
 * Add your normal auth middleware later before
 * keeping these available in production.
 */

router.get(
  "/status",
  getStatus
);

router.get(
  "/qr",
  showQrPage
);

router.get(
  "/groups",
  getGroups
);

module.exports =
  router;