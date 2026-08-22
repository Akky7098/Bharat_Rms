/* =========================================================
   BHARAT INTELLIGENCE
   STEEL INDUSTRY MATH SERVICE

   PURPOSE:
   Handle common deterministic calculations locally
   without consuming Gemini tokens.

   IMPORTANT:
   - Default steel density = 7850 kg/m³
   - Density can always be overridden by the user.
   - Theoretical weight is not actual weighbridge weight.
   - Dimensions are assumed in mm unless specified.
========================================================= */

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_STEEL_DENSITY_KG_M3 =
  7850;

const PI =
  Math.PI;

/* =========================================================
   UNIT ALIASES
========================================================= */

const ALIASES = {
  /* WEIGHT */

  g: "g",
  gram: "g",
  grams: "g",

  kg: "kg",
  kgs: "kg",
  kilogram: "kg",
  kilograms: "kg",

  mt: "mt",
  mts: "mt",
  tonne: "mt",
  tonnes: "mt",
  ton: "mt",
  tons: "mt",

  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",

  /* LENGTH */

  mm: "mm",
  millimeter: "mm",
  millimeters: "mm",

  cm: "cm",
  centimeter: "cm",
  centimeters: "cm",

  m: "m",
  meter: "m",
  meters: "m",

  inch: "inch",
  inches: "inch",
  in: "inch",

  ft: "ft",
  foot: "ft",
  feet: "ft",

  /* AREA */

  mm2: "mm2",
  "mm²": "mm2",

  cm2: "cm2",
  "cm²": "cm2",

  m2: "m2",
  "m²": "m2",

  /* VOLUME */

  mm3: "mm3",
  "mm³": "mm3",

  cm3: "cm3",
  "cm³": "cm3",

  m3: "m3",
  "m³": "m3",

  litre: "litre",
  liter: "litre",
  litres: "litre",
  liters: "litre",
  l: "litre",
};

/* =========================================================
   CONVERSION GROUPS

   Base units:
   Weight = kg
   Length = mm
   Area   = mm²
   Volume = mm³
========================================================= */

const WEIGHT = {
  g: 0.001,

  kg: 1,

  mt: 1000,

  lb: 0.45359237,
};

const LENGTH = {
  mm: 1,

  cm: 10,

  m: 1000,

  inch: 25.4,

  ft: 304.8,
};

const AREA = {
  mm2: 1,

  cm2: 100,

  m2: 1000000,
};

const VOLUME = {
  mm3: 1,

  cm3: 1000,

  m3: 1000000000,

  litre: 1000000,
};

/* =========================================================
   BASIC HELPERS
========================================================= */

const cleanNumber = (
  value
) => {
  const parsed =
    Number(
      String(
        value
      )
        .replace(
          /,/g,
          ""
        )
        .trim()
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
};

const formatNumber = (
  value,
  decimals = 4
) => {
  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return null;
  }

  return Number(
    number.toFixed(
      decimals
    )
  );
};

const formatIndianNumber = (
  value,
  decimals = 2
) => {
  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "";
  }

  return number.toLocaleString(
    "en-IN",
    {
      maximumFractionDigits:
        decimals,
    }
  );
};

const normalizeUnit = (
  value
) => {
  return ALIASES[
    String(
      value || ""
    )
      .toLowerCase()
      .trim()
  ];
};

const findUnitGroup = (
  unit
) => {
  if (
    Object.prototype.hasOwnProperty.call(
      WEIGHT,
      unit
    )
  ) {
    return WEIGHT;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      LENGTH,
      unit
    )
  ) {
    return LENGTH;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      AREA,
      unit
    )
  ) {
    return AREA;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      VOLUME,
      unit
    )
  ) {
    return VOLUME;
  }

  return null;
};

/* =========================================================
   GENERIC UNIT CONVERSION
========================================================= */

const convertUnit = ({
  amount,
  from,
  to,
}) => {
  const normalizedFrom =
    normalizeUnit(
      from
    );

  const normalizedTo =
    normalizeUnit(
      to
    );

  const fromGroup =
    findUnitGroup(
      normalizedFrom
    );

  const toGroup =
    findUnitGroup(
      normalizedTo
    );

  if (
    !fromGroup ||
    !toGroup ||
    fromGroup !==
      toGroup
  ) {
    return null;
  }

  const base =
    amount *
    fromGroup[
      normalizedFrom
    ];

  return (
    base /
    fromGroup[
      normalizedTo
    ]
  );
};

/* =========================================================
   DENSITY HELPERS

   densityKgM3 can be overridden for stainless,
   aluminium, copper, etc.
========================================================= */

const getDensity = (
  densityKgM3
) => {
  const density =
    cleanNumber(
      densityKgM3
    );

  if (
    density &&
    density > 0
  ) {
    return density;
  }

  return DEFAULT_STEEL_DENSITY_KG_M3;
};

