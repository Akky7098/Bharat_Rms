const mongoose = require("mongoose");

const {
  MtcCertificate,
} = require("./MtcCertificate");

/* =========================================================
   SBE GERMANY MTC SCHEMA

   IMPORTANT:

   Field names remain ENGLISH in MongoDB/frontend.

   The PDF template converts the visible labels into German.

   Example:

   customerName -> Kunde
   grade -> Werkstoff
   productionOrder -> Fertigungsauftrag
   customerPoNumber -> Kundenbestellnummer
   dimension -> Abmessung
   hardnessBHN -> Härteprüfung
========================================================= */

const sbeGermanySchema =
  new mongoose.Schema(
    {
      /* =====================================================
         TOP MATERIAL INFORMATION
      ===================================================== */

      position: {
        type: String,
        default: "577",
        trim: true,
      },

      quantity: {
        type: String,
        default: "1",
        trim: true,
      },

      quantityUnit: {
        type: String,
        default: "ST",
        trim: true,
      },

      /* =====================================================
         STEEL PRODUCTION INFORMATION
      ===================================================== */

      meltingMethod: {
        type: String,
        default: "Elektrostahl",
        trim: true,
      },

      castingProcess: {
        type: String,
        default: "Blockguß",
        trim: true,
      },

      /*
       * Normally same as grade.
       *
       * Example:
       * 1.2714
       */
      materialCode: {
        type: String,
        default: "",
        trim: true,
      },

      /*
       * Original German:
       * Fertigungsauftrag
       */
      productionOrder: {
        type: String,
        default: "",
        trim: true,
      },

      /* =====================================================
         MATERIAL DESCRIPTION
      ===================================================== */

      /*
       * Example:
       * Wst 1.2714 geschmiedet
       */
      materialDescription: {
        type: String,
        default: "",
        trim: true,
      },

      /*
       * Example:
       * Rest-uhd Anschnittstucke
       */
      materialRemark: {
        type: String,
        default: "Rest-uhd Anschnittstucke",
        trim: true,
      },

      /*
       * Original German:
       * Ausführung
       *
       * Normally same as grade.
       */
      execution: {
        type: String,
        default: "",
        trim: true,
      },

      /*
       * We retain this provider-specific name
       * while also mapping common poNo.
       */
      customerPoNumber: {
        type: String,
        default: "",
        trim: true,
      },

      /*
       * Original German:
       * Abmessung
       *
       * Example:
       * Dia 310x4800mm
       */
      dimension: {
        type: String,
        default: "",
        trim: true,
      },

      /* =====================================================
         HARDNESS
      ===================================================== */

      hardnessBHN: {
        type: String,
        default: "",
        trim: true,
      },

      /* =====================================================
         REMARK / TEST VALUES
      ===================================================== */

      ultrasonicTest: {
        type: String,
        default: "Ok",
        trim: true,
      },

      cleanlinessRating: {
        type: String,
        default: "Ok",
        trim: true,
      },

      meltingProcess: {
        type: String,
        default: "EAF+LHF+VD",
        trim: true,
      },

      macroMicroStructure: {
        type: String,
        default: "Ok",
        trim: true,
      },

      /* =====================================================
         OPTIONAL CHEMICAL ORDER

         Allows you to retain exact element order
         for the German TC.
      ===================================================== */

      chemicalOrder: {
        type: [String],

        default: [
          "C",
          "Si",
          "Mn",
          "Cr",
          "S",
          "P",
          "V",
          "Mo",
          "Ni",
          "Al",
          "Cu",
        ],
      },
    },
    
  );

/* =========================================================
   DISCRIMINATOR MODEL
========================================================= */

const SbeGermanyMtcCertificate =
  mongoose.models.SbeGermanyMtcCertificate ||
  MtcCertificate.discriminator(
    "SbeGermanyMtcCertificate",
    sbeGermanySchema,
    "sbe_germany"
  );

module.exports =
  SbeGermanyMtcCertificate;