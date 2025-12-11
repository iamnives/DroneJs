// Coordinate conversion utilities
class CoordinateUtils {
    /**
     * Convert world coordinates to lat/lng
     */
    static worldToLatLng(worldX, worldZ) {
        const { START_LAT, START_LNG } = CONFIG.MAP;
        const { METERS_PER_DEGREE } = CONFIG.TERRAIN;
        
        const lat = START_LAT - worldZ / METERS_PER_DEGREE;
        const lng = START_LNG + worldX / (METERS_PER_DEGREE * Math.cos(START_LAT * Math.PI / 180));
        
        return { lat, lng };
    }
    
    /**
     * Convert lat/lng to world coordinates
     */
    static latLngToWorld(lat, lng) {
        const { START_LAT, START_LNG } = CONFIG.MAP;
        const { METERS_PER_DEGREE } = CONFIG.TERRAIN;
        
        const x = (lng - START_LNG) * METERS_PER_DEGREE * Math.cos(START_LAT * Math.PI / 180);
        const z = -(lat - START_LAT) * METERS_PER_DEGREE;
        
        return { x, z };
    }
    
    /**
     * Convert lat/lng to tile coordinates at given zoom level
     */
    static latLngToTile(lat, lng, zoom) {
        const n = Math.pow(2, zoom);
        const lat_rad = lat * Math.PI / 180;
        
        const tileX = Math.floor((lng + 180) / 360 * n);
        const tileY = Math.floor((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2 * n);
        
        return { tileX, tileY };
    }
    
    /**
     * Convert tile coordinates to lat/lng bounds
     */
    static tileToBounds(tileX, tileY, zoom) {
        const n = Math.pow(2, zoom);
        
        const lngMin = (tileX / n) * 360 - 180;
        const lngMax = ((tileX + 1) / n) * 360 - 180;
        
        const latMin = Math.atan(Math.sinh(Math.PI * (1 - 2 * (tileY + 1) / n))) * 180 / Math.PI;
        const latMax = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileY / n))) * 180 / Math.PI;
        
        return { lngMin, lngMax, latMin, latMax };
    }
    
    /**
     * Calculate tile size in meters
     */
    static getTileSizeInMeters(tileX, tileY, zoom) {
        const bounds = this.tileToBounds(tileX, tileY, zoom);
        const { METERS_PER_DEGREE } = CONFIG.TERRAIN;
        
        const centerLat = (bounds.latMin + bounds.latMax) / 2;
        const latDiff = bounds.latMax - bounds.latMin;
        const lngDiff = bounds.lngMax - bounds.lngMin;
        
        const sizeZ = latDiff * METERS_PER_DEGREE;
        const sizeX = lngDiff * METERS_PER_DEGREE * Math.cos(centerLat * Math.PI / 180);
        
        return { sizeX, sizeZ, centerLat, centerLng: (bounds.lngMin + bounds.lngMax) / 2 };
    }
}
