// Drone state management
class DroneState {
    constructor() {
        const startPos = CONFIG.DRONE.START_POSITION;
        
        this.position = { ...startPos };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.speed = 0;
        this.altitude = startPos.y;
        this.heading = 0;
        this.battery = 100;
    }
    
    reset() {
        const startPos = CONFIG.DRONE.START_POSITION;
        this.position = { ...startPos };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.speed = 0;
        this.altitude = startPos.y;
        this.heading = 0;
    }
    
    teleport(x, z) {
        this.position.x = x;
        this.position.z = z;
        this.velocity = { x: 0, y: 0, z: 0 };
    }
    
    updateMetrics() {
        this.speed = Math.sqrt(
            this.velocity.x ** 2 + 
            this.velocity.y ** 2 + 
            this.velocity.z ** 2
        );
        this.altitude = this.position.y;
        this.heading = ((this.rotation.y * 180 / Math.PI) + 360) % 360;
    }
    
    drainBattery() {
        const { BATTERY_DRAIN_BASE, BATTERY_DRAIN_ACTIVITY } = CONFIG.DRONE;
        const activityLevel = Math.abs(this.velocity.x) + 
                            Math.abs(this.velocity.y) + 
                            Math.abs(this.velocity.z);
        this.battery -= (BATTERY_DRAIN_BASE + activityLevel * BATTERY_DRAIN_ACTIVITY);
        this.battery = Math.max(0, this.battery);
    }
}
