export function mapLinkFromCoords(lat, lng) {
  if (lat === '' || lng === '' || lat == null || lng == null) return '';
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// Pull coordinates out of a pasted Google Maps link (query=lat,lng or /@lat,lng,zoom).
export function coordsFromLink(link = '') {
  const m = link.match(/query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) || link.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  return m ? { lat: m[1], lng: m[2] } : null;
}

export function directionsLink(from, to) {
  if (!from || !to) return '';
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`;
}

export function legMapLink(leg) {
  return leg.mapLink || mapLinkFromCoords(leg.lat, leg.lng);
}
