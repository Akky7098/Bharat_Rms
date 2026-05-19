const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const verifyOfficeLocation = ({ latitude, longitude }) => {
  const officeLat = Number(process.env.OFFICE_LAT);
  const officeLng = Number(process.env.OFFICE_LNG);
  const radius = Number(process.env.OFFICE_RADIUS_METERS || 150);

  if (!officeLat || !officeLng) {
    throw new Error("Office location is not configured.");
  }

  const distance = getDistanceInMeters(
    Number(latitude),
    Number(longitude),
    officeLat,
    officeLng
  );

  return {
    distance,
    isWithinOffice: distance <= radius,
  };
};

module.exports = {
  getDistanceInMeters,
  verifyOfficeLocation,
};