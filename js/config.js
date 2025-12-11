// Configuration constants
const CONFIG = {
    // Map settings
    MAP: {
        START_LAT: 37.7749,
        START_LNG: -122.4194,
        DEFAULT_ZOOM: 13,
        TILE_ZOOM: 16,
        SIZES: [200, 300, 400, 500, 600],
        DEFAULT_SIZE_INDEX: 1,
        TILE_URL: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        OSM_TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    },
    
    // Terrain settings
    TERRAIN: {
        TILE_RADIUS: 6, // Load 6 tiles in each direction (13x13 grid)
        MAX_DISTANCE_BUFFER: 3, // Keep extra tiles before cleanup
        METERS_PER_DEGREE: 111320
    },
    
    // Drone settings
    DRONE: {
        START_POSITION: { x: 0, y: 50, z: 0 },
        MAX_SPEED: 20,
        ACCELERATION: 0.5,
        ROTATION_SPEED: 0.03,
        LIFT_SPEED: 2,
        DRAG: 0.95,
        TILT_AMOUNT: 0.3,
        MIN_ALTITUDE: 2,
        BATTERY_DRAIN_BASE: 0.001,
        BATTERY_DRAIN_ACTIVITY: 0.0001
    },
    
    // Camera settings
    CAMERA: {
        FOV: 75,
        NEAR: 0.1,
        FAR: 3000,
        FOLLOW_DISTANCE: 150,
        FOLLOW_HEIGHT: 80,
        LERP_FACTOR: 0.1,
        FPV_LOOK_DISTANCE: 100,
        FPV_LOOK_DOWN: 10
    },
    
    // Scene settings
    SCENE: {
        BACKGROUND_COLOR: 0x87ceeb,
        FOG_NEAR: 500,
        FOG_FAR: 2000,
        AMBIENT_LIGHT: 0.6,
        DIRECTIONAL_LIGHT: 0.8,
        HEMISPHERE_LIGHT: 0.5
    },
    
    // View cone settings
    VIEW_CONE: {
        LENGTH: 1000, // meters
        COLOR: '#ffff00',
        FILL_OPACITY: 0.3,
        WEIGHT: 3,
        OPACITY: 0.8
    }
};
