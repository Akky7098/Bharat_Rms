const MtcSequence = require(
  "../model/MtcSequence"
);

/* =========================================================
   PAD 2 DIGITS
========================================================= */

const pad2 = (value) =>
  String(value).padStart(
    2,
    "0"
  );


/* =========================================================
   GET YYMMDD

   Example:

   27 Aug 2026
   =>
   260827
========================================================= */

const getDatePrefix = (
  date = new Date()
) => {
  const d =
    new Date(date);

  if (
    Number.isNaN(
      d.getTime()
    )
  ) {
    throw new Error(
      "Invalid date for SBE number generation"
    );
  }

  const yy =
    String(
      d.getFullYear()
    ).slice(-2);

  const mm =
    pad2(
      d.getMonth() + 1
    );

  const dd =
    pad2(
      d.getDate()
    );

  return `${yy}${mm}${dd}`;
};


/* =========================================================
   GENERATE ONE 8-DIGIT NUMBER

   Example:

   26082711
   26082712
   ...
   26082799

   Every sequence is atomic in MongoDB.
========================================================= */

const generateDailySbeNumber =
  async (
    sequenceType,
    date = new Date()
  ) => {
    const prefix =
      getDatePrefix(date);

    /*
     * Separate counters for each number type.
     */
    const key =
      `${sequenceType}_${prefix}`;

    /*
     * Start from 10 so first atomic increment
     * returns 11.
     */
    const counter =
      await MtcSequence.findOneAndUpdate(
        {
          key,
        },

        {
          $inc: {
            sequence: 1,
          },

          $setOnInsert: {
            key,
          },
        },

        {
          new: true,
          upsert: true,
          setDefaultsOnInsert:
            true,
        }
      );

    const sequence =
      Number(
        counter.sequence
      );

    /*
     * YYMMDD + NN allows max 89 documents
     * when starting from 11.
     */
    if (
      sequence < 11 ||
      sequence > 99
    ) {
      throw new Error(
        `SBE number limit reached for ${prefix}. Maximum sequence is 99.`
      );
    }

    const number =
      `${prefix}${pad2(
        sequence
      )}`;

    if (
      !/^\d{8}$/.test(
        number
      )
    ) {
      throw new Error(
        "Generated SBE number is invalid"
      );
    }

    return number;
  };


/* =========================================================
   FERTIGUNGSAUFTRAG

   Example:
   26082711
========================================================= */

const generateSbeProductionOrder =
  async (
    date = new Date()
  ) => {
    return generateDailySbeNumber(
      "sbe_production",
      date
    );
  };


/* =========================================================
   KUNDENBESTELLNUMMER

   Uses another independent sequence.

   Example:
   26082711

   This may numerically match the production number because
   they are separate document-number categories.

   If you want BOTH numbers themselves to always be different,
   use one shared counter instead. See below.
========================================================= */

const generateSbeCustomerPoNumber =
  async (
    date = new Date()
  ) => {
    return generateDailySbeNumber(
      "sbe_customer_order",
      date
    );
  };


module.exports = {
  getDatePrefix,

  generateDailySbeNumber,

  generateSbeProductionOrder,

  generateSbeCustomerPoNumber,
};