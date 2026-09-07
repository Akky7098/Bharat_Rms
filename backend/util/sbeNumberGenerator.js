const MtcSequence = require(
  "../model/MtcSequence"
);

/* =========================================================
   FILE:
   util/sbeNumberGenerator.js

   PURPOSE:

   Generate two independent 8-digit SBE numbers.

   Example:

   MTC 1
   Fertigungsauftrag:
   48372190

   Kundenbestellnummer:
   38673166


   MTC 2
   Fertigungsauftrag:
   48372191

   Kundenbestellnummer:
   38673167


   RULES:

   - Both streams start from different random 8-digit numbers.
   - Random start happens only once per stream.
   - Every new MTC increases each number by +1.
   - MongoDB stores the counters permanently.
   - No daily reset.
   - No date prefix.
   - No 99-number limit.
   - No duplicate within each sequence.
   - Survives backend restart / redeploy.
========================================================= */


/* =========================================================
   COUNTER KEYS

   These remain permanently stored in MongoDB.
========================================================= */

const PRODUCTION_COUNTER_KEY =
  "sbe_production_8_digit";

const CUSTOMER_PO_COUNTER_KEY =
  "sbe_customer_po_8_digit";


/* =========================================================
   VALID 8-DIGIT RANGE
========================================================= */

const MIN_8_DIGIT =
  10000000;

const MAX_8_DIGIT =
  99999999;


/* =========================================================
   SAFE RANDOM START RANGE

   We intentionally do not start too near 99999999
   so the counters have a large amount of headroom.
========================================================= */

const RANDOM_START_MIN =
  20000000;

const RANDOM_START_MAX =
  80000000;


/* =========================================================
   GENERATE RANDOM 8-DIGIT NUMBER

   IMPORTANT:

   Random is used only when a counter does
   not already exist in MongoDB.
========================================================= */

const generateRandom8DigitNumber =
  () => {
    return Math.floor(
      Math.random() *
        (
          RANDOM_START_MAX -
          RANDOM_START_MIN +
          1
        )
    ) +
      RANDOM_START_MIN;
  };


/* =========================================================
   VALIDATE 8-DIGIT NUMBER
========================================================= */

const isValid8DigitNumber =
  (
    value
  ) => {
    const number =
      Number(
        value
      );

    return (
      Number.isInteger(
        number
      ) &&
      number >=
        MIN_8_DIGIT &&
      number <=
        MAX_8_DIGIT
    );
  };


/* =========================================================
   FIND EXISTING COUNTER
========================================================= */

const findCounter =
  async (
    key
  ) => {
    return MtcSequence.findOne(
      {
        key,
      }
    );
  };


/* =========================================================
   CHECK WHETHER A RANDOM START COLLIDES

   We keep the two initial starting ranges independent.

   This check protects against accidentally starting both
   streams at the same number.
========================================================= */

const isStartingNumberAlreadyUsed =
  async (
    randomStart
  ) => {
    const existing =
      await MtcSequence.findOne(
        {
          sequence: {
            $in: [
              randomStart,
              randomStart - 1,
            ],
          },
        }
      );

    return Boolean(
      existing
    );
  };


/* =========================================================
   GET UNIQUE RANDOM START

   Very small chance of collision, but we still verify it.
========================================================= */

const getUniqueRandomStart =
  async () => {
    const MAX_ATTEMPTS =
      20;

    for (
      let attempt = 1;
      attempt <=
        MAX_ATTEMPTS;
      attempt += 1
    ) {
      const randomStart =
        generateRandom8DigitNumber();

      const alreadyUsed =
        await isStartingNumberAlreadyUsed(
          randomStart
        );

      if (
        !alreadyUsed
      ) {
        return randomStart;
      }
    }

    throw new Error(
      "Unable to generate unique SBE 8-digit starting number"
    );
  };


/* =========================================================
   ENSURE COUNTER EXISTS

   Example:

   random start:
   48372190

   Mongo stores:
   48372189

   First increment:
   48372190

   Second increment:
   48372191
========================================================= */

const ensureCounterExists =
  async (
    key
  ) => {
    const existing =
      await findCounter(
        key
      );

    if (
      existing
    ) {
      return existing;
    }

    const randomStart =
      await getUniqueRandomStart();

    /*
     * Store one number before the actual first
     * generated document number.
     */
    const initialSequence =
      randomStart -
      1;

    try {
      const created =
        await MtcSequence.create(
          {
            key,

            sequence:
              initialSequence,
          }
        );

      console.log(
        "SBE NUMBER COUNTER CREATED =>",
        {
          key,

          firstNumber:
            randomStart,
        }
      );

      return created;
    } catch (
      error
    ) {
      /*
       * If two requests try to create the
       * same counter simultaneously, another
       * request may win first.
       */
      if (
        error?.code ===
        11000
      ) {
        const existingAfterRace =
          await findCounter(
            key
          );

        if (
          existingAfterRace
        ) {
          return existingAfterRace;
        }
      }

      throw error;
    }
  };


/* =========================================================
   GET NEXT NUMBER

   Mongo $inc is atomic.

   This prevents duplicate numbers if multiple
   certificates are created at nearly the same time.
========================================================= */

const generateNextNumber =
  async (
    key
  ) => {
    await ensureCounterExists(
      key
    );

    const counter =
      await MtcSequence
        .findOneAndUpdate(
          {
            key,
          },

          {
            $inc: {
              sequence:
                1,
            },
          },

          {
            new:
              true,
          }
        );

    if (
      !counter
    ) {
      throw new Error(
        `Unable to generate SBE number for ${key}`
      );
    }

    const generatedNumber =
      Number(
        counter.sequence
      );

    if (
      !isValid8DigitNumber(
        generatedNumber
      )
    ) {
      throw new Error(
        `SBE 8-digit number range exhausted for ${key}`
      );
    }

    return String(
      generatedNumber
    );
  };


/* =========================================================
   FERTIGUNGSAUFTRAG

   Example:

   48372190
   48372191
   48372192
========================================================= */

const generateSbeProductionOrder =
  async () => {
    return generateNextNumber(
      PRODUCTION_COUNTER_KEY
    );
  };


/* =========================================================
   KUNDENBESTELLNUMMER

   Independent series.

   Example:

   38673166
   38673167
   38673168
========================================================= */

const generateSbeCustomerPoNumber =
  async () => {
    return generateNextNumber(
      CUSTOMER_PO_COUNTER_KEY
    );
  };


/* =========================================================
   GENERATE BOTH DOCUMENT NUMBERS

   REQUIRED BY:
   services/sbeGermanyMtcService.js

   Example return:

   {
     productionOrder:
       "48372190",

     customerPoNumber:
       "38673166"
   }
========================================================= */

const generateSbeDocumentNumbers =
  async () => {
    /*
     * Run sequentially.
     *
     * Easier to diagnose and keeps behaviour predictable.
     */
    const productionOrder =
      await generateSbeProductionOrder();

    let customerPoNumber =
      await generateSbeCustomerPoNumber();

    /*
     * Extra protection:
     *
     * Two independent random sequences should almost
     * never meet, but if they ever produce the same
     * number, advance customer PO once more.
     */
    if (
      productionOrder ===
      customerPoNumber
    ) {
      customerPoNumber =
        await generateSbeCustomerPoNumber();
    }

    console.log(
      "SBE DOCUMENT NUMBERS GENERATED =>",
      {
        productionOrder,

        customerPoNumber,
      }
    );

    return {
      productionOrder,

      customerPoNumber,
    };
  };


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  generateSbeProductionOrder,

  generateSbeCustomerPoNumber,

  generateSbeDocumentNumbers,
};