/* =========================================================
   VOLUME → WEIGHT

   mm³ × kg/m³ / 1e9
========================================================= */

const volumeMm3ToKg = (
  volumeMm3,
  densityKgM3 =
    DEFAULT_STEEL_DENSITY_KG_M3
) => {
  return (
    Number(
      volumeMm3
    ) *
    getDensity(
      densityKgM3
    )
  ) /
    1000000000;
};

/* =========================================================
   ROUND BAR

   Area = π × D² / 4
========================================================= */

const calculateRoundBar = ({
  diameterMm,
  lengthMm,
  quantity = 1,
  densityKgM3,
}) => {
  const diameter =
    Number(
      diameterMm
    );

  const length =
    Number(
      lengthMm
    );

  const qty =
    Number(
      quantity || 1
    );

  const areaMm2 =
    (
      PI *
      diameter *
      diameter
    ) /
    4;

  const volumeMm3 =
    areaMm2 *
    length;

  const pieceWeightKg =
    volumeMm3ToKg(
      volumeMm3,
      densityKgM3
    );

  return {
    shape:
      "round",

    diameterMm:
      diameter,

    lengthMm:
      length,

    quantity:
      qty,

    crossSectionAreaMm2:
      formatNumber(
        areaMm2
      ),

    weightPerMeterKg:
      formatNumber(
        volumeMm3ToKg(
          areaMm2 *
            1000,

          densityKgM3
        )
      ),

    pieceWeightKg:
      formatNumber(
        pieceWeightKg
      ),

    totalWeightKg:
      formatNumber(
        pieceWeightKg *
          qty
      ),

    totalWeightMT:
      formatNumber(
        (
          pieceWeightKg *
          qty
        ) /
          1000
      ),
  };
};

/* =========================================================
   SQUARE BAR / SQUARE BILLET

   Area = side²
========================================================= */

const calculateSquareBar = ({
  sideMm,
  lengthMm,
  quantity = 1,
  densityKgM3,
}) => {
  const side =
    Number(
      sideMm
    );

  const length =
    Number(
      lengthMm
    );

  const qty =
    Number(
      quantity ||
        1
    );

  const areaMm2 =
    side *
    side;

  const pieceWeightKg =
    volumeMm3ToKg(
      areaMm2 *
        length,

      densityKgM3
    );

  return {
    shape:
      "square",

    sideMm:
      side,

    lengthMm:
      length,

    quantity:
      qty,

    crossSectionAreaMm2:
      formatNumber(
        areaMm2
      ),

    weightPerMeterKg:
      formatNumber(
        volumeMm3ToKg(
          areaMm2 *
            1000,

          densityKgM3
        )
      ),

    pieceWeightKg:
      formatNumber(
        pieceWeightKg
      ),

    totalWeightKg:
      formatNumber(
        pieceWeightKg *
          qty
      ),

    totalWeightMT:
      formatNumber(
        pieceWeightKg *
          qty /
          1000
      ),
  };
};

/* =========================================================
   RECTANGULAR / FLAT / PLATE

   Volume =
   thickness × width × length
========================================================= */

const calculateRectangularBar = ({
  thicknessMm,
  widthMm,
  lengthMm,
  quantity = 1,
  densityKgM3,
}) => {
  const thickness =
    Number(
      thicknessMm
    );

  const width =
    Number(
      widthMm
    );

  const length =
    Number(
      lengthMm
    );

  const qty =
    Number(
      quantity ||
        1
    );

  const areaMm2 =
    thickness *
    width;

  const pieceWeightKg =
    volumeMm3ToKg(
      areaMm2 *
        length,

      densityKgM3
    );

  return {
    shape:
      "rectangle",

    thicknessMm:
      thickness,

    widthMm:
      width,

    lengthMm:
      length,

    quantity:
      qty,

    crossSectionAreaMm2:
      formatNumber(
        areaMm2
      ),

    weightPerMeterKg:
      formatNumber(
        volumeMm3ToKg(
          areaMm2 *
            1000,

          densityKgM3
        )
      ),

    pieceWeightKg:
      formatNumber(
        pieceWeightKg
      ),

    totalWeightKg:
      formatNumber(
        pieceWeightKg *
          qty
      ),

    totalWeightMT:
      formatNumber(
        pieceWeightKg *
          qty /
          1000
      ),
  };
};

/* =========================================================
   HEXAGON BAR

   Dimension assumed ACROSS FLATS.

   Area =
   √3 / 2 × acrossFlats²
========================================================= */

