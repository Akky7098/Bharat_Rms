const mongoose = require("mongoose");

const {
  MtcCertificate,
} = require("./MtcCertificate");

/* =========================================================
   COMMON FIELD HELPERS
========================================================= */

const textField = {
  type: String,
  default: "",
  trim: true,
};

const dashTextField = {
  type: String,
  default: "-",
  trim: true,
};

/* =========================================================
   ITEM DESCRIPTION ROW
========================================================= */

const bharatItemSchema =
  new mongoose.Schema(
    {
      heatNo: {
        type: String,
        required: true,
        trim: true,
      },

      size: {
        type: String,
        required: true,
        trim: true,
      },

      noOfPcs: {
        type: String,
        default: "-",
        trim: true,
      },

      quantityInKgs: {
        type: String,
        required: true,
        trim: true,
      },

      remarks: {
        type: String,
        default: "-",
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   CHEMICAL COMPOSITION VALUES
========================================================= */

/*
 * One object contains the achieved chemical
 * values for one heat number.
 */
const chemicalValuesSchema =
  new mongoose.Schema(
    {
      c: dashTextField,
      si: dashTextField,
      mn: dashTextField,
      p: dashTextField,
      s: dashTextField,
      cr: dashTextField,
      mo: dashTextField,
      ni: dashTextField,
      al: dashTextField,
      cu: dashTextField,
      ti: dashTextField,
      v: dashTextField,
      nb: dashTextField,
      b: dashTextField,
    },
    {
      _id: false,
    }
  );

/*
 * One chemical row is generated for every heat.
 *
 * Example:
 *
 * {
 *   heatNo: "BSSPL-592",
 *   rowLabel: "ACHIEVED",
 *   values: {
 *     c: "0.430",
 *     si: "0.242"
 *   }
 * }
 */
const chemicalCompositionRowSchema =
  new mongoose.Schema(
    {
      heatNo: {
        type: String,
        required: true,
        trim: true,
      },

      rowLabel: {
        type: String,
        default: "ACHIEVED",
        trim: true,
        uppercase: true,
      },

      values: {
        type: chemicalValuesSchema,
        default: () => ({}),
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   FIXED MECHANICAL PROPERTY CONFIGURATION
========================================================= */

const hardnessConfigurationSchema =
  new mongoose.Schema(
    {
      heading: {
        type: String,
        default: "HARDNESS (BHN)",
        trim: true,
      },

      standard: {
        type: String,
        default:
          "IS:1608 ASTM A370 AS NORMALIZED CONDITION",
        trim: true,
      },

      specMin: {
        type: String,
        default: "-",
        trim: true,
      },

      specMax: {
        type: String,
        default: "-",
        trim: true,
      },

      sampleRemark: {
        type: String,
        default: "ONLY H&T SAMPLE",
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

const mechanicalPropertyConfigurationSchema =
  new mongoose.Schema(
    {
      heading: {
        type: String,
        default: "",
        trim: true,
      },

      unit: {
        type: String,
        default: "",
        trim: true,
      },

      specMin: {
        type: String,
        default: "-",
        trim: true,
      },

      specMax: {
        type: String,
        default: "-",
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

const mechanicalPropertiesSchema =
  new mongoose.Schema(
    {
      hardness: {
        type:
          hardnessConfigurationSchema,
        default: () => ({}),
      },

      tensileStrength: {
        type:
          mechanicalPropertyConfigurationSchema,

        default: () => ({
          heading:
            "TENSILE STRENGTH",

          unit: "N/mm²",

          specMin: "-",
          specMax: "-",
        }),
      },

      yieldStrength: {
        type:
          mechanicalPropertyConfigurationSchema,

        default: () => ({
          heading:
            "YIELD STRENGTH",

          unit: "N/mm²",

          specMin: "-",
          specMax: "-",
        }),
      },

      elongation: {
        type:
          mechanicalPropertyConfigurationSchema,

        default: () => ({
          heading: "EL. (%)",
          unit: "%",
          specMin: "-",
          specMax: "-",
        }),
      },

      impactStrength: {
        type:
          mechanicalPropertyConfigurationSchema,

        default: () => ({
          heading:
            "IS:1757 IMPACT STRENGTH CHARPY V-NOTCH",

          unit: "Joules",

          specMin: "-",
          specMax: "-",
        }),
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   HEAT-WISE MECHANICAL RESULT
========================================================= */

/*
 * One actual mechanical result row per heat.
 *
 * Example:
 *
 * {
 *   heatNo: "BSSPL-592",
 *   rowLabel: "ACHIEVED",
 *   hardness: "-",
 *   tensileStrength: "850",
 *   yieldStrength: "650"
 * }
 */
const mechanicalResultRowSchema =
  new mongoose.Schema(
    {
      heatNo: {
        type: String,
        required: true,
        trim: true,
      },

      rowLabel: {
        type: String,
        default: "ACHIEVED",
        trim: true,
        uppercase: true,
      },

      hardness: dashTextField,

      tensileStrength:
        dashTextField,

      yieldStrength:
        dashTextField,

      elongation:
        dashTextField,

      impactStrength:
        dashTextField,
    },
    {
      _id: false,
    }
  );

/* =========================================================
   RAW MATERIAL DETAIL
========================================================= */

const rawMaterialDetailSchema =
  new mongoose.Schema(
    {
      source: textField,

      reference: textField,
    },
    {
      _id: false,
    }
  );

/* =========================================================
   HARDENABILITY DISTANCE
========================================================= */

const hardenabilityDistanceSchema =
  new mongoose.Schema(
    {
      distance: {
        type: String,
        required: true,
        trim: true,
      },

      specMin: {
        type: String,
        default: "-",
        trim: true,
      },

      specMax: {
        type: String,
        default: "-",
        trim: true,
      },

      achieved: {
        type: String,
        default: "-",
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

const hardenabilityTestSchema =
  new mongoose.Schema(
    {
      standard: {
        type: String,
        default:
          "IS: 3848, ASTM A255, SAE J406",
        trim: true,
      },

      distances: {
        type: [
          hardenabilityDistanceSchema,
        ],

        default: [],
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   ULTRASONIC TESTING
========================================================= */

const ultrasonicTestingSchema =
  new mongoose.Schema(
    {
      heading: {
        type: String,
        default:
          "Ultrasonic Testing (As Per ASTM A388)",
        trim: true,
      },

      referenceStandard: {
        type: String,
        default: "ASTM A388",
        trim: true,
      },

      acceptance: {
        type: String,
        default: "4MM FBH, 2MHZ",
        trim: true,
      },

      probeUsed: {
        type: String,
        default: "24MM",
        trim: true,
      },

      result: {
        type: String,
        default:
          "100% SATISFACTORY",
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   GAS ANALYSIS
========================================================= */

const gasValueSchema =
  new mongoose.Schema(
    {
      required: {
        type: String,
        default: "-",
        trim: true,
      },

      actual: {
        type: String,
        default: "-",
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

const gasAnalysisSchema =
  new mongoose.Schema(
    {
      o2: {
        type: gasValueSchema,
        default: () => ({}),
      },

      n2: {
        type: gasValueSchema,
        default: () => ({}),
      },

      h2: {
        type: gasValueSchema,
        default: () => ({}),
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   DEPTH OF DECARBONIZATION
========================================================= */

const depthOfDecarbonizationSchema =
  new mongoose.Schema(
    {
      standard: {
        type: String,
        default:
          "IS 6396 / ASTM E1077",
        trim: true,
      },

      mixupTesting: {
        type: String,
        default: "OK",
        trim: true,
      },

      microstructure: {
        type: String,
        default:
          "Pearlite + Ferrite",
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   INCLUSION RATING
========================================================= */

const inclusionRowSchema =
  new mongoose.Schema(
    {
      a: textField,
      b: textField,
      c: textField,
      d: textField,
    },
    {
      _id: false,
    }
  );

const inclusionRatingSchema =
  new mongoose.Schema(
    {
      standard: {
        type: String,
        default:
          "IS:4163 / ASTM E45 / JIS G0555",
        trim: true,
      },

      specified: {
        type: inclusionRowSchema,
        default: () => ({}),
      },

      thin: {
        type: inclusionRowSchema,

        default: () => ({
          a: "1.5",
          b: "1.0",
          c: "0.5",
          d: "1.0",
        }),
      },

      thick: {
        type: inclusionRowSchema,

        default: () => ({
          a: "1.0",
          b: "0.5",
          c: "0.5",
          d: "0.5",
        }),
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   GRAIN SIZE
========================================================= */

const grainSizeSchema =
  new mongoose.Schema(
    {
      specified: {
        type: String,
        default: "5-8",
        trim: true,
      },

      achieved: {
        type: String,
        default: "",
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   PHYSICAL TESTING
========================================================= */

const physicalTestingSchema =
  new mongoose.Schema(
    {
      sdt: {
        type: String,
        default: "N/A",
        trim: true,
      },

      coldBendTest: {
        type: String,
        default: "N/A",
        trim: true,
      },

      surface: {
        type: String,
        default: "-",
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   BHARAT PROVIDER SCHEMA
========================================================= */

const bharatMtcSchema =
  new mongoose.Schema(
    {
      /* =====================================================
         HEADER INFORMATION
      ===================================================== */

      tcNo: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      issueDate: {
        type: Date,
        required: true,
        index: true,
      },

      tdcNo: {
        type: String,
        default: "N/A",
        trim: true,
      },

      /*
       * invoiceNo already exists in the
       * base MtcCertificate schema.
       *
       * Do not redefine it here.
       */

      purchaseSpecification: {
        type: String,
        required: true,
        trim: true,
      },

      product: {
        type: String,
        required: true,
        trim: true,
      },

      manufacturingRoute: {
        type: String,
        required: true,
        trim: true,
      },

      /* =====================================================
         ITEM DESCRIPTION
      ===================================================== */

      items: {
        type: [bharatItemSchema],
        required: true,

        validate: {
          validator(value) {
            return (
              Array.isArray(value) &&
              value.length > 0
            );
          },

          message:
            "At least one item description row is required",
        },
      },

      /* =====================================================
         HEAT-WISE CHEMICAL COMPOSITION
      ===================================================== */

      chemicalCompositions: {
        type: [
          chemicalCompositionRowSchema,
        ],

        default: [],

        validate: {
          validator(value) {
            return Array.isArray(value);
          },

          message:
            "Chemical compositions must be an array",
        },
      },

      /* =====================================================
         FIXED MECHANICAL CONFIGURATION
      ===================================================== */

      mechanicalProperties: {
        type:
          mechanicalPropertiesSchema,

        default: () => ({}),
      },

      /* =====================================================
         HEAT-WISE MECHANICAL RESULTS
      ===================================================== */

      mechanicalResults: {
        type: [
          mechanicalResultRowSchema,
        ],

        default: [],

        validate: {
          validator(value) {
            return Array.isArray(value);
          },

          message:
            "Mechanical results must be an array",
        },
      },

      /* =====================================================
         RAW MATERIAL
      ===================================================== */

      rawMaterialDetail: {
        type: rawMaterialDetailSchema,
        default: () => ({}),
      },

      /* =====================================================
         HARDENABILITY
      ===================================================== */

      hardenabilityTest: {
        type:
          hardenabilityTestSchema,

        default: () => ({}),
      },

      /* =====================================================
         ULTRASONIC TESTING
      ===================================================== */

      ultrasonicTesting: {
        type:
          ultrasonicTestingSchema,

        default: () => ({}),
      },

      /* =====================================================
         GAS ANALYSIS
      ===================================================== */

      gasAnalysis: {
        type: gasAnalysisSchema,
        default: () => ({}),
      },

      /* =====================================================
         DEPTH OF DECARBONIZATION
      ===================================================== */

      depthOfDecarbonization: {
        type:
          depthOfDecarbonizationSchema,

        default: () => ({}),
      },

      /* =====================================================
         INCLUSION RATING
      ===================================================== */

      inclusionRating: {
        type:
          inclusionRatingSchema,

        default: () => ({}),
      },

      /* =====================================================
         GRAIN SIZE / MACROSTRUCTURE
      ===================================================== */

      grainSize: {
        type: grainSizeSchema,
        default: () => ({}),
      },

      macrostructure: {
        type: String,
        default: "",
        trim: true,
      },

      /* =====================================================
         PHYSICAL TESTING
      ===================================================== */

      physicalTesting: {
        type:
          physicalTestingSchema,

        default: () => ({}),
      },

      /* =====================================================
         FINAL DECLARATIONS
      ===================================================== */

      identificationDetail: {
        type: String,

        default:
          "Heat No, Grade, Size has been marked on Bar. Free from bend",

        trim: true,
      },

      colourCode: {
        type: String,
        default: "N/A",
        trim: true,
      },

      dimensionalInspection: {
        type: String,

        default:
          "Dimensional inspection carried out as per above mentioned PO/TDS and found within limits",

        trim: true,
      },

      visualInspection: {
        type: String,

        default:
          "Visual inspection carried out as per T.D.C and found satisfactory",

        trim: true,
      },

      resultDeclaration: {
        type: String,

        default:
          "We hereby certify that material is free from radioactive elements, has been manufactured and inspected, and found acceptable as per customer requirement",

        trim: true,
      },

      preparedBy: {
        type: String,
        default: "",
        trim: true,
      },
    },
    {
      /*
       * This schema is merged into the
       * common MtcCertificate collection.
       */
      _id: false,
    }
  );

/* =========================================================
   BHARAT-SPECIFIC INDEXES
========================================================= */

bharatMtcSchema.index({
  tcNo: 1,
  issueDate: -1,
});

bharatMtcSchema.index({
  purchaseSpecification: 1,
  issueDate: -1,
});

/* =========================================================
   BHARAT DISCRIMINATOR
========================================================= */

const BharatMtcCertificate =
  mongoose.models.bharat ||
  MtcCertificate.discriminators
    ?.bharat ||
  MtcCertificate.discriminator(
    "bharat",
    bharatMtcSchema
  );

module.exports =
  BharatMtcCertificate;