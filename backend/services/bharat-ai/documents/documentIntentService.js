/* =========================================================
   BHARAT INTELLIGENCE
   DOCUMENT INTENT SERVICE

   PURPOSE

   Detect when the user is actually requesting a Bharat
   document/file rather than merely asking a question
   containing words such as brochure, PDF, DB6, MTC, etc.

   IMPORTANT

   This service:
   - does NOT access MongoDB
   - does NOT access files
   - does NOT call Gemini
   - does NOT perform authorization

   Authorization remains inside documentTools.
========================================================= */

/* =========================================================
   DOCUMENT WORDS
========================================================= */

const DOCUMENT_TERMS = [
  "brochure",
  "broucher",
  "catalogue",
  "catalog",
  "catalogue pdf",
  "catalog pdf",

  "document",
  "documents",

  "pdf",

  "mtc",
  "material test certificate",
  "test certificate",
  "certificate",

  "datasheet",
  "data sheet",

  "specification sheet",
  "spec sheet",

  "company profile",
  "product profile",

  "technical sheet",
  "technical document",
];

/* =========================================================
   REQUEST/ACTION WORDS

   These make document intent much stronger.

   Example:
   "DB6 brochure"              -> probably document
   "give me DB6 brochure"      -> definitely document

   But:
   "what is written in a brochure?"
   may need general reasoning depending on context.
========================================================= */

const DOCUMENT_REQUEST_TERMS = [
  "give me",
  "show me",
  "show",
  "find",
  "search",
  "get",
  "open",
  "download",
  "send",
  "provide",
  "share",
  "need",
  "want",
  "looking for",
];

/* =========================================================
   NORMALIZE
========================================================= */

const normalize =
  (
    value
  ) => {
    return String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        " "
      );
  };

/* =========================================================
   CONTAINS TERM
========================================================= */

const containsAny =
  (
    text,
    terms
  ) => {
    return terms.some(
      (
        term
      ) =>
        text.includes(
          term
        )
    );
  };

/* =========================================================
   DETECT DOCUMENT INTENT
========================================================= */

const detectDocumentIntent =
  (
    message
  ) => {
    const text =
      normalize(
        message
      );

    if (!text) {
      return {
        isDocumentRequest:
          false,

        confidence:
          "none",

        search:
          "",

        reason:
          "empty_message",
      };
    }

    const hasDocumentTerm =
      containsAny(
        text,
        DOCUMENT_TERMS
      );

    if (
      !hasDocumentTerm
    ) {
      return {
        isDocumentRequest:
          false,

        confidence:
          "none",

        search:
          "",

        reason:
          "no_document_term",
      };
    }

    const hasRequestTerm =
      containsAny(
        text,
        DOCUMENT_REQUEST_TERMS
      );

    /* =====================================================
       STRONG DOCUMENT INTENT
    ===================================================== */

    if (
      hasDocumentTerm &&
      hasRequestTerm
    ) {
      return {
        isDocumentRequest:
          true,

        confidence:
          "high",

        search:
          extractDocumentSearch(
            text
          ),

        reason:
          "document_and_request_terms",
      };
    }

    /* =====================================================
       SHORT DOCUMENT QUERY

       Examples:

       "bharat tool steel brochure"
       "db6 catalogue"
       "company profile pdf"

       These are almost certainly file searches even without
       "give me".
    ===================================================== */

    const words =
      text
        .split(" ")
        .filter(Boolean);

    if (
      hasDocumentTerm &&
      words.length <=
        8
    ) {
      return {
        isDocumentRequest:
          true,

        confidence:
          "medium",

        search:
          extractDocumentSearch(
            text
          ),

        reason:
          "short_document_query",
      };
    }

    return {
      isDocumentRequest:
        false,

      confidence:
        "low",

      search:
        "",

      reason:
        "document_word_without_clear_request",
    };
  };

/* =========================================================
   EXTRACT SEARCH TEXT

   We remove conversational filler while retaining useful
   document/product terms.

   Example:

   "give me bharat tool steel brochure"

   becomes approximately:

   "bharat tool steel brochure"
========================================================= */

const extractDocumentSearch =
  (
    message
  ) => {
    let text =
      normalize(
        message
      );

    const removable =
      [
        "please",
        "can you",
        "could you",
        "would you",
        "give me",
        "show me",
        "find me",
        "find",
        "search for",
        "search",
        "get me",
        "get",
        "open",
        "send me",
        "send",
        "provide me",
        "provide",
        "share with me",
        "share",
        "i need",
        "i want",
        "looking for",
      ];

    for (
      const phrase of
      removable
    ) {
      /*
       * Remove only conversational phrase.
       */

      text =
        text.replace(
          new RegExp(
            `\\b${escapeRegex(
              phrase
            )}\\b`,
            "gi"
          ),
          " "
        );
    }

    return text
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  };

/* =========================================================
   REGEX ESCAPE
========================================================= */

const escapeRegex =
  (
    value
  ) => {
    return String(
      value
    ).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
  };

/* =========================================================
   SIMPLE BOOLEAN HELPER
========================================================= */

const isDocumentRequest =
  (
    message
  ) => {
    return detectDocumentIntent(
      message
    ).isDocumentRequest;
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  detectDocumentIntent,
  isDocumentRequest,
  extractDocumentSearch,
};