const calculateHexBar = ({
  acrossFlatsMm,
  lengthMm,
  quantity = 1,
  densityKgM3,
}) => {
  const size =
    Number(
      acrossFlatsMm
    );

  const length =
    Number(
      lengthMm
    );

  const qty =
    Number(
      quantity ||
        1
    );

  const areaMm2 =
    (
      Math.sqrt(
        3
      ) /
      2
    ) *
    size *
    size;

  const pieceWeightKg =
    volumeMm3ToKg(
      areaMm2 *
        length,

      densityKgM3
    );

  return {
    shape:
      "hexagon",

    acrossFlatsMm:
      size,

    lengthMm:
      length,

    quantity:
      qty,

    crossSectionAreaMm2:
      formatNumber(
        areaMm2
      ),

    weightPerMeterKg:
      formatNumber(
        volumeMm3ToKg(
          areaMm2 *
            1000,

          densityKgM3
        )
      ),

    pieceWeightKg:
      formatNumber(
        pieceWeightKg
      ),

    totalWeightKg:
      formatNumber(
        pieceWeightKg *
          qty
      ),

    totalWeightMT:
      formatNumber(
        pieceWeightKg *
          qty /
          1000
      ),
  };
};

/* =========================================================
   ROUND TUBE / HOLLOW BAR

   Area =
   π/4 × (OD² - ID²)
========================================================= */

const calculateRoundTube = ({
  outerDiameterMm,
  innerDiameterMm,
  wallThicknessMm,
  lengthMm,
  quantity = 1,
  densityKgM3,
}) => {
  const od =
    Number(
      outerDiameterMm
    );

  let id =
    cleanNumber(
      innerDiameterMm
    );

  const wall =
    cleanNumber(
      wallThicknessMm
    );

  if (
    id === null &&
    wall !== null
  ) {
    id =
      od -
      2 *
        wall;
  }

  if (
    id === null ||
    id < 0 ||
    id >= od
  ) {
    throw new Error(
      "Valid inner diameter or wall thickness is required."
    );
  }

  const areaMm2 =
    (
      PI /
      4
    ) *
    (
      od *
        od -
      id *
        id
    );

  const pieceWeightKg =
    volumeMm3ToKg(
      areaMm2 *
        Number(
          lengthMm
        ),

      densityKgM3
    );

  const qty =
    Number(
      quantity ||
        1
    );

  return {
    shape:
      "round_tube",

    outerDiameterMm:
      od,

    innerDiameterMm:
      id,

    wallThicknessMm:
      formatNumber(
        (
          od -
          id
        ) /
          2
      ),

    lengthMm:
      Number(
        lengthMm
      ),

    quantity:
      qty,

    weightPerMeterKg:
      formatNumber(
        volumeMm3ToKg(
          areaMm2 *
            1000,

          densityKgM3
        )
      ),

    pieceWeightKg:
      formatNumber(
        pieceWeightKg
      ),

    totalWeightKg:
      formatNumber(
        pieceWeightKg *
          qty
      ),

    totalWeightMT:
      formatNumber(
        pieceWeightKg *
          qty /
          1000
      ),
  };
};

/* =========================================================
   RECTANGULAR HOLLOW SECTION

   Area =
   outer area - inner area
========================================================= */

const calculateRectangularTube = ({
  outerWidthMm,
  outerHeightMm,
  wallThicknessMm,
  lengthMm,
  quantity = 1,
  densityKgM3,
}) => {
  const width =
    Number(
      outerWidthMm
    );

  const height =
    Number(
      outerHeightMm
    );

  const wall =
    Number(
      wallThicknessMm
    );

  const innerWidth =
    width -
    2 *
      wall;

  const innerHeight =
    height -
    2 *
      wall;

  if (
    innerWidth <= 0 ||
    innerHeight <= 0
  ) {
    throw new Error(
      "Wall thickness is too large for the section."
    );
  }

  const areaMm2 =
    width *
      height -
    innerWidth *
      innerHeight;

  const pieceWeightKg =
    volumeMm3ToKg(
      areaMm2 *
        Number(
          lengthMm
        ),

      densityKgM3
    );

  const qty =
    Number(
      quantity ||
        1
    );

  return {
    shape:
      "rectangular_tube",

    outerWidthMm:
      width,

    outerHeightMm:
      height,

    wallThicknessMm:
      wall,

    lengthMm:
      Number(
        lengthMm
      ),

    quantity:
      qty,

    weightPerMeterKg:
      formatNumber(
        volumeMm3ToKg(
          areaMm2 *
            1000,

          densityKgM3
        )
      ),

    pieceWeightKg:
      formatNumber(
        pieceWeightKg
      ),

    totalWeightKg:
      formatNumber(
        pieceWeightKg *
          qty
      ),

    totalWeightMT:
      formatNumber(
        pieceWeightKg *
          qty /
          1000
      ),
  };
};

/* =========================================================
   ROUND DISC

   Same geometry as a very short round bar.
========================================================= */

