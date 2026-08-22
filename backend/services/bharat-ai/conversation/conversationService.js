const crypto =
  require("crypto");

const {
  getCache,
  setCache,
  deleteCache,
  CACHE_TTL,
} = require(
  "../cache/cacheService"
);

const {
  CACHE_KEYS,
} = require(
  "../cache/cacheKeys"
);

const {
  createEmptyContext,
  sanitizeContext,
} = require(
  "./conversationStateService"
);

const MAX_CONVERSATION_MESSAGES =
  Math.max(
    4,
    Number(
      process.env
        .BHARAT_AI_CONVERSATION_MAX_MESSAGES ||
        12
    )
  );

const MAX_CONVERSATION_CHARS =
  Math.max(
    4000,
    Number(
      process.env
        .BHARAT_AI_CONVERSATION_MAX_CHARS ||
        16000
    )
  );

/* =========================================================
   ID
========================================================= */

const newConversationId = () =>
  typeof crypto.randomUUID ===
  "function"
    ? crypto.randomUUID()
    : crypto
        .randomBytes(16)
        .toString("hex");

/* =========================================================
   NORMALIZE MESSAGE
========================================================= */

const normalizeMessage = (
  message
) => {
  if (
    !message ||
    typeof message !==
      "object"
  ) {
    return null;
  }

  const role =
    message.role ===
    "assistant"
      ? "assistant"
      : message.role ===
          "user"
        ? "user"
        : null;

  if (!role) {
    return null;
  }

  const content =
    String(
      message.content ||
        ""
    ).trim();

  if (!content) {
    return null;
  }

  return {
    role,
    content,
  };
};

/* =========================================================
   TRIM
========================================================= */

const trimConversation = (
  messages
) => {
  if (
    !Array.isArray(
      messages
    )
  ) {
    return [];
  }

  const normalized =
    messages
      .map(
        normalizeMessage
      )
      .filter(Boolean)
      .slice(
        -MAX_CONVERSATION_MESSAGES
      );

  const selected = [];

  let totalChars = 0;

  for (
    let index =
      normalized.length - 1;
    index >= 0;
    index -= 1
  ) {
    const message =
      normalized[index];

    const chars =
      message.content.length;

    if (
      selected.length >
        0 &&
      totalChars +
        chars >
        MAX_CONVERSATION_CHARS
    ) {
      break;
    }

    selected.push(
      message
    );

    totalChars += chars;
  }

  return selected.reverse();
};

/* =========================================================
   GET
========================================================= */

const getConversation =
  async ({
    userId,
    conversationId,
  }) => {
    if (!conversationId) {
      return {
        conversationId:
          newConversationId(),

        messages: [],

        context:
          createEmptyContext(),
      };
    }

    const key =
      CACHE_KEYS.conversation({
        userId,
        conversationId,
      });

    try {
      const stored =
        await getCache(
          key
        );

      return {
        conversationId,

        messages:
          trimConversation(
            stored?.messages
          ),

        context:
          sanitizeContext(
            stored?.context
          ),
      };
    } catch (error) {
      console.error(
        "BHARAT AI CONVERSATION READ FAILED =>",
        error?.message ||
          error
      );

      return {
        conversationId,

        messages: [],

        context:
          createEmptyContext(),
      };
    }
  };

/* =========================================================
   SAVE
========================================================= */

const saveConversation =
  async ({
    userId,
    conversationId,
    messages,
    context,
  }) => {
    if (
      !userId ||
      !conversationId
    ) {
      return {
        messages: [],
        context:
          createEmptyContext(),
      };
    }

    const trimmed =
      trimConversation(
        messages
      );

    const safeContext =
      sanitizeContext(
        context
      );

    const key =
      CACHE_KEYS.conversation({
        userId,
        conversationId,
      });

    try {
      await setCache(
        key,
        {
          messages:
            trimmed,

          context:
            safeContext,

          updatedAt:
            new Date()
              .toISOString(),
        },
        CACHE_TTL.CONVERSATION
      );
    } catch (error) {
      console.error(
        "BHARAT AI CONVERSATION WRITE FAILED =>",
        error?.message ||
          error
      );
    }

    return {
      messages:
        trimmed,

      context:
        safeContext,
    };
  };

/* =========================================================
   CLEAR
========================================================= */

const clearConversation =
  async ({
    userId,
    conversationId,
  }) => {
    if (
      !userId ||
      !conversationId
    ) {
      return false;
    }

    try {
      await deleteCache(
        CACHE_KEYS.conversation({
          userId,
          conversationId,
        })
      );

      return true;
    } catch (error) {
      console.error(
        "BHARAT AI CONVERSATION DELETE FAILED =>",
        error?.message ||
          error
      );

      return false;
    }
  };

module.exports = {
  getConversation,
  saveConversation,
  clearConversation,
  trimConversation,
};