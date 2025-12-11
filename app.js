// Import THREE.js and the 3D Tiles loader
import * as THREE from 'three';
import { Loader3DTiles } from 'three-loader-3dtiles';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Make THREE available globally for compatibility
window.THREE = THREE;

// Three.js Scene Setup
let scene, camera, renderer, drone, droneGroup;
let map, droneMarker;
let keys = {};

// Bottom camera view
let bottomCamera, bottomRenderer, bottomCameraVisible = true;

// Spawn coordinates (Norway)
const SPAWN_LAT = 59.113277;
const SPAWN_LNG = 10.110296;

// Preloader state
let isLoading = true;
let tilesLoaded = 0;
let totalTilesToLoad = 0;

// Google Maps 3D Terrain
let googleTerrain = null;
const GOOGLE_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your API key

// Legacy terrain management (kept for fallback)
const terrainChunks = new Map();
const chunkSize = 500;
const viewDistance = 2500;
let lastChunkX = null;
let lastChunkZ = null;
let use3DTerrain = true; // Set to false to use legacy terrain

// Map settings
let mapSize = 300; // Default map size in pixels
const mapSizes = [200, 300, 400, 500, 600]; // Available sizes
let currentSizeIndex = 1; // Start at 300px
let mapCentered = true; // Whether map follows drone
let droneViewCone = null; // Leaflet polygon for drone view cone

// Drone state
const droneState = {
    position: { x: 0, y: 50, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    speed: 0,
    altitude: 50,
    heading: 0,
    battery: 100,
    maxSpeed: 20,
    acceleration: 0.5,
    rotationSpeed: 0.03,
    liftSpeed: 2,
    drag: 0.95
};

// Camera modes
let cameraMode = 'follow'; // 'follow' or 'fpv'
let cameraDistance = 150; // Distance from drone in follow mode
const minCameraDistance = 30;
const maxCameraDistance = 500;
const zoomSpeed = 10;

// Free camera mode (middle mouse)
let freeCameraMode = false;
let freeCameraAngleH = 0; // Horizontal angle around drone
let freeCameraAngleV = 0.3; // Vertical angle (pitch)
let isMiddleMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Landmarks management
const loadedLandmarks = new Map(); // Store loaded landmark models
const landmarkLoadDistance = 500; // Distance to start loading landmarks (meters)
const landmarkUnloadDistance = 1000; // Distance to unload landmarks

// Drone model settings
let use3DDroneModel = true; // Try to load 3D model first
let droneModelLoaded = false;
let dronePropellers = []; // Store references to propeller objects

// Initialize everything
async function init() {
    initThreeJS();
    initBottomCamera();
    initMap();
    createDrone();
    setupControls();
    
    if (use3DTerrain && GOOGLE_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY') {
        await initGoogle3DTerrain();
    } else {
        console.warn('Using legacy 2D terrain. Set GOOGLE_API_KEY to enable 3D terrain.');
        preloadTerrain();
    }
}

// Initialize Three.js
function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 400, 1000);
    
    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        3000
    );
    camera.position.set(0, 100, 150);
    camera.lookAt(0, 50, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('three-container').appendChild(renderer.domElement);
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    ambientLight.layers.enableAll(); // Make light visible to all cameras
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.layers.enableAll(); // Make light visible to all cameras
    scene.add(directionalLight);
    
    // Hemisphere light for better sky/ground lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x545454, 0.5);
    hemisphereLight.layers.enableAll(); // Make light visible to all cameras
    scene.add(hemisphereLight);
    
    // Store renderer globally for 3D tiles
    window.renderer = renderer;
    window.camera = camera;
    
    // Window resize handler
    window.addEventListener('resize', onWindowResize);
}

// Initialize bottom camera view
function initBottomCamera() {
    const canvas = document.getElementById('bottom-camera');
    const size = 300; // Same as default map size
    canvas.width = size;
    canvas.height = size;
    
    // Show canvas by default
    canvas.style.display = bottomCameraVisible ? 'block' : 'none';
    
    bottomCamera = new THREE.PerspectiveCamera(
        90,
        1, // Square aspect ratio
        0.1,
        500
    );
    
    // Set bottom camera to only see layer 1 (terrain only, not the drone)
    bottomCamera.layers.set(1);
    
    bottomRenderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true 
    });
    bottomRenderer.setSize(size, size);
}

// Toggle bottom camera view
function toggleBottomCamera() {
    bottomCameraVisible = !bottomCameraVisible;
    const canvas = document.getElementById('bottom-camera');
    canvas.style.display = bottomCameraVisible ? 'block' : 'none';
    console.log('Bottom camera:', bottomCameraVisible ? 'ON' : 'OFF');
}

