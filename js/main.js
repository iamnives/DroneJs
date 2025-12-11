// Main application class
class DroneSimulator {
    constructor() {
        this.lastTime = Date.now();
        this.init();
    }
    
    init() {
        // Core managers
        this.sceneManager = new SceneManager();
        this.inputHandler = new InputHandler();
        
        // Drone components
        this.droneState = new DroneState();
        this.droneModel = new DroneModel();
        this.dronePhysics = new DronePhysics(this.droneState);
        
        // Controllers and managers
        this.cameraController = new CameraController(
            this.sceneManager.getCamera(),
            this.droneState
        );
        this.hudController = new HUDController(this.droneState);
        this.terrainManager = new TerrainManager(this.sceneManager.getScene());
        this.mapManager = new MapManager(
            this.droneState,
            (x, z) => this.droneState.teleport(x, z)
        );
        
        // Add drone to scene
        this.sceneManager.add(this.droneModel.getGroup());
        
        // Setup input handlers
        this.setupInputHandlers();
        
        // Initial terrain load
        this.terrainManager.update(0, 0);
        
        // Start animation loop
        this.animate();
    }
    
    setupInputHandlers() {
        // Forward key states to physics
        this.inputHandler.onKeyDown((key) => {
            this.dronePhysics.setKey(key, true);
            this.handleKeyPress(key);
        });
        
        this.inputHandler.onKeyUp((key) => {
            this.dronePhysics.setKey(key, false);
        });
    }
    
    handleKeyPress(key) {
        switch(key) {
            case 'v':
                const mode = this.cameraController.toggleMode();
                console.log('Camera mode:', mode);
                break;
            case 'r':
                this.droneState.reset();
                console.log('Drone position reset');
                break;
            case 'm':
                const size = this.mapManager.cycleSize();
                console.log('Map size:', size);
                break;
            case 'c':
                const centered = this.mapManager.toggleCentering();
                console.log('Map centering:', centered ? 'ON' : 'OFF');
                break;
        }
    }
    
    update(deltaTime) {
        // Update physics and drone state
        this.dronePhysics.update(deltaTime);
        
        // Update drone model
        this.droneModel.updatePosition(this.droneState.position);
        this.droneModel.updateRotation(this.droneState.rotation);
        this.droneModel.animatePropellers();
        
        // Update camera
        this.cameraController.update();
        
        // Update HUD
        this.hudController.update();
        
        // Update map
        this.mapManager.update();
        
        // Update terrain
        this.terrainManager.update(
            this.droneState.position.x,
            this.droneState.position.z
        );
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.sceneManager.render();
    }
}

// Start the application
window.addEventListener('DOMContentLoaded', () => {
    new DroneSimulator();
});
