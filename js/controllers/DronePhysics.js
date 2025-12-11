// Drone physics controller
class DronePhysics {
    constructor(droneState) {
        this.state = droneState;
        this.keys = {};
    }
    
    setKey(key, value) {
        this.keys[key] = value;
    }
    
    update(deltaTime) {
        this.updateRotation();
        this.updateMovement();
        this.updateVertical(deltaTime);
        this.applyDrag();
        this.limitSpeed();
        this.updatePosition();
        this.enforceGroundLimit();
        this.updateTilt();
        this.state.updateMetrics();
        this.state.drainBattery();
    }
    
    updateRotation() {
        const { ROTATION_SPEED } = CONFIG.DRONE;
        if (this.keys['q']) {
            this.state.rotation.y += ROTATION_SPEED;
        }
        if (this.keys['e']) {
            this.state.rotation.y -= ROTATION_SPEED;
        }
    }
    
    updateMovement() {
        const { ACCELERATION } = CONFIG.DRONE;
        const forward = {
            x: Math.sin(this.state.rotation.y),
            z: Math.cos(this.state.rotation.y)
        };
        
        const right = {
            x: Math.cos(this.state.rotation.y),
            z: -Math.sin(this.state.rotation.y)
        };
        
        if (this.keys['w']) {
            this.state.velocity.x += forward.x * ACCELERATION;
            this.state.velocity.z += forward.z * ACCELERATION;
        }
        if (this.keys['s']) {
            this.state.velocity.x -= forward.x * ACCELERATION;
            this.state.velocity.z -= forward.z * ACCELERATION;
        }
        if (this.keys['a']) {
            this.state.velocity.x += right.x * ACCELERATION;
            this.state.velocity.z += right.z * ACCELERATION;
        }
        if (this.keys['d']) {
            this.state.velocity.x -= right.x * ACCELERATION;
            this.state.velocity.z -= right.z * ACCELERATION;
        }
    }
    
    updateVertical(deltaTime) {
        const { LIFT_SPEED } = CONFIG.DRONE;
        if (this.keys[' ']) {
            this.state.velocity.y += LIFT_SPEED * deltaTime;
        }
        if (this.keys['shift']) {
            this.state.velocity.y -= LIFT_SPEED * deltaTime;
        }
    }
    
    applyDrag() {
        const { DRAG } = CONFIG.DRONE;
        this.state.velocity.x *= DRAG;
        this.state.velocity.y *= DRAG;
        this.state.velocity.z *= DRAG;
    }
    
    limitSpeed() {
        const { MAX_SPEED } = CONFIG.DRONE;
        const currentSpeed = Math.sqrt(
            this.state.velocity.x ** 2 + 
            this.state.velocity.z ** 2
        );
        
        if (currentSpeed > MAX_SPEED) {
            const ratio = MAX_SPEED / currentSpeed;
            this.state.velocity.x *= ratio;
            this.state.velocity.z *= ratio;
        }
    }
    
    updatePosition() {
        this.state.position.x += this.state.velocity.x;
        this.state.position.y += this.state.velocity.y;
        this.state.position.z += this.state.velocity.z;
    }
    
    enforceGroundLimit() {
        const { MIN_ALTITUDE } = CONFIG.DRONE;
        if (this.state.position.y < MIN_ALTITUDE) {
            this.state.position.y = MIN_ALTITUDE;
            this.state.velocity.y = 0;
        }
    }
    
    updateTilt() {
        const { TILT_AMOUNT } = CONFIG.DRONE;
        
        // Convert world velocity to local velocity (relative to drone's heading)
        const heading = this.state.rotation.y;
        const cosHeading = Math.cos(heading);
        const sinHeading = Math.sin(heading);
        
        // Local forward/backward velocity (pitch)
        const localForward = this.state.velocity.x * sinHeading + this.state.velocity.z * cosHeading;
        
        // Local left/right velocity (roll)
        const localRight = this.state.velocity.x * cosHeading - this.state.velocity.z * sinHeading;
        
        // Apply tilt: forward tilts forward (negative pitch), right tilts right (positive roll)
        this.state.rotation.x = -localForward * TILT_AMOUNT;
        this.state.rotation.z = localRight * TILT_AMOUNT;
    }
}
