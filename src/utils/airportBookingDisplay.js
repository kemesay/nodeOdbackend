/**
 * Display helpers for airport bookings that support either:
 * - Legacy: linked Airport row (airportId)
 * - New: free-form terminal location (airportLocationAddress + lat/lng)
 */

function hasLinkedAirport(booking) {
  return Boolean(booking?.Airport);
}

/** Human-readable airport / terminal name for emails and admin UI */
function getAirportTerminalName(booking) {
  if (hasLinkedAirport(booking)) return booking.Airport.airportName;
  if (booking?.airportLocationAddress) return booking.airportLocationAddress;
  return "Airport (location not specified)";
}

/** Full address line for airport terminal (includes coordinates when custom) */
function getAirportTerminalAddress(booking) {
  if (hasLinkedAirport(booking)) return booking.Airport.airportAddress;
  if (booking?.airportLocationAddress) {
    const lat = booking.airportLocationLatitude;
    const lng = booking.airportLocationLongitude;
    if (lat != null && lng != null) {
      return `${booking.airportLocationAddress} (${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)})`;
    }
    return booking.airportLocationAddress;
  }
  return "";
}

module.exports = {
  hasLinkedAirport,
  getAirportTerminalName,
  getAirportTerminalAddress,
};
