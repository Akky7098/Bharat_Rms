const STEEL_MILLS = [
  "Punjab General",
  "Polystud Lifting",
  "Jassar Forging",
  "S.S. Steel - Sirhind",
  "Skyway - Ludhiana",
  "Kuber Concast - Mandi Gobindgarh",
  "Pushpanjali Strip",
  "Shakti Rolling - Mandi Gobindgarh",
  "AV Alloys - Mandi Gobindgarh",
  "Kesari Alloys - Bhiwadi",
  "East India - Durgapur",
  "Behari Lal - Mandi Gobindgarh",
  "Others",
];

// Accept names from older/cached forms, but always persist canonical values.
const millKey = (value) => String(value || "").trim().toLowerCase();
const millAliases = new Map(STEEL_MILLS.map((mill) => [millKey(mill), mill]));
for (const mill of STEEL_MILLS) {
  millAliases.set(millKey(mill.split(" - ")[0]), mill);
}
millAliases.set("skyway , ludhiana", "Skyway - Ludhiana");

const normalizeSteelMill = (value) => millAliases.get(millKey(value)) || "";

module.exports = { STEEL_MILLS, normalizeSteelMill };
