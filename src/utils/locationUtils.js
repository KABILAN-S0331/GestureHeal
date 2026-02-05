/**
 * Location Utilities
 * Distance calculation and nearby doctor discovery
 */

// Mock doctors with locations (Chennai area for demo)
export const MOCK_DOCTORS = [
    { id: 1, name: 'Dr. Priya Sharma', specialty: 'General Physician', lat: 13.0827, lng: 80.2707, available: true },
    { id: 2, name: 'Dr. Rajesh Kumar', specialty: 'Cardiologist', lat: 13.0569, lng: 80.2425, available: true },
    { id: 3, name: 'Dr. Anitha Rao', specialty: 'Neurologist', lat: 13.0674, lng: 80.2376, available: false },
    { id: 4, name: 'Dr. Mohammed Ali', specialty: 'Emergency Medicine', lat: 13.0850, lng: 80.2101, available: true },
    { id: 5, name: 'Dr. Lakshmi Iyer', specialty: 'General Physician', lat: 13.0358, lng: 80.2128, available: true },
    { id: 6, name: 'Dr. Suresh Menon', specialty: 'Orthopedic', lat: 13.1067, lng: 80.2206, available: true }
];

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} - Distance in kilometers
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Get patient's current location using browser Geolocation API
 * @returns {Promise<{lat: number, lng: number}>}
 */
export function getPatientLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            // Fallback to Chennai center if geolocation not available
            resolve({ lat: 13.0827, lng: 80.2707 });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                console.warn('Geolocation error:', error);
                // Fallback location
                resolve({ lat: 13.0827, lng: 80.2707 });
            },
            { timeout: 5000 }
        );
    });
}

/**
 * Find doctors within specified radius
 * @param {{lat: number, lng: number}} patientLocation 
 * @param {Array} doctors 
 * @param {number} radiusKm - Radius in kilometers (default 5km)
 * @returns {Array} - Nearby available doctors with distances
 */
export function findNearbyDoctors(patientLocation, doctors = MOCK_DOCTORS, radiusKm = 5) {
    return doctors
        .filter(doc => doc.available)
        .map(doc => ({
            ...doc,
            distance: calculateDistance(
                patientLocation.lat,
                patientLocation.lng,
                doc.lat,
                doc.lng
            )
        }))
        .filter(doc => doc.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
}

/**
 * Format location for display
 * @param {{lat: number, lng: number}} location 
 * @returns {string}
 */
export function formatLocation(location) {
    return `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E`;
}

/**
 * Generate Google Maps link for location
 * @param {{lat: number, lng: number}} location 
 * @returns {string}
 */
export function getMapLink(location) {
    return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
}

export default {
    MOCK_DOCTORS,
    calculateDistance,
    getPatientLocation,
    findNearbyDoctors,
    formatLocation,
    getMapLink
};
