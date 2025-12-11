// Map manager with Leaflet integration
class MapManager {
    constructor(droneState, onTeleport) {
        this.droneState = droneState;
        this.onTeleport = onTeleport;
        this.map = null;
        this.droneMarker = null;
        this.viewCone = null;
        this.centered = false;
        this.currentSizeIndex = CONFIG.MAP.DEFAULT_SIZE_INDEX;
        this.currentSize = CONFIG.MAP.SIZES[this.currentSizeIndex];
        
        this.init();
    }
    
    init() {
        const { START_LAT, START_LNG, DEFAULT_ZOOM, OSM_TILE_URL } = CONFIG.MAP;
        
        this.map = L.map('map', {
            zoomControl: true,
            attributionControl: false
        }).setView([START_LAT, START_LNG], DEFAULT_ZOOM);
        
        L.tileLayer(OSM_TILE_URL, {
            maxZoom: 19
        }).addTo(this.map);
        
        this.createDroneMarker(START_LAT, START_LNG);
        this.createViewCone(START_LAT, START_LNG);
        this.setupClickHandler();
    }
    
    createDroneMarker(lat, lng) {
        const droneIcon = L.divIcon({
            className: 'drone-marker',
            html: '<div style="width: 20px; height: 20px; background: #e74c3c; border: 2px solid #00ff00; border-radius: 50%; box-shadow: 0 0 10px rgba(0,255,0,0.8);"></div>',
            iconSize: [20, 20]
        });
        
        this.droneMarker = L.marker([lat, lng], { icon: droneIcon }).addTo(this.map);
    }
    
    createViewCone(lat, lng) {
        const { COLOR, FILL_OPACITY, WEIGHT, OPACITY } = CONFIG.VIEW_CONE;
        
        this.viewCone = L.polygon(
            [[lat, lng], [lat, lng], [lat, lng]], 
            {
                color: COLOR,
                fillColor: COLOR,
                fillOpacity: FILL_OPACITY,
                weight: WEIGHT,
                opacity: OPACITY
            }
        ).addTo(this.map);
    }
    
    setupClickHandler() {
        this.map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            const { x, z } = CoordinateUtils.latLngToWorld(lat, lng);
            
            if (this.onTeleport) {
                this.onTeleport(x, z);
            }
            
            console.log(`Teleported to: ${x.toFixed(1)}, ${z.toFixed(1)}`);
        });
    }
    
    update() {
        const { lat, lng } = CoordinateUtils.worldToLatLng(
            this.droneState.position.x,
            this.droneState.position.z
        );
        
        this.droneMarker.setLatLng([lat, lng]);
        this.updateViewCone(lat, lng);
        
        if (this.centered) {
            this.map.panTo([lat, lng], { animate: false });
        }
    }
    
    updateViewCone(lat, lng) {
        const { LENGTH } = CONFIG.VIEW_CONE;
        const { FOV } = CONFIG.CAMERA;
        const { METERS_PER_DEGREE } = CONFIG.TERRAIN;
        
        const heading = this.droneState.rotation.y;
        const fov = FOV * Math.PI / 180;
        
        const metersPerDegreeLng = METERS_PER_DEGREE * Math.cos(lat * Math.PI / 180);
        
        const leftAngle = heading - fov / 2;
        const rightAngle = heading + fov / 2;
        
        // Left point
        const leftX = Math.sin(leftAngle) * LENGTH;
        const leftZ = Math.cos(leftAngle) * LENGTH;
        const leftLat = lat - (leftZ / METERS_PER_DEGREE);
        const leftLng = lng + (leftX / metersPerDegreeLng);
        
        // Right point
        const rightX = Math.sin(rightAngle) * LENGTH;
        const rightZ = Math.cos(rightAngle) * LENGTH;
        const rightLat = lat - (rightZ / METERS_PER_DEGREE);
        const rightLng = lng + (rightX / metersPerDegreeLng);
        
        this.viewCone.setLatLngs([
            [lat, lng],
            [leftLat, leftLng],
            [rightLat, rightLng]
        ]);
    }
    
    toggleCentering() {
        this.centered = !this.centered;
        return this.centered;
    }
    
    cycleSize() {
        this.currentSizeIndex = (this.currentSizeIndex + 1) % CONFIG.MAP.SIZES.length;
        this.currentSize = CONFIG.MAP.SIZES[this.currentSizeIndex];
        this.resize();
        return this.currentSize;
    }
    
    resize() {
        const mapElement = document.getElementById('map');
        mapElement.style.width = this.currentSize + 'px';
        mapElement.style.height = this.currentSize + 'px';
        
        setTimeout(() => {
            this.map.invalidateSize();
        }, 100);
    }
}
