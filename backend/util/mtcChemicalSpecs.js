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
      V: { min: 0.7, max: 0.75 },
      "Ni+Cu": { min: null, max: null },
    },
  },
};

module.exports = mtcChemicalSpecs;