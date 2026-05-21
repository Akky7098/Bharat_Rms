const axios = require("axios");

const reverseGeocode = async (latitude, longitude) => {
  try {
    if (!latitude || !longitude) return "";

    const response = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          lat: latitude,
          lon: longitude,
          format: "jsonv2",
          zoom: 18,
          addressdetails: 1,
        },
        headers: {
          "User-Agent": "BharatSpecialSteels-RMS/1.0",
        },
        timeout: 7000,
      }
    );

    const address = response.data?.address || {};

    const parts = [
      address.building,
      address.house_number,
      address.road,
      address.neighbourhood,
      address.suburb,
      address.village,
      address.town,
      address.city,
      address.county,
      address.state,
    ].filter(Boolean);

    const shortAddress = [...new Set(parts)].join(", ");

    return shortAddress || response.data?.display_name || "";
  } catch (error) {
    console.log("Reverse geocode failed:", error.message);
    return "";
  }
};

module.exports = reverseGeocode;