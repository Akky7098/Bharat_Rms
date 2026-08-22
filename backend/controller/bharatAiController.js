const User =
  require("../model/userModel");

const {
  askBharatAi,
} = require(
  "../services/bharat-ai/bharatAiService"
);

/* =========================================================
   CHAT WITH BHARAT INTELLIGENCE

   POST
   /api/bharat-ai/chat
========================================================= */

const chatWithBharatAi =
  async (
    req,
    res
  ) => {
    try {
      /* ===================================================
         INPUT
      =================================================== */

      const {
        message,
        conversationId,
      } =
        req.body ||
        {};

      const cleanMessage =
        String(
          message || ""
        ).trim();

      if (
        !cleanMessage
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Message is required.",
          });
      }

      /* ===================================================
         AUTHENTICATED USER ID

         Supports both:
         req.user._id
         req.user.id
      =================================================== */

      const authenticatedUserId =
        req.user?._id ||
        req.user?.id;

      if (
        !authenticatedUserId
      ) {
        return res
          .status(401)
          .json({
            success:
              false,

            message:
              "Authentication required.",
          });
      }

      /* ===================================================
         LOAD FRESH USER

         Do not rely only on JWT payload.

         This ensures:
         - current name
         - current email
         - current role
         - disabled/deleted user cannot continue
      =================================================== */

      const requestingUser =
        await User.findById(
          authenticatedUserId
        )
          .select(
            "_id name email role"
          )
          .lean();

      if (
        !requestingUser
      ) {
        return res
          .status(401)
          .json({
            success:
              false,

            message:
              "Authenticated user not found.",
          });
      }

      /* ===================================================
         BHARAT INTELLIGENCE
      =================================================== */

      const result =
        await askBharatAi({
          message:
            cleanMessage,

          conversationId:
            conversationId ||
            null,

          requestingUser,
        });

      /* ===================================================
         RESPONSE

         Pass through all useful AI metadata.

         Frontend can use:
         - answer
         - contextual suggestions
         - documents
         - live sources
         - conversationId
         - route
      =================================================== */

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            /* =============================================
               MAIN ANSWER
            ============================================= */

            answer:
              result.answer,

            /* =============================================
               CONVERSATION MEMORY
            ============================================= */

            conversationId:
              result.conversationId ||
              conversationId ||
              null,

            /* =============================================
               REQUEST INFORMATION
            ============================================= */

            requestType:
              result.requestType ||
              null,

            route:
              result.route ||
              null,

            resolvedPeriod:
              result.resolvedPeriod ||
              null,

            clarification:
              result.clarification ||
              null,

            /* =============================================
               CONTEXTUAL FOLLOW-UP SUGGESTIONS
            ============================================= */

            suggestions:
              Array.isArray(
                result.suggestions
              )
                ? result.suggestions
                : [],

            /* =============================================
               BHARAT DOCUMENTS

               Example:
               "Give me Bharat tool steel brochure"
            ============================================= */

            documents:
              Array.isArray(
                result.documents
              )
                ? result.documents
                : [],

            /* =============================================
               LIVE WEB SOURCES

               Used when live research is enabled.
            ============================================= */

            sources:
              Array.isArray(
                result.sources
              )
                ? result.sources
                : [],

            /* =============================================
               INTERNAL EXECUTION SUMMARY

               Useful for development / audit.

               Frontend does not need to visibly display it.
            ============================================= */

            toolsUsed:
              Array.isArray(
                result.toolsUsed
              )
                ? result.toolsUsed
                : [],

            /* =============================================
               MODEL USAGE

               Useful later for admin cost dashboard.
            ============================================= */

            usage:
              result.usage || {
                inputTokens:
                  0,

                outputTokens:
                  0,

                totalTokens:
                  0,
              },

            model:
              result.model ||
              null,

            provider:
              result.provider ||
              null,

            /* =============================================
               BUSINESS CLOCK

               Useful while debugging India-time logic.
            ============================================= */

            businessClock:
              result.businessClock ||
              null,

            /* =============================================
               GENERATED TIME
            ============================================= */

            generatedAt:
              result.generatedAt ||
              new Date(),
          },
        });
    } catch (
      error
    ) {
      /* ===================================================
         SERVER LOG

         Do not return stack trace to frontend.
      =================================================== */

      console.error(
        "BHARAT INTELLIGENCE ERROR =>",
        error
      );

      const statusCode =
        Number(
          error?.statusCode
        ) ||
        500;

      /*
       * Avoid accidentally returning internal stack,
       * Mongo errors or implementation details.
       */

      let message =
        error?.message ||
        "Bharat Intelligence request failed.";

      if (
        statusCode >=
        500
      ) {
        /*
         * Keep known application errors readable,
         * but do not expose raw stack traces.
         */

        message =
          error?.message ||
          "Bharat Intelligence is temporarily unavailable.";
      }

      return res
        .status(
          statusCode
        )
        .json({
          success:
            false,

          message,
        });
    }
  };

/* =========================================================
   CURRENT LOGGED-IN AI USER

   GET
   /api/bharat-ai/me
========================================================= */

const getBharatAiCurrentUser =
  async (
    req,
    res
  ) => {
    try {
      const authenticatedUserId =
        req.user?._id ||
        req.user?.id;

      if (
        !authenticatedUserId
      ) {
        return res
          .status(401)
          .json({
            success:
              false,

            message:
              "Authentication required.",
          });
      }

      const user =
        await User.findById(
          authenticatedUserId
        )
          .select(
            "_id name email role"
          )
          .lean();

      if (!user) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "User not found.",
          });
      }

      return res
        .status(200)
        .json({
          success:
            true,

          data: {
            user: {
              id:
                user._id,

              name:
                user.name,

              email:
                user.email,

              role:
                user.role,
            },
          },
        });
    } catch (
      error
    ) {
      console.error(
        "BHARAT AI USER ERROR =>",
        error
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            "Unable to load Bharat Intelligence user.",
        });
    }
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  chatWithBharatAi,
  getBharatAiCurrentUser,
};