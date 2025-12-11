// Drone model creation
class DroneModel {
    constructor() {
        this.group = new THREE.Group();
        this.createBody();
        this.createGimbal();
        this.createArmsAndMotors();
        this.createLEDs();
    }
    
    createBody() {
        const bodyGeometry = new THREE.BoxGeometry(8, 2, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        this.group.add(body);
    }
    
    createGimbal() {
        const gimbalGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const gimbalMaterial = new THREE.MeshStandardMaterial({ color: 0x34495e });
        const gimbal = new THREE.Mesh(gimbalGeometry, gimbalMaterial);
        gimbal.position.y = -2;
        this.group.add(gimbal);
    }
    
    createArmsAndMotors() {
        const armPositions = [
            { x: 5, z: 5 },
            { x: -5, z: 5 },
            { x: 5, z: -5 },
            { x: -5, z: -5 }
        ];
        
        armPositions.forEach((pos, index) => {
            this.createArm(pos);
            this.createMotor(pos);
            this.createPropeller(pos, index);
        });
    }
    
    createArm(pos) {
        const armGeometry = new THREE.CylinderGeometry(0.3, 0.3, 7, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.rotation.z = Math.PI / 2;
        arm.rotation.y = Math.atan2(pos.z, pos.x);
        arm.position.set(pos.x * 0.5, 0, pos.z * 0.5);
        this.group.add(arm);
    }
    
    createMotor(pos) {
        const motorGeometry = new THREE.CylinderGeometry(1.5, 1.5, 2, 16);
        const motorMaterial = new THREE.MeshStandardMaterial({ color: 0x7f8c8d });
        const motor = new THREE.Mesh(motorGeometry, motorMaterial);
        motor.position.set(pos.x, 1, pos.z);
        this.group.add(motor);
    }
    
    createPropeller(pos, index) {
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
        
        this.group.add(propGroup);
    }
    
    createLEDs() {
        const ledGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        
        const ledFrontMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00, 
            emissive: 0x00ff00,
            emissiveIntensity: 2
        });
        const ledFront = new THREE.Mesh(ledGeometry, ledFrontMaterial);
        ledFront.position.set(0, 0, 4.5);
        this.group.add(ledFront);
        
        const ledRearMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000, 
            emissive: 0xff0000,
            emissiveIntensity: 2
        });
        const ledRear = new THREE.Mesh(ledGeometry, ledRearMaterial);
        ledRear.position.set(0, 0, -4.5);
        this.group.add(ledRear);
    }
    
    getGroup() {
        return this.group;
    }
    
    updatePosition(position) {
        this.group.position.set(position.x, position.y, position.z);
    }
    
    updateRotation(rotation) {
        this.group.rotation.set(rotation.x, rotation.y, rotation.z);
    }
    
    animatePropellers() {
        this.group.children.forEach(child => {
            if (child.userData.propeller) {
                child.rotation.y += 0.5 * child.userData.direction;
            }
        });
    }
}