// Create drone model
function createDrone() {
    droneGroup = new THREE.Group();
    
    if (use3DDroneModel) {
        // Try to load 3D GLTF model
        const loader = new GLTFLoader();
        loader.load(
            'assets/drone.glb',
            (gltf) => {
                console.log('3D drone model loaded successfully!');
                const model = gltf.scene;
                
                // Scale and position the model appropriately
                model.scale.set(10, 10, 10); // Adjust scale as needed
                model.rotation.y = 0; // F ace forward (north)
                
                droneGroup.add(model);
                droneModelLoaded = true;
            },
            (progress) => {
                console.log('Loading drone model:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
            },
            (error) => {
                console.warn('Failed to load 3D drone model, using fallback:', error);
                createFallbackDrone();
            }
        );
    } else {
        createFallbackDrone();
    }
    
    droneGroup.position.set(
        droneState.position.x,
        droneState.position.y,
        droneState.position.z
    );
    
    // Make drone invisible to bottom camera using layers
    // Layer 0 = default (main camera), Layer 1 = bottom camera only
    droneGroup.layers.set(0);
    
    scene.add(droneGroup);
    drone = droneGroup;
}

// Create fallback procedural drone model
function createFallbackDrone() {
    console.log('Creating fallback procedural drone model');
    
    // Main body
    const bodyGeometry = new THREE.BoxGeometry(8, 2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    droneGroup.add(body);
    
    // Camera gimbal
    const gimbalGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const gimbalMaterial = new THREE.MeshStandardMaterial({ color: 0x34495e });
    const gimbal = new THREE.Mesh(gimbalGeometry, gimbalMaterial);
    gimbal.position.y = -2;
    droneGroup.add(gimbal);
    
    // Arms and motors
    const armPositions = [
        { x: 5, z: 5 },
        { x: -5, z: 5 },
        { x: 5, z: -5 },
        { x: -5, z: -5 }
    ];
    
    armPositions.forEach((pos, index) => {
        // Arm
        const armGeometry = new THREE.CylinderGeometry(0.3, 0.3, 7, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.rotation.z = Math.PI / 2;
        arm.rotation.y = Math.atan2(pos.z, pos.x);
        const armLength = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        arm.position.set(pos.x * 0.5, 0, pos.z * 0.5);
        droneGroup.add(arm);
        
        // Motor
        const motorGeometry = new THREE.CylinderGeometry(1.5, 1.5, 2, 16);
        const motorMaterial = new THREE.MeshStandardMaterial({ color: 0x7f8c8d });
        const motor = new THREE.Mesh(motorGeometry, motorMaterial);
        motor.position.set(pos.x, 1, pos.z);
        droneGroup.add(motor);
        
        // Propeller
        const propGroup = new THREE.Group();
        const propGeometry = new THREE.BoxGeometry(6, 0.2, 0.8);
        const propMaterial = new THREE.MeshStandardMaterial({ 
            color: index % 2 === 0 ? 0x3498db : 0xe67e22,
            transparent: true,
            opacity: 0.7
        });
        const prop1 = new THREE.Mesh(propGeometry, propMaterial);
        const prop2 = new THREE.Mesh(propGeometry, propMaterial);
        prop2.rotation.y = Math.PI / 2;
        propGroup.add(prop1);
        propGroup.add(prop2);
        propGroup.position.set(pos.x, 2.5, pos.z);
        propGroup.userData.propeller = true;
        propGroup.userData.direction = index % 2 === 0 ? 1 : -1;
        droneGroup.add(propGroup);
    });
    
    // LED lights
    const ledGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const ledFrontMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00, 
        emissive: 0x00ff00,
        emissiveIntensity: 2
    });
    const ledRearMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000, 
        emissive: 0xff0000,
        emissiveIntensity: 2
    });
    
    const ledFront = new THREE.Mesh(ledGeometry, ledFrontMaterial);
    ledFront.position.set(0, 0, 4.5);
    droneGroup.add(ledFront);
    
    const ledRear = new THREE.Mesh(ledGeometry, ledRearMaterial);
    ledRear.position.set(0, 0, -4.5);
    droneGroup.add(ledRear);
    
    droneModelLoaded = true;
}

