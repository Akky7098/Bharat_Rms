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
      C: { min: 1.5, max: 1.6 },
      Si: { min: 0.1, max: 0.4 },
      Mn: { min: 0.15, max: 0.45 },
      P: { min: null, max: 0.03 },
      S: { min: null, max: 0.03 },
      Cr: { min: 11.0, max: 12.0 },
      Mo: { min: 0.7, max: null },
      V: { min: 0.7, max: 0.85 },
      "Ni+Cu": { min: null, max: null },
    },
    hardness: commonHardness,
    hardenability: commonHardenability,
    seat: commonSeat,
  },

  GMD3: {
    label: "GMD3",
    elements: {
      C: { min: 2.0, max: 2.35 },
      Si: { min: null, max: 0.6 },
      Mn: { min: 0.2, max: 0.6 },
      P: { min: null, max: 0.03 },
      S: { min: null, max: 0.03 },
      Cr: { min: 11.0, max: 13.5 },
      Mo: { min: null, max: null },
      V: { min: null, max: null },
      "Ni+Cu": { min: null, max: null },
    },
    hardness: commonHardness,
    hardenability: commonHardenability,
    seat: commonSeat,
  },

  GMH13: {
    label: "GMH13 / H13",
    elements: {
      C: { min: 0.35, max: 0.42 },
      Si: { min: 0.8, max: 1.2 },
      Mn: { min: 0.25, max: 0.35 },
      P: { min: null, max: 0.03 },
      S: { min: null, max: 0.02 },
      Cr: { min: 4.8, max: 5.5 },
      Mo: { min: 1.1, max: 1.5 },
      V: { min: 0.8, max: 0.95 },
      "Ni+Cu": { min: null, max: 0.75 },
    },
    hardness: commonHardness,
    hardenability: commonHardenability,
    seat: commonSeat,
  },

  "H13(ESR)": {
    label: "H13(ESR)",
    elements: {
      C: { min: 0.32, max: 0.45 },
      Si: { min: 0.8, max: 1.25 },
      Mn: { min: 0.2, max: 0.6 },
      P: { min: null, max: 0.03 },
      S: { min: null, max: 0.03 },
      Cr: { min: 4.75, max: 5.5 },
      Mo: { min: 1.1, max: 1.75 },
      V: { min: 0.8, max: 1.2 },
      "Ni+Cu": { min: null, max: 0.75 },
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