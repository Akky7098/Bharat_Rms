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
        timeout: 5000,
      }
    );

    const address = response.data?.address || {};

    const parts = [
      address.road,
      address.neighbourhood,
      address.suburb,
      address.city || address.town,
      address.state,
    ].filter(Boolean);

    return parts.join(", ");
  } catch (error) {
    console.log("Reverse geocode failed:", error.message);
    return "";
  }
};

module.exports = reverseGeocode;