const axios = require("axios");

const buildAddress = (data) => {
  const address = data?.address || {};
  const displayName = data?.display_name || "";

  const parts = [
    address.house_number,
    address.building,
    address.office,
    address.company,
    address.shop,
    address.amenity,
    address.industrial,
    address.commercial,
    address.residential,
    address.road,
    address.neighbourhood,
    address.suburb,
    address.quarter,
    address.city_district,
    address.village,
    address.town,
    address.city,
    address.county,
    address.state_district,
    address.state,
    address.postcode,
  ].filter(Boolean);

  const shortAddress = [...new Set(parts)].join(", ");

  return shortAddress || displayName || "";
};

const reverseGeocode = async (latitude, longitude) => {
  try {
    if (!latitude || !longitude) return "";

    const zoomLevels = [18, 17, 16, 15, 14];
    let bestAddress = "";

    for (const zoom of zoomLevels) {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/reverse",
        {
          params: {
            lat: latitude,
            lon: longitude,
            format: "jsonv2",
            zoom,
            addressdetails: 1,
            namedetails: 1,
            extratags: 1,
          },
          headers: {
            "User-Agent": "BharatSpecialSteels-RMS/1.0",
          },
          timeout: 7000,
        }
      );

      const addressText = buildAddress(response.data);

      if (addressText.length > bestAddress.length) {
        bestAddress = addressText;
      }
    }

    return bestAddress;
  } catch (error) {
    console.log("Reverse geocode failed:", error.message);
    return "";
  }
};

module.exports = reverseGeocode;