const calculateDisc = ({
  diameterMm,
  thicknessMm,
  quantity = 1,
  densityKgM3,
}) => {
  return calculateRoundBar({
    diameterMm,

    lengthMm:
      thicknessMm,

    quantity,

    densityKgM3,
  });
};

/* =========================================================
   RING

   Volume =
   π/4 × (OD²-ID²) × thickness
========================================================= */

const calculateRing = ({
  outerDiameterMm,
  innerDiameterMm,
  thicknessMm,
  quantity = 1,
  densityKgM3,
}) => {
  return calculateRoundTube({
    outerDiameterMm,

    innerDiameterMm,

    lengthMm:
      thicknessMm,

    quantity,

    densityKgM3,
  });
};

/* =========================================================
   SPHERE

   Volume =
   4/3 × π × r³
========================================================= */

const calculateSphere = ({
  diameterMm,
  quantity = 1,
  densityKgM3,
}) => {
  const diameter =
    Number(
      diameterMm
    );

  const radius =
    diameter /
    2;

  const volumeMm3 =
    (
      4 /
      3
    ) *
    PI *
    Math.pow(
      radius,
      3
    );

  const pieceWeightKg =
    volumeMm3ToKg(
      volumeMm3,

      densityKgM3
    );

  const qty =
    Number(
      quantity ||
        1
    );

  return {
    shape:
      "sphere",

    diameterMm:
      diameter,

    pieceWeightKg:
      formatNumber(
        pieceWeightKg
      ),

    totalWeightKg:
      formatNumber(
        pieceWeightKg *
          qty
      ),

    totalWeightMT:
      formatNumber(
        pieceWeightKg *
          qty /
          1000
      ),
  };
};

/* =========================================================
   PIECES FROM TOTAL WEIGHT
========================================================= */

const calculatePiecesFromWeight = ({
  totalWeightKg,
  pieceWeightKg,
}) => {
  const total =
    Number(
      totalWeightKg
    );

  const piece =
    Number(
      pieceWeightKg
    );

  if (
    piece <= 0
  ) {
    throw new Error(
      "Piece weight must be greater than zero."
    );
  }

  const exactPieces =
    total /
    piece;

  return {
    totalWeightKg:
      total,

    pieceWeightKg:
      piece,

    exactPieces:
      formatNumber(
        exactPieces
      ),

    completePieces:
      Math.floor(
        exactPieces
      ),

    remainingWeightKg:
      formatNumber(
        total -
          Math.floor(
            exactPieces
          ) *
            piece
      ),
  };
};

/* =========================================================
   TOTAL LENGTH FROM WEIGHT
========================================================= */

const calculateLengthFromWeight = ({
  totalWeightKg,
  weightPerMeterKg,
}) => {
  const weight =
    Number(
      totalWeightKg
    );

  const weightPerMeter =
    Number(
      weightPerMeterKg
    );

  if (
    weightPerMeter <= 0
  ) {
    throw new Error(
      "Weight per meter must be greater than zero."
    );
  }

  const lengthMeter =
    weight /
    weightPerMeter;

  return {
    totalWeightKg:
      weight,

    weightPerMeterKg:
      weightPerMeter,

    lengthMeter:
      formatNumber(
        lengthMeter
      ),

    lengthMm:
      formatNumber(
        lengthMeter *
          1000
      ),
  };
};

/* =========================================================
   WEIGHT DIFFERENCE
========================================================= */

const calculateWeightDifference = ({
  expectedWeightKg,
  actualWeightKg,
}) => {
  const expected =
    Number(
      expectedWeightKg
    );

  const actual =
    Number(
      actualWeightKg
    );

  const difference =
    actual -
    expected;

  const percentage =
    expected !== 0
      ? (
          difference /
          expected
        ) *
        100
      : 0;

  return {
    expectedWeightKg:
      expected,

    actualWeightKg:
      actual,

    differenceKg:
      formatNumber(
        difference
      ),

    differencePercent:
      formatNumber(
        percentage
      ),

    status:
      difference > 0
        ? "excess"
        : difference < 0
          ? "short"
          : "exact",
  };
};

/* =========================================================
   YIELD / RECOVERY
========================================================= */

const calculateRecovery = ({
  inputWeightKg,
  outputWeightKg,
}) => {
  const input =
    Number(
      inputWeightKg
    );

  const output =
    Number(
      outputWeightKg
    );

  if (
    input <= 0
  ) {
    throw new Error(
      "Input weight must be greater than zero."
    );
  }

  const recovery =
    (
      output /
      input
    ) *
    100;

  const loss =
    input -
    output;

  return {
    inputWeightKg:
      input,

    outputWeightKg:
      output,

    recoveryPercent:
      formatNumber(
        recovery
      ),

    lossKg:
      formatNumber(
        loss
      ),

    lossPercent:
      formatNumber(
        100 -
          recovery
      ),
  };
};

