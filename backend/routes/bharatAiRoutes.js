const express =
  require("express");

const router =
  express.Router();

const {
  chatWithBharatAi,
  getBharatAiCurrentUser,
} = require(
  "../controller/bharatAiController"
);

const {
  protect,
} = require(
  "../util/auth"
);

/* =========================================================
   CURRENT BHARAT INTELLIGENCE USER

   GET
   /api/bharat-ai/me
========================================================= */

router.get(
  "/me",
  protect,
  getBharatAiCurrentUser
);

/* =========================================================
   BHARAT INTELLIGENCE CHAT

   POST
   /api/bharat-ai/chat
========================================================= */

router.post(
  "/chat",
  protect,
  chatWithBharatAi
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;