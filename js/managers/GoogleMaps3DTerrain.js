/**
 * Google Maps 3D Terrain Manager
 * Handles loading and rendering of Google's Photorealistic 3D Tiles
 */

import { Loader3DTiles } from 'three-loader-3dtiles';

class GoogleMaps3DTerrain {
    constructor(scene, apiKey) {
        this.scene = scene;
        this.apiKey = apiKey;
        this.tilesRuntime = null;
        this.rootTileset = null;
        this.loaded = false;
        this.centerLat = 59.113277; // Norway spawn
        this.centerLng = 10.110296;
        this.centerAlt = 0;
    }

    /**
     * Initialize the Google 3D Tiles loader
     */
    async init() {
        try {
            // Google's Photorealistic 3D Tiles endpoint
            const tilesetUrl = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${this.apiKey}`;
            
            // Configure the loader
            const loader = new Loader3DTiles({
                renderer: window.renderer,
                options: {
                    dracoDecoderPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
                    basisTranscoderPath: 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/',
                    maximumScreenSpaceError: 48, // Lower = higher quality, more tiles
                    maximumMemoryUsage: 512, // MB
                    viewDistanceScale: 1.5,
                    skipLevelOfDetail: false,
                    updateTransforms: true,
                    pointCloudShading: false,
                    cacheBytes: 500 * 1024 * 1024 // 500 MB cache
                }
            });

            // Load the tileset
            this.tilesRuntime = await loader.load(tilesetUrl);
            this.rootTileset = this.tilesRuntime.root;

            // Enable shadows on 3D tiles
            this.rootTileset.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // Enable for both cameras (layer 0 and 1)
                    child.layers.enable(0);
                    child.layers.enable(1);
                }
            });

            // Add to scene
            this.scene.add(this.rootTileset);
            
            // Set initial camera position
            this.setCameraToLocation(this.centerLat, this.centerLng, 100);
            
            this.loaded = true;
            console.log('Google 3D Tiles loaded successfully');
            
            return true;
        } catch (error) {
            console.error('Error loading Google 3D Tiles:', error);
            return false;
        }
    }

    /**
     * Update tiles based on camera position
     */
    update(camera) {
        if (this.tilesRuntime && this.loaded) {
            // Update tiles LOD based on camera position
            this.tilesRuntime.update(camera);
        }
    }

    /**
     * Convert lat/lng to Three.js world coordinates
     */
    latLngToWorld(lat, lng, alt = 0) {
        const R = 6371000; // Earth radius in meters
        
        // Convert to radians
        const latRad = lat * Math.PI / 180;
        const lngRad = lng * Math.PI / 180;
        const centerLatRad = this.centerLat * Math.PI / 180;
        const centerLngRad = this.centerLng * Math.PI / 180;
        
        // Calculate offset in meters
        const x = R * (lngRad - centerLngRad) * Math.cos(centerLatRad);
        const z = -R * (latRad - centerLatRad);
        const y = alt;
        
        return { x, y, z };
    }

    /**
     * Convert Three.js world coordinates to lat/lng
     */
    worldToLatLng(x, y, z) {
        const R = 6371000; // Earth radius in meters
        const centerLatRad = this.centerLat * Math.PI / 180;
        
        // Calculate lat/lng offset
        const lngOffset = x / (R * Math.cos(centerLatRad));
        const latOffset = -z / R;
        
        const lat = this.centerLat + (latOffset * 180 / Math.PI);
        const lng = this.centerLng + (lngOffset * 180 / Math.PI);
        const alt = y;
        
        return { lat, lng, alt };
    }

    /**
     * Set camera to a specific location
     */
    setCameraToLocation(lat, lng, alt) {
        const pos = this.latLngToWorld(lat, lng, alt);
        if (window.camera) {
            window.camera.position.set(pos.x, pos.y, pos.z);
        }
    }

    /**
     * Get terrain height at a specific lat/lng (raycast down)
     */
    getTerrainHeight(lat, lng) {
        if (!this.rootTileset) return 0;
        
        const pos = this.latLngToWorld(lat, lng, 1000);
        
        const raycaster = new THREE.Raycaster();
        raycaster.set(
            new THREE.Vector3(pos.x, pos.y, pos.z),
            new THREE.Vector3(0, -1, 0)
        );
        
        const intersects = raycaster.intersectObject(this.rootTileset, true);
        
        if (intersects.length > 0) {
            return intersects[0].point.y;
        }
        
        return 0;
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        if (this.rootTileset) {
            this.scene.remove(this.rootTileset);
            this.rootTileset.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        this.tilesRuntime = null;
        this.rootTileset = null;
        this.loaded = false;
    }

    /**
     * Set center location for coordinate conversions
     */
    setCenter(lat, lng, alt = 0) {
        this.centerLat = lat;
        this.centerLng = lng;
        this.centerAlt = alt;
    }
}

export default GoogleMaps3DTerrain;