/* =========================================================
   SCRAP / PROCESS LOSS
========================================================= */

const calculateProcessLoss = ({
  inputWeightKg,
  scrapWeightKg,
}) => {
  const input =
    Number(
      inputWeightKg
    );

  const scrap =
    Number(
      scrapWeightKg
    );

  const goodWeight =
    input -
    scrap;

  return calculateRecovery({
    inputWeightKg:
      input,

    outputWeightKg:
      goodWeight,
  });
};

/* =========================================================
   ADD WASTAGE / PROCESS ALLOWANCE

   Example:
   Required = 10,000 kg
   allowance = 5%
========================================================= */

const addAllowance = ({
  requiredWeightKg,
  allowancePercent,
}) => {
  const required =
    Number(
      requiredWeightKg
    );

  const percent =
    Number(
      allowancePercent
    );

  const allowanceKg =
    required *
    percent /
    100;

  return {
    requiredWeightKg:
      required,

    allowancePercent:
      percent,

    allowanceKg:
      formatNumber(
        allowanceKg
      ),

    purchaseWeightKg:
      formatNumber(
        required +
          allowanceKg
      ),

    purchaseWeightMT:
      formatNumber(
        (
          required +
          allowanceKg
        ) /
          1000
      ),
  };
};

/* =========================================================
   MATERIAL VALUE
========================================================= */

const calculateMaterialValue = ({
  weightKg,
  ratePerKg,
}) => {
  const weight =
    Number(
      weightKg
    );

  const rate =
    Number(
      ratePerKg
    );

  const amount =
    weight *
    rate;

  return {
    weightKg:
      weight,

    ratePerKg:
      rate,

    amount:
      formatNumber(
        amount,
        2
      ),

    formattedAmount:
      `₹${formatIndianNumber(
        amount,
        2
      )}`,
  };
};

/* =========================================================
   GST
========================================================= */

const calculateGST = ({
  taxableAmount,
  gstPercent,
}) => {
  const amount =
    Number(
      taxableAmount
    );

  const gst =
    Number(
      gstPercent
    );

  const gstAmount =
    amount *
    gst /
    100;

  return {
    taxableAmount:
      amount,

    gstPercent:
      gst,

    gstAmount:
      formatNumber(
        gstAmount,
        2
      ),

    totalAmount:
      formatNumber(
        amount +
          gstAmount,
        2
      ),
  };
};

/* =========================================================
   MARGIN %

   Margin based on sales price.
========================================================= */

const calculateMargin = ({
  cost,
  sellingPrice,
}) => {
  const purchase =
    Number(
      cost
    );

  const selling =
    Number(
      sellingPrice
    );

  const profit =
    selling -
    purchase;

  return {
    cost:
      purchase,

    sellingPrice:
      selling,

    profit:
      formatNumber(
        profit,
        2
      ),

    marginPercent:
      selling !== 0
        ? formatNumber(
            profit /
              selling *
              100
          )
        : 0,

    markupPercent:
      purchase !== 0
        ? formatNumber(
            profit /
              purchase *
              100
          )
        : 0,
  };
};

/* =========================================================
   DISCOUNT
========================================================= */

const calculateDiscount = ({
  amount,
  discountPercent,
}) => {
  const base =
    Number(
      amount
    );

  const percent =
    Number(
      discountPercent
    );

  const discount =
    base *
    percent /
    100;

  return {
    originalAmount:
      base,

    discountPercent:
      percent,

    discountAmount:
      formatNumber(
        discount,
        2
      ),

    finalAmount:
      formatNumber(
        base -
          discount,
        2
      ),
  };
};

/* =========================================================
   RATE CONVERSIONS

   ₹/kg → ₹/MT
   ₹/MT → ₹/kg
========================================================= */

const rateKgToMT = (
  ratePerKg
) => {
  return Number(
    ratePerKg
  ) *
    1000;
};

const rateMTToKg = (
  ratePerMT
) => {
  return Number(
    ratePerMT
  ) /
    1000;
};

/* =========================================================
   CARBON EQUIVALENT - IIW

   CE =
   C +
   Mn/6 +
   (Cr+Mo+V)/5 +
   (Ni+Cu)/15

   Composition values are weight %.
========================================================= */

const calculateCarbonEquivalentIIW = ({
  C = 0,
  Mn = 0,
  Cr = 0,
  Mo = 0,
  V = 0,
  Ni = 0,
  Cu = 0,
}) => {
  const result =
    Number(
      C
    ) +
    Number(
      Mn
    ) /
      6 +
    (
      Number(
        Cr
      ) +
      Number(
        Mo
      ) +
      Number(
        V
      )
    ) /
      5 +
    (
      Number(
        Ni
      ) +
      Number(
        Cu
      )
    ) /
      15;

  return {
    formula:
      "C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15",

    carbonEquivalent:
      formatNumber(
        result,
        4
      ),
  };
};

