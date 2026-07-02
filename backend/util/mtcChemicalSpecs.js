const commonHardness = {
  halfR1: { specMin: "", specMax: "229HBW", result: "189HBW" },
  halfR2: { specMin: "", specMax: "235HBW", result: "193HBW" },
};

const commonHardenability = {
  halfR1: { specMin: "52HRC", specMax: "", result: "52HRC" },
  halfR2: { specMin: "50HRC", specMax: "", result: "52HRC" },
};

const commonSeat = {
  at: "0",
  ah: "0",
  bt: "0",
  bh: "0",
  ct: "0",
  ch: "0",
  dt: "0.5",
  dh: "0.5",
};

const mtcChemicalSpecs = {
  GMD2: {
    label: "GMD2 / D2",
    elements: {
      C: { min: 1.5, max: 1.6, minText: "1.50", maxText: "1.60" },
      Si: { min: 0.1, max: 0.4, minText: "0.10", maxText: "0.40" },
      Mn: { min: 0.15, max: 0.45, minText: "0.15", maxText: "0.45" },
      P: { min: null, max: 0.03, minText: "", maxText: "0.030" },
      S: { min: null, max: 0.03, minText: "", maxText: "0.030" },
      Cr: { min: 11.0, max: 12.0, minText: "11.00", maxText: "12.00" },
      Mo: { min: 0.7, max: null, minText: "0.70", maxText: "" },
      V: { min: 0.7, max: 0.85, minText: "0.70", maxText: "0.85" },
      "Ni+Cu": { min: null, max: null, minText: "X", maxText: "X" },
    },
    hardness: commonHardness,
    hardenability: commonHardenability,
    seat: commonSeat,
  },

  GMD3: {
    label: "GMD3",
    elements: {
      C: { min: 2.0, max: 2.35, minText: "2.00", maxText: "2.35" },
      Si: { min: null, max: 0.6, minText: "", maxText: "0.60" },
      Mn: { min: 0.2, max: 0.6, minText: "0.20", maxText: "0.60" },
      P: { min: null, max: 0.03, minText: "", maxText: "0.030" },
      S: { min: null, max: 0.03, minText: "", maxText: "0.030" },
      Cr: { min: 11.0, max: 13.5, minText: "11.00", maxText: "13.50" },
      Mo: { min: null, max: null, minText: "X", maxText: "X" },
      V: { min: null, max: null, minText: "X", maxText: "X" },
      "Ni+Cu": { min: null, max: null, minText: "X", maxText: "X" },
    },
    hardness: commonHardness,
    hardenability: commonHardenability,
    seat: commonSeat,
  },

  GMH13: {
    label: "GMH13 / H13",
    elements: {
      C: { min: 0.35, max: 0.42, minText: "0.35", maxText: "0.42" },
      Si: { min: 0.8, max: 1.2, minText: "0.80", maxText: "1.20" },
      Mn: { min: 0.25, max: 0.35, minText: "0.25", maxText: "0.35" },
      P: { min: null, max: 0.03, minText: "", maxText: "0.030" },
      S: { min: null, max: 0.02, minText: "", maxText: "0.020" },
      Cr: { min: 4.8, max: 5.5, minText: "4.80", maxText: "5.50" },
      Mo: { min: 1.1, max: 1.5, minText: "1.10", maxText: "1.50" },
      V: { min: 0.8, max: 0.95, minText: "0.80", maxText: "0.95" },
      "Ni+Cu": { min: null, max: 0.75, minText: "", maxText: "0.75" },
    },
    hardness: commonHardness,
    hardenability: commonHardenability,
    seat: commonSeat,
  },

  "H13(ESR)": {
    label: "H13(ESR)",
    elements: {
      C: { min: 0.32, max: 0.45, minText: "0.32", maxText: "0.45" },
      Si: { min: 0.8, max: 1.25, minText: "0.80", maxText: "1.25" },
      Mn: { min: 0.2, max: 0.6, minText: "0.20", maxText: "0.60" },
      P: { min: null, max: 0.03, minText: "", maxText: "0.030" },
      S: { min: null, max: 0.03, minText: "", maxText: "0.030" },
      Cr: { min: 4.75, max: 5.5, minText: "4.75", maxText: "5.50" },
      Mo: { min: 1.1, max: 1.75, minText: "1.10", maxText: "1.75" },
      V: { min: 0.8, max: 1.2, minText: "0.80", maxText: "1.20" },
      "Ni+Cu": { min: null, max: 0.75, minText: "", maxText: "0.75" },
    },
    hardness: commonHardness,
    hardenability: {
      halfR1: { specMin: "50HRC", specMax: "", result: "51HRC" },
      halfR2: { specMin: "", specMax: "", result: "" },
    },
    seat: commonSeat,
  },
};

module.exports = mtcChemicalSpecs;