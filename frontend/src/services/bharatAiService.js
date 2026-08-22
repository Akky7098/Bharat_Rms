import axios from "axios";

/* =========================================================
   BHARAT INTELLIGENCE API

   LOCAL DEVELOPMENT ACTIVE
========================================================= */

// const BHARAT_AI_API_URL =
//   "http://localhost:5000/api/bharat-ai";

/* =========================================================
   PRODUCTION

   Uncomment this on production and comment local URL above.
========================================================= */

const BHARAT_AI_API_URL =
  "https://bharatspecialsteels.bharatspecialsteels.com/api/bharat-ai";

/* =========================================================
   TOKEN
========================================================= */

const getToken = () => {
  const token =
    localStorage.getItem(
      "token"
    );

  return token
    ? token.trim()
    : "";
};

/* =========================================================
   AUTH HEADERS
========================================================= */

const authHeaders = () => {
  const token =
    getToken();

  if (!token) {
    return {
      "Content-Type":
        "application/json",
    };
  }

  return {
    Authorization:
      `Bearer ${token}`,

    "Content-Type":
      "application/json",
  };
};

/* =========================================================
   CURRENT LOGGED-IN USER

   GET
   /api/bharat-ai/me
========================================================= */

export const getBharatAiUser =
  async () => {
    const token =
      getToken();

    if (!token) {
      throw new Error(
        "No login token found."
      );
    }

    const response =
      await axios.get(
        `${BHARAT_AI_API_URL}/me`,
        {
          headers:
            authHeaders(),

          timeout:
            15000,
        }
      );

    return response.data;
  };

/* =========================================================
   CHAT

   POST
   /api/bharat-ai/chat
========================================================= */

export const askBharatIntelligence =
  async ({
    message,
    conversationId = null,
  }) => {
    const token =
      getToken();

    if (!token) {
      throw new Error(
        "No login token found."
      );
    }

    const cleanMessage =
      String(
        message || ""
      ).trim();

    if (!cleanMessage) {
      throw new Error(
        "Message is required."
      );
    }

    const response =
      await axios.post(
        `${BHARAT_AI_API_URL}/chat`,

        {
          message:
            cleanMessage,

          conversationId:
            conversationId ||
            null,
        },

        {
          headers:
            authHeaders(),

          timeout:
            120000,
        }
      );

    return response.data;
  };

/* =========================================================
   OPTIONAL HELPER

   Useful for debugging whether frontend
   currently has a token.
========================================================= */

export const hasBharatAiToken =
  () => {
    return Boolean(
      getToken()
    );
  };

/* =========================================================
   OPTIONAL HELPER

   Returns the exact API base URL currently in use.
   Useful during local/production debugging.
========================================================= */

export const getBharatAiApiUrl =
  () => {
    return BHARAT_AI_API_URL;
  };