/* =========================================================
   AREA REDUCTION %

   Used when comparing forging / rolling sections.
========================================================= */

const calculateAreaReduction = ({
  initialAreaMm2,
  finalAreaMm2,
}) => {
  const initial =
    Number(
      initialAreaMm2
    );

  const final =
    Number(
      finalAreaMm2
    );

  if (
    initial <= 0
  ) {
    throw new Error(
      "Initial area must be greater than zero."
    );
  }

  return {
    initialAreaMm2:
      initial,

    finalAreaMm2:
      final,

    reductionPercent:
      formatNumber(
        (
          (
            initial -
            final
          ) /
          initial
        ) *
          100
      ),

    areaRatio:
      final !== 0
        ? formatNumber(
            initial /
              final
          )
        : null,
  };
};

/* =========================================================
   FORGING REDUCTION RATIO

   Ratio =
   initial cross-sectional area /
   final cross-sectional area
========================================================= */

const calculateForgingRatio = ({
  initialAreaMm2,
  finalAreaMm2,
}) => {
  const initial =
    Number(
      initialAreaMm2
    );

  const final =
    Number(
      finalAreaMm2
    );

  if (
    final <= 0
  ) {
    throw new Error(
      "Final area must be greater than zero."
    );
  }

  return {
    initialAreaMm2:
      initial,

    finalAreaMm2:
      final,

    forgingRatio:
      formatNumber(
        initial /
          final
      ),

    ratioText:
      `${formatNumber(
        initial /
          final,
        2
      )}:1`,
  };
};

/* =========================================================
   ROUND AREA
========================================================= */

const roundArea = (
  diameterMm
) => {
  const d =
    Number(
      diameterMm
    );

  return (
    PI *
    d *
    d
  ) /
    4;
};

/* =========================================================
   SQUARE AREA
========================================================= */

const squareArea = (
  sideMm
) => {
  const side =
    Number(
      sideMm
    );

  return side *
    side;
};

/* =========================================================
   RECTANGLE AREA
========================================================= */

const rectangleArea = (
  widthMm,
  thicknessMm
) => {
  return (
    Number(
      widthMm
    ) *
    Number(
      thicknessMm
    )
  );
};

/* =========================================================
   ROUND → ROUND FORGING RATIO
========================================================= */

const roundToRoundReduction = ({
  initialDiameterMm,
  finalDiameterMm,
}) => {
  return calculateForgingRatio({
    initialAreaMm2:
      roundArea(
        initialDiameterMm
      ),

    finalAreaMm2:
      roundArea(
        finalDiameterMm
      ),
  });
};

/* =========================================================
   SQUARE → ROUND FORGING RATIO
========================================================= */

const squareToRoundReduction = ({
  initialSquareMm,
  finalDiameterMm,
}) => {
  return calculateForgingRatio({
    initialAreaMm2:
      squareArea(
        initialSquareMm
      ),

    finalAreaMm2:
      roundArea(
        finalDiameterMm
      ),
  });
};

/* =========================================================
   ROUND → SQUARE FORGING RATIO
========================================================= */

const roundToSquareReduction = ({
  initialDiameterMm,
  finalSquareMm,
}) => {
  return calculateForgingRatio({
    initialAreaMm2:
      roundArea(
        initialDiameterMm
      ),

    finalAreaMm2:
      squareArea(
        finalSquareMm
      ),
  });
};

/* =========================================================
   PERCENTAGE
========================================================= */

const calculatePercentage = ({
  percentage,
  amount,
}) => {
  return (
    Number(
      percentage
    ) /
    100
  ) *
    Number(
      amount
    );
};

/* =========================================================
   PERCENT CHANGE
========================================================= */

const calculatePercentChange = ({
  oldValue,
  newValue,
}) => {
  const oldNumber =
    Number(
      oldValue
    );

  const newNumber =
    Number(
      newValue
    );

  if (
    oldNumber === 0
  ) {
    return {
      oldValue:
        oldNumber,

      newValue:
        newNumber,

      change:
        newNumber -
        oldNumber,

      percentChange:
        null,
    };
  }

  return {
    oldValue:
      oldNumber,

    newValue:
      newNumber,

    change:
      formatNumber(
        newNumber -
          oldNumber
      ),

    percentChange:
      formatNumber(
        (
          newNumber -
          oldNumber
        ) /
          oldNumber *
          100
      ),
  };
};

/* =========================================================
   CELSIUS / FAHRENHEIT
========================================================= */

const celsiusToFahrenheit =
  (
    celsius
  ) => {
    return (
      Number(
        celsius
      ) *
        9 /
        5
    ) +
      32;
  };

