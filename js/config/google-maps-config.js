/**
 * Google Maps API Configuration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Get API Key: https://console.cloud.google.com/
 * 2. Enable "Map Tiles API" 
 * 3. Replace 'YOUR_GOOGLE_MAPS_API_KEY' below with your actual key
 * 4. Optionally configure quality settings below
 * 
 * IMPORTANT: This file is currently for reference only.
 * The actual configuration is in app.js (search for GOOGLE_API_KEY).
 * 
 * For detailed setup guide, see GOOGLE_3D_SETUP.md
 */

export const GOOGLE_MAPS_CONFIG = {
    // ===== REQUIRED: Your Google Maps API key =====
    apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
    
    // ===== 3D Tiles Quality Settings =====
    tiles3D: {
        enabled: true,
        
        // Quality vs Performance (16-128)
        // Lower = Higher quality, more GPU/memory usage
        // 16 = Ultra, 48 = High (default), 96 = Performance
        maxScreenSpaceError: 48,
        
        // Memory limit in MB (256-1024)
        // Higher allows more tiles to be loaded
        maximumMemoryUsage: 512,
        
        // View distance multiplier (1.0-2.0)
        // Higher loads tiles farther away
        viewDistanceScale: 1.5,
        
        // Tile cache size in bytes
        // Larger cache = less reloading, more memory
        cacheBytes: 500 * 1024 * 1024 // 500 MB
    },
    
    // ===== Terrain Collision Settings =====
    terrain: {
        // Enable collision detection with terrain
        enableCollision: true,
        
        // Minimum altitude above terrain (meters)
        minAltitude: 2,
        
        // Radius to load tiles around drone (meters)
        loadRadius: 2000,
    },
    
    // ===== 2D Map Settings =====
    map: {
        // Custom map style ID (optional)
        mapId: 'YOUR_MAP_ID',
        
        // Default zoom level
        defaultZoom: 17,
        
        // Map tilt angle
        tilt: 0,
        
        // Map heading/rotation
        heading: 0
    },
    
    // ===== Performance Presets =====
    presets: {
        ultra: {
            maxScreenSpaceError: 16,
            maximumMemoryUsage: 1024,
            viewDistanceScale: 2.0
        },
        high: {
            maxScreenSpaceError: 48,
            maximumMemoryUsage: 512,
            viewDistanceScale: 1.5
        },
        balanced: {
            maxScreenSpaceError: 64,
            maximumMemoryUsage: 384,
            viewDistanceScale: 1.2
        },
        performance: {
            maxScreenSpaceError: 96,
            maximumMemoryUsage: 256,
            viewDistanceScale: 1.0
        }
    }
};

export default GOOGLE_MAPS_CONFIG;
