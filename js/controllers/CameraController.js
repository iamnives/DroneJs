// Camera controller
class CameraController {
    constructor(camera, droneState) {
        this.camera = camera;
        this.droneState = droneState;
        this.mode = 'follow'; // 'follow' or 'fpv'
    }
    
    toggleMode() {
        this.mode = this.mode === 'follow' ? 'fpv' : 'follow';
        return this.mode;
    }
    
    update() {
        if (this.mode === 'follow') {
            this.updateFollowCamera();
        } else {
            this.updateFPVCamera();
        }
    }
    
    updateFollowCamera() {
        const { FOLLOW_DISTANCE, FOLLOW_HEIGHT, LERP_FACTOR } = CONFIG.CAMERA;
        const pos = this.droneState.position;
        const rot = this.droneState.rotation;
        
        const targetX = pos.x - Math.sin(rot.y) * FOLLOW_DISTANCE;
        const targetY = pos.y + FOLLOW_HEIGHT;
        const targetZ = pos.z - Math.cos(rot.y) * FOLLOW_DISTANCE;
        
        this.camera.position.lerp(
            new THREE.Vector3(targetX, targetY, targetZ),
            LERP_FACTOR
        );
        this.camera.lookAt(pos.x, pos.y, pos.z);
    }
    
    updateFPVCamera() {
        const { FPV_LOOK_DISTANCE, FPV_LOOK_DOWN } = CONFIG.CAMERA;
        const pos = this.droneState.position;
        const rot = this.droneState.rotation;
        
        this.camera.position.set(pos.x, pos.y, pos.z);
        
        const lookAtX = pos.x + Math.sin(rot.y) * FPV_LOOK_DISTANCE;
        const lookAtY = pos.y - FPV_LOOK_DOWN;
        const lookAtZ = pos.z + Math.cos(rot.y) * FPV_LOOK_DISTANCE;
        
        this.camera.lookAt(lookAtX, lookAtY, lookAtZ);
    }
}
