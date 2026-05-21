const axios = require("axios");

const reverseGeocode = async (latitude, longitude) => {
  try {
    if (!latitude || !longitude) return "";

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) return "";

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          latlng: `${latitude},${longitude}`,
          key: apiKey,
        },
        timeout: 5000,
      }
    );

    const result = response.data?.results?.[0];

    return result?.formatted_address || "";
  } catch (error) {
    console.log("Reverse geocode failed:", error.message);
    return "";
  }
};

module.exports = reverseGeocode;