// Preload terrain tiles before starting
function preloadTerrain() {
    const zoom = 18;
    const startLat = SPAWN_LAT;
    const startLng = SPAWN_LNG;
    const metersPerDegree = 111320;
    
    // Calculate starting tile position
    const n = Math.pow(2, zoom);
    const lat_rad = startLat * Math.PI / 180;
    const startTileX = Math.floor((startLng + 180) / 360 * n);
    const startTileY = Math.floor((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2 * n);
    
    // Preload a larger radius of tiles (15 tiles in each direction = 31x31 grid)
    const preloadRadius = 15;
    const tilesToPreload = [];
    
    for (let x = startTileX - preloadRadius; x <= startTileX + preloadRadius; x++) {
        for (let y = startTileY - preloadRadius; y <= startTileY + preloadRadius; y++) {
            const dx = x - startTileX;
            const dy = y - startTileY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Only load tiles within circular radius
            if (distance <= preloadRadius) {
                tilesToPreload.push({ x, y, distance });
            }
        }
    }
    
    // Sort by distance - load closest first
    tilesToPreload.sort((a, b) => a.distance - b.distance);
    totalTilesToLoad = tilesToPreload.length;
    tilesLoaded = 0;
    
    updatePreloaderUI();
    
    // Load tiles in batches
    let currentIndex = 0;
    const batchSize = 20; // Load 20 tiles per batch
    
    function loadBatch() {
        const batchEnd = Math.min(currentIndex + batchSize, tilesToPreload.length);
        
        for (let i = currentIndex; i < batchEnd; i++) {
            const tile = tilesToPreload[i];
            createTerrainChunkWithCallback(tile.x, tile.y, () => {
                tilesLoaded++;
                updatePreloaderUI();
                
                // Check if all tiles are loaded
                if (tilesLoaded >= totalTilesToLoad) {
                    finishLoading();
                }
            });
        }
        
        currentIndex = batchEnd;
        
        // Schedule next batch
        if (currentIndex < tilesToPreload.length) {
            setTimeout(loadBatch, 50); // Small delay between batches
        }
    }
    
    // Start loading
    loadBatch();
}

// Update preloader UI
function updatePreloaderUI() {
    const loader = document.getElementById('loader');
    const progress = document.getElementById('load-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    if (loader && progress && progressBar && progressText) {
        const percentage = Math.round((tilesLoaded / totalTilesToLoad) * 100);
        progressBar.style.width = percentage + '%';
        progressText.textContent = `Loading terrain... ${percentage}%`;
    }
}

// Initialize Google 3D Terrain
async function initGoogle3DTerrain() {
    console.log('Loading Google 3D Tiles...');
    
    try {
        // Google's Photorealistic 3D Tiles endpoint
        const tilesetUrl = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_API_KEY}`;
        
        // Load the tileset using the static load method
        const result = await Loader3DTiles.load({
            url: tilesetUrl,
            renderer: renderer,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio
            },
            options: {
                dracoDecoderPath: 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco',
                basisTranscoderPath: 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis',
                maximumScreenSpaceError: 48,
                maximumMemoryUsage: 512
            }
        });

        const { model, runtime } = result;
        const rootTileset = model;

        // Enable shadows and layers on 3D tiles
        rootTileset.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.layers.enable(0);
                child.layers.enable(1);
            }
        });

        // Add to scene
        scene.add(rootTileset);
        
        // Store for updates
        googleTerrain = {
            runtime: runtime,
            root: rootTileset,
            update: (cam) => {
                if (runtime && rootTileset && cam) {
                    // Update camera matrices before passing to runtime
                    cam.updateMatrixWorld();
                    runtime.update(0.016, renderer.domElement.clientHeight, cam);
                }
            },
            getTerrainHeight: (lat, lng) => {
                if (!rootTileset) return 0;
                
                // Convert lat/lng to world position
                const R = 6371000;
                const latRad = lat * Math.PI / 180;
                const lngRad = lng * Math.PI / 180;
                const centerLatRad = SPAWN_LAT * Math.PI / 180;
                const centerLngRad = SPAWN_LNG * Math.PI / 180;
                
                const x = R * (lngRad - centerLngRad) * Math.cos(centerLatRad);
                const z = -R * (latRad - centerLatRad);
                
                // Raycast down from high altitude
                const raycaster = new THREE.Raycaster();
                raycaster.set(
                    new THREE.Vector3(x, 1000, z),
                    new THREE.Vector3(0, -1, 0)
                );
                
                const intersects = raycaster.intersectObject(rootTileset, true);
                
                if (intersects.length > 0) {
                    return intersects[0].point.y;
                }
                
                return 0;
            },
            worldToLatLng: (x, y, z) => {
                const R = 6371000;
                const centerLatRad = SPAWN_LAT * Math.PI / 180;
                
                const lngOffset = x / (R * Math.cos(centerLatRad));
                const latOffset = -z / R;
                
                return {
                    lat: SPAWN_LAT + (latOffset * 180 / Math.PI),
                    lng: SPAWN_LNG + (lngOffset * 180 / Math.PI),
                    alt: y
                };
            }
        };
        
        console.log('Google 3D Tiles loaded successfully!');
        finishLoading();
        return true;
    } catch (error) {
        // Check if it's an API key error (403 Forbidden)
        const errorMsg = error.message || error.toString();
        if (errorMsg.includes('403') || errorMsg.includes('Forbidden') || errorMsg.includes('Failed to fetch')) {
            console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #e74c3c');
            console.log('%c⚠️  Google 3D Tiles API Key Missing or Invalid', 'color: #e74c3c; font-size: 14px; font-weight: bold');
            console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #e74c3c');
            console.log('%cℹ️  To enable Google 3D Photorealistic Tiles:', 'color: #3498db; font-weight: bold');
            console.log('%c   1. Get a Google Maps API key from: https://console.cloud.google.com/', 'color: #95a5a6');
            console.log('%c   2. Enable "Map Tiles API" for your project', 'color: #95a5a6');
            console.log('%c   3. Add the key to app.js: GOOGLE_API_KEY = "your-key-here"', 'color: #95a5a6');
            console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #e74c3c');
            console.log('%c✓ Falling back to legacy 2D satellite terrain...', 'color: #f39c12; font-weight: bold');
            console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #e74c3c');
        } else {
            console.error('Error initializing Google 3D Terrain:', error);
            console.log('Falling back to legacy terrain');
        }
        use3DTerrain = false;
        preloadTerrain();
        return false;
    }
}

// Finish loading and start animation
function finishLoading() {
    isLoading = false;
    const loader = document.getElementById('loader');
    
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
    
    if (!use3DTerrain) {
        // Update last chunk position to prevent immediate reload
        const zoom = 18;
        const n = Math.pow(2, zoom);
        const lat_rad = SPAWN_LAT * Math.PI / 180;
        lastChunkX = Math.floor((SPAWN_LNG + 180) / 360 * n);
        lastChunkZ = Math.floor((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2 * n);
    }
    
    console.log('Terrain loaded! Starting simulation...');
    animate();
}

// Get chunk coordinates from world position
function getChunkCoords(x, z) {
    return {
        x: Math.floor(x / chunkSize),
        z: Math.floor(z / chunkSize)
    };
}

// Create a terrain chunk with satellite imagery (with optional callback)
function createTerrainChunkWithCallback(tileX, tileY, onLoad) {
    const chunkKey = `${tileX},${tileY}`;
    
    // Don't recreate existing chunks
    if (terrainChunks.has(chunkKey)) {
        if (onLoad) onLoad();
        return;
    }
    
    // Calculate the real-world size of this tile at zoom 18 (higher resolution)
    const zoom = 18;
    const startLat = SPAWN_LAT;
    const startLng = SPAWN_LNG;
    
    // Convert tile coordinates to lat/lng bounds
    const n = Math.pow(2, zoom);
    
    // Get tile bounds
    const tileLngMin = (tileX / n) * 360 - 180;
    const tileLngMax = ((tileX + 1) / n) * 360 - 180;
    
    const tileLatMin = Math.atan(Math.sinh(Math.PI * (1 - 2 * (tileY + 1) / n))) * 180 / Math.PI;
    const tileLatMax = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileY / n))) * 180 / Math.PI;
    
    // Calculate center position
    const centerLat = (tileLatMin + tileLatMax) / 2;
    const centerLng = (tileLngMin + tileLngMax) / 2;
    
    // Calculate tile size in meters
    const metersPerDegree = 111320;
    const latDiff = tileLatMax - tileLatMin;
    const lngDiff = tileLngMax - tileLngMin;
    
    const tileSizeZ = latDiff * metersPerDegree;
    const tileSizeX = lngDiff * metersPerDegree * Math.cos(centerLat * Math.PI / 180);
    
    // Calculate world position relative to start position
    const worldX = (centerLng - startLng) * metersPerDegree * Math.cos(startLat * Math.PI / 180);
    const worldZ = -(centerLat - startLat) * metersPerDegree;
    
    // Create geometry matching the tile size
    const geometry = new THREE.PlaneGeometry(tileSizeX, tileSizeZ, 1, 1);
    
    // Create canvas for this tile
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    const groundTexture = new THREE.CanvasTexture(canvas);
    groundTexture.wrapS = THREE.ClampToEdgeWrapping;
    groundTexture.wrapT = THREE.ClampToEdgeWrapping;
    
    // Load single tile
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
        ctx.drawImage(img, 0, 0, 256, 256);
        groundTexture.needsUpdate = true;
        if (onLoad) onLoad();
    };
    img.onerror = function() {
        // Fallback: green with grid
        ctx.fillStyle = '#7cb342';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#558b2f';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 256, 256);
        // Draw tile coordinates for debugging
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText(`${tileX},${tileY}`, 10, 30);
        groundTexture.needsUpdate = true;
        if (onLoad) onLoad();
    };
    img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;
    
    const material = new THREE.MeshStandardMaterial({ 
        map: groundTexture,
        roughness: 0.8,
        metalness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(worldX, 0, worldZ);
    mesh.receiveShadow = true;
    
    // Make terrain visible to both cameras (layers 0 and 1)
    mesh.layers.enable(0);
    mesh.layers.enable(1);
    
    scene.add(mesh);
    
    // Store chunk data
    terrainChunks.set(chunkKey, {
        mesh: mesh,
        tileX: tileX,
        tileY: tileY,
        worldX: worldX,
        worldZ: worldZ
    });
}

// Wrapper for backward compatibility
function createTerrainChunk(tileX, tileY) {
    createTerrainChunkWithCallback(tileX, tileY, null);
}

// Update terrain based on drone position
function updateTerrain(droneX, droneZ) {
    // If using Google 3D terrain, update tiles
    if (use3DTerrain && googleTerrain) {
        googleTerrain.update(camera);
        return;
    }
    
    // Otherwise use legacy terrain system
    // Convert drone world position to lat/lng
    const startLat = SPAWN_LAT;
    const startLng = SPAWN_LNG;
    const metersPerDegree = 111320;
    
    const droneLat = startLat - droneZ / metersPerDegree;
    const droneLng = startLng + droneX / (metersPerDegree * Math.cos(startLat * Math.PI / 180));
    
    // Convert to tile coordinates at zoom 18 (higher resolution)
    const zoom = 18;
    const n = Math.pow(2, zoom);
    const lat_rad = droneLat * Math.PI / 180;
    
    const currentTileX = Math.floor((droneLng + 180) / 360 * n);
    const currentTileY = Math.floor((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2 * n);
    
    // Only update if we've moved to a new tile
    if (currentTileX === lastChunkX && currentTileY === lastChunkZ) {
        return;
    }
    
    lastChunkX = currentTileX;
    lastChunkZ = currentTileY;
    
    // Calculate optimal tile radius based on fog distance and altitude
    // Fog ends at 1000m, tiles are ~40m each at this zoom, add buffer
    const fogDistance = 1000;
    const tileSize = 40; // Approximate tile size in meters at zoom 18
    const buffer = 2; // Reduced buffer for efficiency
    const tileRadius = Math.ceil(fogDistance / tileSize) + buffer;
    
    // Get drone heading to determine forward direction
    const heading = droneState.rotation.y;
    
    // Create array of tiles to load, sorted by distance from center
    const tilesToLoad = [];
    
    for (let x = currentTileX - tileRadius; x <= currentTileX + tileRadius; x++) {
        for (let y = currentTileY - tileRadius; y <= currentTileY + tileRadius; y++) {
            const dx = x - currentTileX;
            const dy = y - currentTileY;
            
            // Calculate angle from drone to this tile (in tile space)
            // Drone heading: 0 = north (positive Z), need to match coordinate system
            const angleToTile = Math.atan2(dx, dy);
            
            // Calculate angle difference from drone heading
            let angleDiff = angleToTile - heading;
            // Normalize to -PI to PI
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            // Only load tiles in front and to the sides (270 degree field)
            // This covers forward view plus generous sides
            if (Math.abs(angleDiff) < Math.PI * 0.75) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                tilesToLoad.push({ x, y, distance });
            }
        }
    }
    
    // Sort by distance - load closest tiles first
    tilesToLoad.sort((a, b) => a.distance - b.distance);
    
    // Batch load tiles - limit to prevent lag
    const maxTilesPerFrame = 10; // Only create 10 tiles per frame
    let tilesCreated = 0;
    
    for (const tile of tilesToLoad) {
        // Check if tile already exists before trying to create
        const chunkKey = `${tile.x},${tile.y}`;
        if (!terrainChunks.has(chunkKey)) {
            createTerrainChunk(tile.x, tile.y);
            tilesCreated++;
            
            // Stop after creating max tiles this frame
            if (tilesCreated >= maxTilesPerFrame) {
                break;
            }
        }
    }
    
    // Remove tiles that are too far away - more aggressive cleanup
    const unloadDistance = tileRadius + 5; // Unload tiles beyond this distance
    const maxTilesToUnload = 5; // Limit unloads per frame to prevent lag spikes
    let tilesUnloaded = 0;
    
    terrainChunks.forEach((chunk, key) => {
        const dx = chunk.tileX - currentTileX;
        const dy = chunk.tileY - currentTileY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Unload if too far OR if behind the drone (not in view cone)
        if (distance > unloadDistance) {
            if (tilesUnloaded < maxTilesToUnload) {
                scene.remove(chunk.mesh);
                chunk.mesh.geometry.dispose();
                chunk.mesh.material.map.dispose();
                chunk.mesh.material.dispose();
                terrainChunks.delete(key);
                tilesUnloaded++;
            }
        }
    });
}

// Initialize Leaflet map
function initMap() {
    // Center on Norway location
    const startLat = SPAWN_LAT;
    const startLng = SPAWN_LNG;
    
    map = L.map('map', {
        zoomControl: true,
        attributionControl: false
    }).setView([startLat, startLng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);
    
    // Drone marker
    const droneIcon = L.divIcon({
        className: 'drone-marker',
        html: '<div style="width: 20px; height: 20px; background: #e74c3c; border: 2px solid #00ff00; border-radius: 50%; box-shadow: 0 0 10px rgba(0,255,0,0.8);"></div>',
        iconSize: [20, 20]
    });
    
    droneMarker = L.marker([startLat, startLng], { icon: droneIcon }).addTo(map);
    
    // Create view cone for drone direction
    droneViewCone = L.polygon([[startLat, startLng], [startLat, startLng], [startLat, startLng]], {
        color: '#ffff00',
        fillColor: '#ffff00',
        fillOpacity: 0.3,
        weight: 3,
        opacity: 0.8
    }).addTo(map);
    
    // Click on map to teleport drone
    map.on('click', function(e) {
        const clickedLat = e.latlng.lat;
        const clickedLng = e.latlng.lng;
        
        // Convert lat/lng to world coordinates
        const metersPerDegree = 111320;
        const newX = (clickedLng - SPAWN_LNG) * metersPerDegree * Math.cos(SPAWN_LAT * Math.PI / 180);
        const newZ = -(clickedLat - SPAWN_LAT) * metersPerDegree;
        
        // Teleport drone
        droneState.position.x = newX;
        droneState.position.z = newZ;
        droneState.velocity = { x: 0, y: 0, z: 0 };
        
        console.log(`Teleported to: ${newX.toFixed(1)}, ${newZ.toFixed(1)}`);
    });
}

// Create 3D model for landmark based on type
function createLandmarkModel(landmark) {
    const group = new THREE.Group();
    
    switch(landmark.type) {
        case 'building':
            // Create a modern building
            const buildingGeo = new THREE.BoxGeometry(landmark.scale, landmark.height, landmark.scale);
            const buildingMat = new THREE.MeshStandardMaterial({ 
                color: landmark.color,
                metalness: 0.3,
                roughness: 0.7
            });
            const building = new THREE.Mesh(buildingGeo, buildingMat);
            building.position.y = landmark.height / 2;
            building.castShadow = true;
            building.receiveShadow = true;
            group.add(building);
            
            // Add windows
            const windowGeo = new THREE.PlaneGeometry(1.5, 2);
            const windowMat = new THREE.MeshStandardMaterial({ 
                color: 0x4488ff,
                emissive: 0x2244aa,
                emissiveIntensity: 0.3
            });
            for (let y = 5; y < landmark.height - 5; y += 5) {
                for (let x = -landmark.scale/2 + 3; x < landmark.scale/2; x += 4) {
                    const window1 = new THREE.Mesh(windowGeo, windowMat);
                    window1.position.set(x, y, landmark.scale/2 + 0.1);
                    group.add(window1);
                    
                    const window2 = new THREE.Mesh(windowGeo, windowMat);
                    window2.position.set(x, y, -landmark.scale/2 - 0.1);
                    window2.rotation.y = Math.PI;
                    group.add(window2);
                }
            }
            break;
            
        case 'tower':
            // Create a ski jump tower
            const towerGeo = new THREE.CylinderGeometry(2, 5, landmark.height, 8);
            const towerMat = new THREE.MeshStandardMaterial({ 
                color: landmark.color,
                metalness: 0.5,
                roughness: 0.5
            });
            const tower = new THREE.Mesh(towerGeo, towerMat);
            tower.position.y = landmark.height / 2;
            tower.castShadow = true;
            group.add(tower);
            
            // Add observation deck
            const deckGeo = new THREE.CylinderGeometry(8, 8, 3, 16);
            const deck = new THREE.Mesh(deckGeo, towerMat);
            deck.position.y = landmark.height - 2;
            group.add(deck);
            break;
            
        case 'castle':
            // Create a fortress
            const fortressGeo = new THREE.BoxGeometry(landmark.scale, landmark.height, landmark.scale);
            const fortressMat = new THREE.MeshStandardMaterial({ 
                color: landmark.color,
                roughness: 0.9
            });
            const fortress = new THREE.Mesh(fortressGeo, fortressMat);
            fortress.position.y = landmark.height / 2;
            fortress.castShadow = true;
            group.add(fortress);
            
            // Add towers at corners
            const towerPositions = [
                [-landmark.scale/2, 0, -landmark.scale/2],
                [landmark.scale/2, 0, -landmark.scale/2],
                [-landmark.scale/2, 0, landmark.scale/2],
                [landmark.scale/2, 0, landmark.scale/2]
            ];
            towerPositions.forEach(pos => {
                const ctowerGeo = new THREE.CylinderGeometry(3, 3, landmark.height + 10, 8);
                const ctower = new THREE.Mesh(ctowerGeo, fortressMat);
                ctower.position.set(pos[0], landmark.height / 2 + 5, pos[2]);
                ctower.castShadow = true;
                group.add(ctower);
                
                // Add cone roof
                const roofGeo = new THREE.ConeGeometry(4, 8, 8);
                const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
                const roof = new THREE.Mesh(roofGeo, roofMat);
                roof.position.set(pos[0], landmark.height + 14, pos[2]);
                group.add(roof);
            });
            break;
            
        case 'palace':
            // Create a palace
            const palaceGeo = new THREE.BoxGeometry(landmark.scale * 1.5, landmark.height, landmark.scale);
            const palaceMat = new THREE.MeshStandardMaterial({ 
                color: landmark.color,
                metalness: 0.1,
                roughness: 0.8
            });
            const palace = new THREE.Mesh(palaceGeo, palaceMat);
            palace.position.y = landmark.height / 2;
            palace.castShadow = true;
            group.add(palace);
            
            // Add columns
            const columnGeo = new THREE.CylinderGeometry(1, 1, landmark.height - 2, 12);
            const columnMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
            for (let x = -landmark.scale * 0.6; x <= landmark.scale * 0.6; x += 5) {
                const column = new THREE.Mesh(columnGeo, columnMat);
                column.position.set(x, landmark.height / 2, landmark.scale / 2 + 1);
                column.castShadow = true;
                group.add(column);
            }
            
            // Add dome
            const domeGeo = new THREE.SphereGeometry(8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const domeMat = new THREE.MeshStandardMaterial({ 
                color: 0xffd700,
                metalness: 0.8,
                roughness: 0.2
            });
            const dome = new THREE.Mesh(domeGeo, domeMat);
            dome.position.y = landmark.height + 2;
            group.add(dome);
            break;
            
        case 'monument':
            // Create the Vigeland monolith
            const monolithGeo = new THREE.CylinderGeometry(2, 3, landmark.height, 8);
            const monolithMat = new THREE.MeshStandardMaterial({ 
                color: landmark.color,
                roughness: 0.8
            });
            const monolith = new THREE.Mesh(monolithGeo, monolithMat);
            monolith.position.y = landmark.height / 2;
            monolith.castShadow = true;
            group.add(monolith);
            
            // Add decorative base
            const baseGeo = new THREE.CylinderGeometry(5, 6, 3, 16);
            const base = new THREE.Mesh(baseGeo, monolithMat);
            base.position.y = 1.5;
            group.add(base);
            break;
    }
    
    // Add info label
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(landmark.name, 256, 70);
    
    const labelTexture = new THREE.CanvasTexture(canvas);
    const labelGeo = new THREE.PlaneGeometry(20, 5);
    const labelMat = new THREE.MeshBasicMaterial({ 
        map: labelTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.y = landmark.height + 10;
    group.add(label);
    
    // Make label always face camera
    group.userData.label = label;
    
    // Make landmark visible to both cameras
    group.traverse((child) => {
        if (child.isMesh) {
            child.layers.enable(0);
            child.layers.enable(1);
        }
    });
    
    return group;
}

// Update landmarks based on drone position
function updateLandmarks() {
    const metersPerDegree = 111320;
    
    landmarks.forEach(landmark => {
        // Calculate world position of landmark
        const landmarkX = (landmark.lng - SPAWN_LNG) * metersPerDegree * Math.cos(SPAWN_LAT * Math.PI / 180);
        const landmarkZ = -(landmark.lat - SPAWN_LAT) * metersPerDegree;
        
        // Calculate distance from drone
        const dx = droneState.position.x - landmarkX;
        const dz = droneState.position.z - landmarkZ;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Load landmark if close enough and not already loaded
        if (distance < landmarkLoadDistance && !loadedLandmarks.has(landmark.id)) {
            const model = createLandmarkModel(landmark);
            model.position.set(landmarkX, 0, landmarkZ);
            scene.add(model);
            loadedLandmarks.set(landmark.id, {
                model: model,
                landmark: landmark,
                worldX: landmarkX,
                worldZ: landmarkZ
            });
            console.log(`Loaded landmark: ${landmark.name}`);
            
            // Add marker to map
            const marker = L.marker([landmark.lat, landmark.lng], {
                icon: L.divIcon({
                    className: 'landmark-marker',
                    html: `<div style="background: #ff0000; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #ffff00;"></div>`,
                    iconSize: [12, 12]
                })
            }).addTo(map);
            marker.bindPopup(landmark.name);
            loadedLandmarks.get(landmark.id).marker = marker;
        }
        
        // Unload landmark if too far away
        if (distance > landmarkUnloadDistance && loadedLandmarks.has(landmark.id)) {
            const loaded = loadedLandmarks.get(landmark.id);
            scene.remove(loaded.model);
            if (loaded.marker) {
                map.removeLayer(loaded.marker);
            }
            loadedLandmarks.delete(landmark.id);
            console.log(`Unloaded landmark: ${landmark.name}`);
        }
        
        // Update label rotation to face camera
        if (loadedLandmarks.has(landmark.id)) {
            const loaded = loadedLandmarks.get(landmark.id);
            if (loaded.model.userData.label) {
                loaded.model.userData.label.lookAt(camera.position);
            }
        }
    });
}

// Setup controls
function setupControls() {
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        
        // Toggle camera view
        if (e.key.toLowerCase() === 'v') {
            cameraMode = cameraMode === 'follow' ? 'fpv' : 'follow';
        }
        
        // Reset drone
        if (e.key.toLowerCase() === 'r') {
            droneState.position = { x: 0, y: 50, z: 0 };
            droneState.velocity = { x: 0, y: 0, z: 0 };
            droneState.rotation = { x: 0, y: 0, z: 0 };
            droneState.speed = 0;
        }
        
        // Map size controls
        if (e.key.toLowerCase() === 'm') {
            currentSizeIndex = (currentSizeIndex + 1) % mapSizes.length;
            mapSize = mapSizes[currentSizeIndex];
            resizeMap();
        }
        
        // Toggle map centering
        if (e.key.toLowerCase() === 'c') {
            mapCentered = !mapCentered;
            console.log('Map centering:', mapCentered ? 'ON' : 'OFF');
        }
        
        // Toggle bottom camera
        if (e.key.toLowerCase() === 'b') {
            toggleBottomCamera();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    // Mouse wheel zoom
    window.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        if (cameraMode === 'follow' || freeCameraMode) {
            // Zoom in/out by adjusting camera distance
            cameraDistance += e.deltaY * 0.1;
            cameraDistance = Math.max(minCameraDistance, Math.min(maxCameraDistance, cameraDistance));
        }
    }, { passive: false });
    
    // Middle mouse button for free camera
    window.addEventListener('mousedown', (e) => {
        if (e.button === 1) { // Middle mouse button
            e.preventDefault();
            isMiddleMouseDown = true;
            freeCameraMode = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            
            // Always calculate angles from current camera position
            const dx = camera.position.x - droneState.position.x;
            const dy = camera.position.y - droneState.position.y;
            const dz = camera.position.z - droneState.position.z;
            const horizontalDist = Math.sqrt(dx * dx + dz * dz);
            freeCameraAngleH = Math.atan2(dx, dz);
            freeCameraAngleV = Math.atan2(dy, horizontalDist);
        }
    });
    
    window.addEventListener('mouseup', (e) => {
        if (e.button === 1) {
            isMiddleMouseDown = false;
            // Keep freeCameraMode active so camera stays in place
        }
    });
    
    window.addEventListener('mousemove', (e) => {
        if (isMiddleMouseDown) {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            
            // Update camera angles
            freeCameraAngleH -= deltaX * 0.005;
            freeCameraAngleV = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, freeCameraAngleV - deltaY * 0.005));
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });
}

// Resize map function
function resizeMap() {
    const mapElement = document.getElementById('map');
    mapElement.style.width = mapSize + 'px';
    mapElement.style.height = mapSize + 'px';
    
    // Invalidate map size to force Leaflet to recalculate
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

// Update drone view cone on map
function updateDroneViewCone(lat, lng) {
    // Calculate view cone based on drone heading and camera FOV
    const heading = droneState.rotation.y; // in radians
    const fov = 75 * Math.PI / 180; // Camera FOV in radians
    const coneLength = 1000; // meters - increased for visibility
    
    const metersPerDegree = 111320;
    const metersPerDegreeLng = metersPerDegree * Math.cos(lat * Math.PI / 180);
    
    // Calculate cone points
    const leftAngle = heading - fov / 2;
    const rightAngle = heading + fov / 2;
    
    // Left point of cone
    const leftX = Math.sin(leftAngle) * coneLength;
    const leftZ = Math.cos(leftAngle) * coneLength;
    const leftLat = lat - (leftZ / metersPerDegree);
    const leftLng = lng + (leftX / metersPerDegreeLng);
    
    // Right point of cone
    const rightX = Math.sin(rightAngle) * coneLength;
    const rightZ = Math.cos(rightAngle) * coneLength;
    const rightLat = lat - (rightZ / metersPerDegree);
    const rightLng = lng + (rightX / metersPerDegreeLng);
    
    // Update polygon
    droneViewCone.setLatLngs([
        [lat, lng],
        [leftLat, leftLng],
        [rightLat, rightLng]
    ]);
}

// Update drone physics
function updateDrone(deltaTime) {
    // Rotation controls
    if (keys['q']) {
        droneState.rotation.y += droneState.rotationSpeed;
    }
    if (keys['e']) {
        droneState.rotation.y -= droneState.rotationSpeed;
    }
    
    // Calculate forward direction based on rotation
    const forward = {
        x: Math.sin(droneState.rotation.y),
        z: Math.cos(droneState.rotation.y)
    };
    
    const right = {
        x: Math.cos(droneState.rotation.y),
        z: -Math.sin(droneState.rotation.y)
    };
    
    // Movement controls
    if (keys['w']) {
        droneState.velocity.x += forward.x * droneState.acceleration;
        droneState.velocity.z += forward.z * droneState.acceleration;
    }
    if (keys['s']) {
        droneState.velocity.x -= forward.x * droneState.acceleration;
        droneState.velocity.z -= forward.z * droneState.acceleration;
    }
    if (keys['a']) {
        droneState.velocity.x += right.x * droneState.acceleration;
        droneState.velocity.z += right.z * droneState.acceleration;
    }
    if (keys['d']) {
        droneState.velocity.x -= right.x * droneState.acceleration;
        droneState.velocity.z -= right.z * droneState.acceleration;
    }
    
    // Vertical controls
    if (keys[' ']) {
        droneState.velocity.y += droneState.liftSpeed * deltaTime;
    }
    if (keys['shift']) {
        droneState.velocity.y -= droneState.liftSpeed * deltaTime;
    }
    
    // Apply drag
    droneState.velocity.x *= droneState.drag;
    droneState.velocity.y *= droneState.drag;
    droneState.velocity.z *= droneState.drag;
    
    // Limit speed
    const currentSpeed = Math.sqrt(
        droneState.velocity.x ** 2 + 
        droneState.velocity.z ** 2
    );
    
    if (currentSpeed > droneState.maxSpeed) {
        const ratio = droneState.maxSpeed / currentSpeed;
        droneState.velocity.x *= ratio;
        droneState.velocity.z *= ratio;
    }
    
    // Update position
    droneState.position.x += droneState.velocity.x;
    droneState.position.y += droneState.velocity.y;
    droneState.position.z += droneState.velocity.z;
    
    // Keep above ground with terrain collision
    let minHeight = 2;
    
    if (use3DTerrain && googleTerrain) {
        // Get actual terrain height at drone position
        const latLng = googleTerrain.worldToLatLng(
            droneState.position.x,
            droneState.position.y,
            droneState.position.z
        );
        const terrainHeight = googleTerrain.getTerrainHeight(latLng.lat, latLng.lng);
        minHeight = terrainHeight + 2; // Stay 2m above terrain
    }
    
    if (droneState.position.y < minHeight) {
        droneState.position.y = minHeight;
        droneState.velocity.y = 0;
    }
    
    // Calculate realistic tilt based on movement direction in world space
    const maxTiltAngle = Math.PI / 6; // 30 degrees max tilt to prevent flipping
    const tiltResponsiveness = 0.15; // How quickly drone tilts (lower = smoother)
    
    // Calculate movement direction from horizontal velocity
    const horizontalSpeed = Math.sqrt(droneState.velocity.x ** 2 + droneState.velocity.z ** 2);
    
    if (horizontalSpeed > 0.1) {
        // Get the direction of movement in world space
        const moveAngle = Math.atan2(droneState.velocity.x, droneState.velocity.z);
        
        // Calculate angle difference between movement and drone heading
        let angleDiff = moveAngle - droneState.rotation.y;
        // Normalize to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Calculate target pitch (tilt forward/back based on speed)
        // Use cos to get forward/backward component: forward = negative pitch, backward = positive pitch
        const forwardComponent = Math.cos(angleDiff);
        const targetPitch = forwardComponent * Math.min(horizontalSpeed / droneState.maxSpeed, 1.0) * maxTiltAngle;
        
        // Calculate target roll (tilt left/right when turning)
        // When moving and turning, drone banks into the turn
        const targetRoll = Math.sin(angleDiff) * Math.min(horizontalSpeed / droneState.maxSpeed, 1.0) * maxTiltAngle;
        
        // Smoothly interpolate to target tilt angles
        droneState.rotation.x += (targetPitch - droneState.rotation.x) * tiltResponsiveness;
        droneState.rotation.z += (targetRoll - droneState.rotation.z) * tiltResponsiveness;
    } else {
        // When stationary, smoothly return to level
        droneState.rotation.x *= (1 - tiltResponsiveness);
        droneState.rotation.z *= (1 - tiltResponsiveness);
    }
    
    // Safety clamp to ensure drone never flips over
    droneState.rotation.x = Math.max(-maxTiltAngle, Math.min(maxTiltAngle, droneState.rotation.x));
    droneState.rotation.z = Math.max(-maxTiltAngle, Math.min(maxTiltAngle, droneState.rotation.z));
    
    // Update speed and altitude
    droneState.speed = Math.sqrt(
        droneState.velocity.x ** 2 + 
        droneState.velocity.y ** 2 + 
        droneState.velocity.z ** 2
    );
    droneState.altitude = droneState.position.y;
    
    // Calculate heading in degrees
    droneState.heading = ((droneState.rotation.y * 180 / Math.PI) + 360) % 360;
    
    // Drain battery based on activity
    const activityLevel = Math.abs(droneState.velocity.x) + 
                          Math.abs(droneState.velocity.y) + 
                          Math.abs(droneState.velocity.z);
    droneState.battery -= (0.001 + activityLevel * 0.0001);
    droneState.battery = Math.max(0, droneState.battery);
    
    // Update drone mesh
    drone.position.set(
        droneState.position.x,
        droneState.position.y,
        droneState.position.z
    );
    drone.rotation.set(
        droneState.rotation.x,
        droneState.rotation.y,
        droneState.rotation.z
    );
    
    // Animate propellers
    if (use3DDroneModel && dronePropellers.length > 0) {
        // Animate 3D model propellers
        // Try rotating on Y axis first (most common for propellers)
        dronePropellers.forEach((propeller, index) => {
            // Spin at high speed with alternating directions for counter-rotation
            const spinSpeed = 0.3;
            const direction = index % 2 === 0 ? 1 : -1;
            propeller.rotation.y += spinSpeed * direction;
        });
    } else {
        // Animate fallback model propellers
        drone.children.forEach(child => {
            if (child.userData.propeller) {
                child.rotation.y += 0.5 * child.userData.direction;
            }
        });
    }
    
    // Update map marker (scale adjusted to match ground texture)
    const metersPerDegree = 111320; // meters per degree at equator
    const scale = 1 / metersPerDegree;
    const newLat = SPAWN_LAT - droneState.position.z * scale;
    const newLng = SPAWN_LNG + droneState.position.x * scale / Math.cos(SPAWN_LAT * Math.PI / 180);
    droneMarker.setLatLng([newLat, newLng]);
    
    // Update view cone
    updateDroneViewCone(newLat, newLng);
    
    // Center map on drone if enabled
    if (mapCentered) {
        map.panTo([newLat, newLng], { animate: false });
    }
}

// Update camera
function updateCamera() {
    // Check if drone is moving - if so, smoothly transition out of free camera mode (only when not holding middle mouse)
    const isMoving = Math.abs(droneState.velocity.x) > 0.1 || 
                     Math.abs(droneState.velocity.y) > 0.1 || 
                     Math.abs(droneState.velocity.z) > 0.1;
    
    if (freeCameraMode && isMoving && !isMiddleMouseDown) {
        // Smoothly transition back to follow mode
        freeCameraMode = false;
    }
    
    if (cameraMode === 'follow') {
        if (freeCameraMode && isMiddleMouseDown) {
            // Free camera mode - orbit around drone
            const targetX = droneState.position.x + Math.sin(freeCameraAngleH) * Math.cos(freeCameraAngleV) * cameraDistance;
            const targetY = droneState.position.y + Math.sin(freeCameraAngleV) * cameraDistance;
            const targetZ = droneState.position.z + Math.cos(freeCameraAngleH) * Math.cos(freeCameraAngleV) * cameraDistance;
            
            camera.position.lerp(
                new THREE.Vector3(targetX, targetY, targetZ),
                0.1
            );
            camera.lookAt(
                droneState.position.x,
                droneState.position.y,
                droneState.position.z
            );
        } else if (freeCameraMode) {
            // Free camera mode but not dragging - maintain position with updated distance
            const targetX = droneState.position.x + Math.sin(freeCameraAngleH) * Math.cos(freeCameraAngleV) * cameraDistance;
            const targetY = droneState.position.y + Math.sin(freeCameraAngleV) * cameraDistance;
            const targetZ = droneState.position.z + Math.cos(freeCameraAngleH) * Math.cos(freeCameraAngleV) * cameraDistance;
            
            camera.position.lerp(
                new THREE.Vector3(targetX, targetY, targetZ),
                0.1
            );
            camera.lookAt(
                droneState.position.x,
                droneState.position.y,
                droneState.position.z
            );
        } else {
            // Follow camera with adjustable distance
            const cameraHeight = 80;
            const targetX = droneState.position.x - Math.sin(droneState.rotation.y) * cameraDistance;
            const targetY = droneState.position.y + cameraHeight;
            const targetZ = droneState.position.z - Math.cos(droneState.rotation.y) * cameraDistance;
            
            camera.position.lerp(
                new THREE.Vector3(targetX, targetY, targetZ),
                0.1
            );
            camera.lookAt(
                droneState.position.x,
                droneState.position.y,
                droneState.position.z
            );
        }
    } else {
        // FPV camera
        camera.position.set(
            droneState.position.x,
            droneState.position.y,
            droneState.position.z
        );
        
        const lookAtX = droneState.position.x + Math.sin(droneState.rotation.y) * 100;
        const lookAtY = droneState.position.y - 10;
        const lookAtZ = droneState.position.z + Math.cos(droneState.rotation.y) * 100;
        
        camera.lookAt(lookAtX, lookAtY, lookAtZ);
    }
}

// Update bottom camera (looks straight down from drone)
function updateBottomCamera() {
    if (bottomCameraVisible) {
        // Position camera at drone location
        bottomCamera.position.set(
            droneState.position.x,
            droneState.position.y,
            droneState.position.z
        );
        
        // Look straight down
        bottomCamera.lookAt(
            droneState.position.x,
            droneState.position.y - 100,
            droneState.position.z
        );
        
        // Rotate camera to match drone heading (90 degrees clockwise offset)
        bottomCamera.rotation.z = -droneState.rotation.y - Math.PI / 2;
    }
}

// Update HUD
function updateHUD() {
    document.getElementById('altitude').textContent = droneState.altitude.toFixed(1) + ' m';
    document.getElementById('speed').textContent = droneState.speed.toFixed(1) + ' m/s';
    document.getElementById('battery').textContent = droneState.battery.toFixed(0) + '%';
    document.getElementById('position').textContent = 
        droneState.position.x.toFixed(1) + ', ' + droneState.position.z.toFixed(1);
    document.getElementById('heading').textContent = droneState.heading.toFixed(0) + '°';
    
    // Battery warning
    const batteryElement = document.getElementById('battery');
    if (droneState.battery < 20) {
        batteryElement.classList.add('low');
    } else {
        batteryElement.classList.remove('low');
    }
    
    // Update attitude indicator (pitch and roll)
    const horizonRotation = document.getElementById('horizon-rotation');
    if (horizonRotation) {
        const pitchDegrees = droneState.rotation.x * 180 / Math.PI;
        const rollDegrees = droneState.rotation.z * 180 / Math.PI;
        
        // Rotate for roll, translate for pitch (3 pixels per degree)
        const pitchOffset = pitchDegrees * 3;
        horizonRotation.style.transform = `translate(-50%, calc(-50% + ${pitchOffset}px)) rotate(${-rollDegrees}deg)`;
    }
    
    // Update heading tape
    const headingTape = document.querySelector('.heading-tape');
    if (headingTape) {
        // Move tape based on heading (each segment is roughly 40px apart, representing 30 degrees)
        const tapeOffset = -(droneState.heading / 30) * 40;
        headingTape.style.transform = `translate(calc(-50% + ${tapeOffset}px), -50%)`;
    }
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
let lastTime = Date.now();

function animate() {
    requestAnimationFrame(animate);
    
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    updateDrone(deltaTime);
    updateCamera();
    updateBottomCamera();
    updateHUD();
    updateTerrain(droneState.position.x, droneState.position.z);
    updateLandmarks();
    
    renderer.render(scene, camera);
    
    // Render bottom camera if visible
    if (bottomCameraVisible) {
        bottomRenderer.render(scene, bottomCamera);
    }
}

// Wait for all libraries to load before starting
window.addEventListener('load', () => {
    // Give a small delay to ensure all scripts are fully initialized
    setTimeout(() => {
        console.log('Loader3DTiles available:', typeof Loader3DTiles !== 'undefined');
        init();
    }, 100);
});