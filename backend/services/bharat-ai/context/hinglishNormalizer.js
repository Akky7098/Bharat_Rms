/* =========================================================
   BHARAT INTELLIGENCE
   HINGLISH / BUSINESS LANGUAGE NORMALIZER

   PURPOSE:
   Normalize common conversational variations ONLY for
   routing/context understanding.

   IMPORTANT:
   The original user message is still sent to Gemini.
   We do not rewrite the user's visible message.
========================================================= */

const normalizeSpaces = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

/* =========================================================
   MAIN NORMALIZER
========================================================= */

const normalizeHinglish = (message) => {
  let text = normalizeSpaces(message).toLowerCase();

  if (!text) {
    return "";
  }

  /* =======================================================
     DATE LANGUAGE
  ======================================================= */

  text = text
    .replace(
      /\b(aaj|aj|aaj ka|aaj ki|aaj ke)\b/g,
      " today "
    )

    .replace(
      /\b(kal ka|kal ki|kal ke)\b/g,
      " yesterday "
    )

    .replace(
      /\b(parso|parson)\b/g,
      " day before yesterday "
    )

    .replace(
      /\b(is mahine|iss mahine|is month|iss month)\b/g,
      " this month "
    )

    .replace(
      /\b(pichle mahine|pichhla mahina|pichla mahina)\b/g,
      " last month "
    )

    .replace(
      /\b(is hafte|iss hafte|is week|iss week)\b/g,
      " this week "
    )

    .replace(
      /\b(pichle hafte|pichhla hafta|pichla hafta)\b/g,
      " last week "
    );

  /* =======================================================
     SELF
  ======================================================= */

  text = text
    .replace(
      /\b(maine|main ne|mera|meri|mere|mujhe|mera khud ka)\b/g,
      " my "
    )

    .replace(
      /\b(humne|hamne|humara|hamara)\b/g,
      " our "
    );

  /* =======================================================
     COMMON ACTION WORDS
  ======================================================= */

  text = text
    .replace(
      /\b(banaye|bnaye|banae|banaya|bnaya|banayi|bnae)\b/g,
      " created "
    )

    .replace(
      /\b(kitne|kitna|kitni)\b/g,
      " how many "
    )

    .replace(
      /\b(dikhao|dikha do|show karo|dikhana)\b/g,
      " show "
    )

    .replace(
      /\b(batao|btao|bata do|batana)\b/g,
      " tell "
    )

    .replace(
      /\b(kya kiya|kya kia|kya work kiya)\b/g,
      " what did do "
    )

    .replace(
      /\b(kaam|kam)\b/g,
      " work "
    )

    .replace(
      /\b(pura|poora|puri|saara|sara)\b/g,
      " full "
    )

    .replace(
      /\b(details?|detail mein|detail me)\b/g,
      " detail "
    );

  /* =======================================================
     BUSINESS MODULE WORDS
  ======================================================= */

  text = text
    .replace(
      /\b(sales orders?|sale orders?|salesorder|s\/o)\b/g,
      " sales order "
    )

    .replace(
      /\b(enquiries|enquirys|inquiries|inquiry)\b/g,
      " enquiry "
    )

    .replace(
      /\b(receivables|outstanding payments?)\b/g,
      " receivable "
    )

    .replace(
      /\b(dispatches)\b/g,
      " dispatch "
    )

    .replace(
      /\b(cold calls?)\b/g,
      " cold call "
    )

    .replace(
      /\b(visits?)\b/g,
      " visit "
    );

  /* =======================================================
     FOLLOW-UP LANGUAGE
  ======================================================= */

  text = text
    .replace(
      /\b(aur|or what about)\b/g,
      " what about "
    )

    .replace(
      /\b(sirf|only)\b/g,
      " only "
    )

    .replace(
      /\b(pending wale|pending wala|pending wali)\b/g,
      " pending only "
    )

    .replace(
      /\b(kyu|kyun|kyon)\b/g,
      " why "
    );

  return normalizeSpaces(text);
};

/* =========================================================
   SELF REFERENCE
========================================================= */

const refersToSelf = (message) => {
  const raw = String(message || "").toLowerCase();

  return /\b(i|me|my|mine|maine|main ne|mera|meri|mere|mujhe)\b/.test(
    raw
  );
};

/* =========================================================
   DETAIL LEVEL
========================================================= */

const detectDetailLevel = (message) => {
  const text = normalizeHinglish(message);

  if (
    /\b(full detail|full details|complete detail|complete details|show all)\b/.test(
      text
    )
  ) {
    return "full";
  }

  if (
    /\b(detail|details)\b/.test(
      text
    )
  ) {
    return "detailed";
  }

  return null;
};

module.exports = {
  normalizeHinglish,
  refersToSelf,
  detectDetailLevel,
};