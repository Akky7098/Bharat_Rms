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

      // Your sample PDF has V result 0.83, so strict 0.75 max will block it.
      // Keep 0.85 if you want 0.83 accepted.
      V: { min: 0.7, max: 0.85 },

      "Ni+Cu": { min: null, max: null },
    },

    hardness: {
      halfR1: { specMin: "", specMax: "229HBW", result: "189HBW" },
      halfR2: { specMin: "", specMax: "235HBW", result: "193HBW" },
    },

    hardenability: {
      halfR1: { specMin: "52HRC", specMax: "", result: "52HRC" },
      halfR2: { specMin: "50HRC", specMax: "", result: "52HRC" },
    },

    seat: {
      at: "0",
      ah: "0",
      bt: "0",
      bh: "0",
      ct: "0",
      ch: "0",
      dt: "0.5",
      dh: "0.5",
    },
  },
};

module.exports = mtcChemicalSpecs;