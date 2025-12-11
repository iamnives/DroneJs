// Terrain manager
class TerrainManager {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.lastTileX = null;
        this.lastTileY = null;
    }
    
    update(droneX, droneZ) {
        const { lat, lng } = CoordinateUtils.worldToLatLng(droneX, droneZ);
        const { tileX, tileY } = CoordinateUtils.latLngToTile(lat, lng, CONFIG.MAP.TILE_ZOOM);
        
        // Only update if we've moved to a new tile
        if (tileX === this.lastTileX && tileY === this.lastTileY) {
            return;
        }
        
        this.lastTileX = tileX;
        this.lastTileY = tileY;
        
        this.loadTilesAround(tileX, tileY);
        this.cleanupDistantTiles(tileX, tileY);
    }
    
    loadTilesAround(centerX, centerY) {
        const { TILE_RADIUS } = CONFIG.TERRAIN;
        
        for (let x = centerX - TILE_RADIUS; x <= centerX + TILE_RADIUS; x++) {
            for (let y = centerY - TILE_RADIUS; y <= centerY + TILE_RADIUS; y++) {
                this.createTile(x, y);
            }
        }
    }
    
    cleanupDistantTiles(centerX, centerY) {
        const { TILE_RADIUS, MAX_DISTANCE_BUFFER } = CONFIG.TERRAIN;
        const maxDistance = TILE_RADIUS + MAX_DISTANCE_BUFFER;
        
        this.chunks.forEach((chunk, key) => {
            const dx = Math.abs(chunk.tileX - centerX);
            const dy = Math.abs(chunk.tileY - centerY);
            
            if (dx > maxDistance || dy > maxDistance) {
                this.scene.remove(chunk.mesh);
                chunk.mesh.geometry.dispose();
                chunk.mesh.material.map.dispose();
                chunk.mesh.material.dispose();
                this.chunks.delete(key);
            }
        });
    }
    
    createTile(tileX, tileY) {
        const chunkKey = `${tileX},${tileY}`;
        
        if (this.chunks.has(chunkKey)) {
            return;
        }
        
        const tileInfo = CoordinateUtils.getTileSizeInMeters(tileX, tileY, CONFIG.MAP.TILE_ZOOM);
        const { worldX, worldZ } = this.calculateWorldPosition(tileInfo.centerLat, tileInfo.centerLng);
        
        const geometry = new THREE.PlaneGeometry(tileInfo.sizeX, tileInfo.sizeZ, 1, 1);
        const texture = this.createTileTexture(tileX, tileY);
        const material = new THREE.MeshStandardMaterial({ 
            map: texture,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(worldX, 0, worldZ);
        mesh.receiveShadow = true;
        
        this.scene.add(mesh);
        
        this.chunks.set(chunkKey, {
            mesh,
            tileX,
            tileY,
            worldX,
            worldZ
        });
    }
    
    calculateWorldPosition(centerLat, centerLng) {
        return CoordinateUtils.latLngToWorld(centerLat, centerLng);
    }
    
    createTileTexture(tileX, tileY) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            ctx.drawImage(img, 0, 0, 256, 256);
            texture.needsUpdate = true;
        };
        
        img.onerror = () => {
            this.drawFallback(ctx, tileX, tileY);
            texture.needsUpdate = true;
        };
        
        const url = CONFIG.MAP.TILE_URL
            .replace('{z}', CONFIG.MAP.TILE_ZOOM)
            .replace('{y}', tileY)
            .replace('{x}', tileX);
        
        img.src = url;
        
        return texture;
    }
    
    drawFallback(ctx, tileX, tileY) {
        ctx.fillStyle = '#7cb342';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#558b2f';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 256, 256);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText(`${tileX},${tileY}`, 10, 30);
    }
}
