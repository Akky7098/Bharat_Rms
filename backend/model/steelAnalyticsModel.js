// backend/model/steelAnalyticsModel.js

/* =========================================================
   STEEL ANALYTICS MODEL / CONSTANTS

   IMPORTANT:
   This module does NOT create another MongoDB collection.

   Source of truth:
   - SalesOrder
   - Dispatch

   This file only contains canonical analytics definitions
   and quantity/unit helpers.
========================================================= */

const TRACKING_TYPES = Object.freeze({
  HOUSE: "H.O.",
  STEEL_MILL: "N.H.O.",
});

const QUANTITY_UNITS = Object.freeze({
  KG: "KG",
  MT: "MT",
});

/* =========================================================
   UNIT NORMALIZATION
========================================================= */

const normalizeUnit = (unit = "") => {
  const value = String(unit)
    .trim()
    .toUpperCase()
    .replace(/\./g, "");

  if (
    [
      "KG",
      "KGS",
      "KILOGRAM",
      "KILOGRAMS",
    ].includes(value)
  ) {
    return QUANTITY_UNITS.KG;
  }

  if (
    [
      "MT",
      "MTS",
      "TON",
      "TONS",
      "TONNE",
      "TONNES",
      "METRIC TON",
      "METRIC TONS",
      "METRIC TONNE",
      "METRIC TONNES",
    ].includes(value)
  ) {
    return QUANTITY_UNITS.MT;
  }

  return "";
};

/* =========================================================
   CONVERT TO METRIC TON
========================================================= */

const convertToMetricTon = (
  quantity,
  unit
) => {
  const numericQuantity =
    Number(quantity);

  if (
    !Number.isFinite(
      numericQuantity
    ) ||
    numericQuantity < 0
  ) {
    return null;
  }

  const normalizedUnit =
    normalizeUnit(unit);

  if (
    normalizedUnit ===
    QUANTITY_UNITS.KG
  ) {
    return numericQuantity / 1000;
  }

  if (
    normalizedUnit ===
    QUANTITY_UNITS.MT
  ) {
    return numericQuantity;
  }

  return null;
};

/* =========================================================
   ROUND MT

   Keep calculations precise internally.
   API output uses 3 decimal places.
========================================================= */

const roundMetricTon = (
  value
) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return (
    Math.round(
      (number + Number.EPSILON) *
        1000
    ) / 1000
  );
};

module.exports = {
  TRACKING_TYPES,
  QUANTITY_UNITS,
  normalizeUnit,
  convertToMetricTon,
  roundMetricTon,
};