const fahrenheitToCelsius =
  (
    fahrenheit
  ) => {
    return (
      Number(
        fahrenheit
      ) -
      32
    ) *
      5 /
      9;
  };

/* =========================================================
   NATURAL LANGUAGE PARSER
========================================================= */

const solveMathLocally =
  (
    message
  ) => {
    const text =
      String(
        message || ""
      )
        .trim()
        .toLowerCase();

    /* =====================================================
       1. GENERIC UNIT CONVERSION
    ===================================================== */

    const conversion =
      text.match(
        /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms|g|gram|grams|mt|mts|ton|tons|tonne|tonnes|lb|lbs|mm|cm|m|meter|meters|inch|inches|in|ft|feet)\s+(?:to|in)\s+(kg|kgs|kilogram|kilograms|g|gram|grams|mt|mts|ton|tons|tonne|tonnes|lb|lbs|mm|cm|m|meter|meters|inch|inches|in|ft|feet)/
      );

    if (
      conversion
    ) {
      const amount =
        cleanNumber(
          conversion[1]
        );

      const result =
        convertUnit({
          amount,

          from:
            conversion[2],

          to:
            conversion[3],
        });

      if (
        result ===
        null
      ) {
        return {
          success:
            false,

          answer:
            "Those units measure different quantities, so they cannot be directly converted.",
        };
      }

      const from =
        normalizeUnit(
          conversion[2]
        );

      const to =
        normalizeUnit(
          conversion[3]
        );

      return {
        success:
          true,

        type:
          "unit_conversion",

        answer:
          `${formatIndianNumber(
            amount,
            6
          )} ${from} = ${formatIndianNumber(
            result,
            6
          )} ${to}.`,

        data: {
          amount,
          from,
          to,

          result:
            formatNumber(
              result,
              6
            ),
        },
      };
    }

    /* =====================================================
       2. PERCENT OF AMOUNT
    ===================================================== */

    const percentage =
      text.match(
        /(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:,\d{3})*(?:\.\d+)?)/
      );

    if (
      percentage
    ) {
      const percent =
        cleanNumber(
          percentage[1]
        );

      const amount =
        cleanNumber(
          percentage[2]
        );

      const result =
        calculatePercentage({
          percentage:
            percent,

          amount,
        });

      return {
        success:
          true,

        type:
          "percentage",

        answer:
          `${percent}% of ${formatIndianNumber(
            amount
          )} = ${formatIndianNumber(
            result
          )}.`,

        data: {
          percentage:
            percent,

          amount,

          result:
            formatNumber(
              result
            ),
        },
      };
    }

    /* =====================================================
       3. ROUND BAR WEIGHT

       Examples:
       weight of dia 100 x 6000 mm steel
       weight round bar 100mm dia 6 meter
    ===================================================== */

    const roundMatch =
      text.match(
        /(?:weight\s+(?:of\s+)?)?(?:round(?:\s+bar)?\s*)?(?:dia(?:meter)?\s*)?(\d+(?:\.\d+)?)\s*mm?.*?(?:x|length|long|of)?\s*(\d+(?:\.\d+)?)\s*(mm|m|meter|meters)\b/
      );

    if (
      roundMatch &&
      /\b(round|dia|diameter)\b/.test(
        text
      )
    ) {
      const diameter =
        Number(
          roundMatch[1]
        );

      let length =
        Number(
          roundMatch[2]
        );

      if (
        roundMatch[3] !==
        "mm"
      ) {
        length *=
          1000;
      }

      const result =
        calculateRoundBar({
          diameterMm:
            diameter,

          lengthMm:
            length,
        });

      return {
        success:
          true,

        type:
          "round_bar_weight",

        answer:
          `Theoretical weight is approximately ${formatIndianNumber(
            result.pieceWeightKg,
            3
          )} kg per piece (${formatIndianNumber(
            result.weightPerMeterKg,
            3
          )} kg/m), using steel density ${DEFAULT_STEEL_DENSITY_KG_M3} kg/m³.`,

        data:
          result,
      };
    }

    /* =====================================================
       4. SQUARE BAR / BILLET

       Examples:
       weight 280 square x 2000 mm
    ===================================================== */

    const squareMatch =
      text.match(
        /(\d+(?:\.\d+)?)\s*(?:mm\s*)?(?:sq|square).*?(?:x|length|long)?\s*(\d+(?:\.\d+)?)\s*(mm|m|meter|meters)/
      );

    if (
      squareMatch
    ) {
      let length =
        Number(
          squareMatch[2]
        );

      if (
        squareMatch[3] !==
        "mm"
      ) {
        length *=
          1000;
      }

      const result =
        calculateSquareBar({
          sideMm:
            Number(
              squareMatch[1]
            ),

          lengthMm:
            length,
        });

      return {
        success:
          true,

        type:
          "square_bar_weight",

        answer:
          `Theoretical weight is approximately ${formatIndianNumber(
            result.pieceWeightKg,
            3
          )} kg per piece.`,

        data:
          result,
      };
    }

    /* =====================================================
       5. FLAT / PLATE / RECTANGLE

       Example:
       weight 50 x 110 x 6000 mm flat
    ===================================================== */

    const flatMatch =
      text.match(
        /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*mm/
      );

    if (
      flatMatch &&
      /\b(flat|plate|rectangle|rectangular)\b/.test(
        text
      )
    ) {
      const result =
        calculateRectangularBar({
          thicknessMm:
            Number(
              flatMatch[1]
            ),

          widthMm:
            Number(
              flatMatch[2]
            ),

          lengthMm:
            Number(
              flatMatch[3]
            ),
        });

      return {
        success:
          true,

        type:
          "flat_weight",

        answer:
          `Theoretical weight is approximately ${formatIndianNumber(
            result.pieceWeightKg,
            3
          )} kg per piece.`,

        data:
          result,
      };
    }

    /* =====================================================
       6. RECOVERY / YIELD

       Example:
       recovery from 10000 kg input and 9300 output
    ===================================================== */

    if (
      /\b(recovery|yield)\b/.test(
        text
      )
    ) {
      const numbers =
        [
          ...text.matchAll(
            /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:kg|kgs)?/g
          ),
        ].map(
          (
            match
          ) =>
            cleanNumber(
              match[1]
            )
        );

      if (
        numbers.length >=
        2
      ) {
        const result =
          calculateRecovery({
            inputWeightKg:
              numbers[0],

            outputWeightKg:
              numbers[1],
          });

        return {
          success:
            true,

          type:
            "recovery",

          answer:
            `Recovery is ${result.recoveryPercent}% and process loss is ${result.lossPercent}% (${formatIndianNumber(
              result.lossKg
            )} kg).`,

          data:
            result,
        };
      }
    }

    /* =====================================================
       7. CARBON EQUIVALENT

       Example:
       calculate CE C .4 Mn .8 Cr 1 Mo .2 Ni .3
    ===================================================== */

    if (
      /\b(carbon equivalent|cev|ce)\b/.test(
        text
      )
    ) {
      const extract =
        (
          symbol
        ) => {
          const regex =
            new RegExp(
              `\\b${symbol}\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)`,
              "i"
            );

          const match =
            text.match(
              regex
            );

          return match
            ? Number(
                match[1]
              )
            : 0;
        };

      const result =
        calculateCarbonEquivalentIIW({
          C:
            extract(
              "c"
            ),

          Mn:
            extract(
              "mn"
            ),

          Cr:
            extract(
              "cr"
            ),

          Mo:
            extract(
              "mo"
            ),

          V:
            extract(
              "v"
            ),

          Ni:
            extract(
              "ni"
            ),

          Cu:
            extract(
              "cu"
            ),
        });

      return {
        success:
          true,

        type:
          "carbon_equivalent_iiw",

        answer:
          `IIW carbon equivalent = ${result.carbonEquivalent}.`,

        data:
          result,
      };
    }

    /* =====================================================
       NOT DETERMINISTICALLY RECOGNIZED

       Let Gemini handle the question.
    ===================================================== */

    return {
      success:
        false,

      needsModel:
        true,
    };
  };

/* =========================================================
   EXPORT ALL FUNCTIONS

   They can later also become formal Gemini tools if needed.
========================================================= */

module.exports = {
  DEFAULT_STEEL_DENSITY_KG_M3,

  /* GENERAL */

  convertUnit,
  calculatePercentage,
  calculatePercentChange,

  /* STEEL GEOMETRY */

  calculateRoundBar,
  calculateSquareBar,
  calculateRectangularBar,
  calculateHexBar,
  calculateRoundTube,
  calculateRectangularTube,
  calculateDisc,
  calculateRing,
  calculateSphere,

  /* MATERIAL / LOGISTICS */

  calculatePiecesFromWeight,
  calculateLengthFromWeight,
  calculateWeightDifference,
  calculateRecovery,
  calculateProcessLoss,
  addAllowance,

  /* COMMERCIAL */

  calculateMaterialValue,
  calculateGST,
  calculateMargin,
  calculateDiscount,
  rateKgToMT,
  rateMTToKg,

  /* METALLURGY */

  calculateCarbonEquivalentIIW,

  /* FORGING / ROLLING */

  calculateAreaReduction,
  calculateForgingRatio,
  roundToRoundReduction,
  squareToRoundReduction,
  roundToSquareReduction,

  /* GEOMETRY */

  roundArea,
  squareArea,
  rectangleArea,

  /* TEMPERATURE */

  celsiusToFahrenheit,
  fahrenheitToCelsius,

  /* NATURAL LANGUAGE ENTRY */

  solveMathLocally,
};