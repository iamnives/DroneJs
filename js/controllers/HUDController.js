// HUD controller
class HUDController {
    constructor(droneState) {
        this.droneState = droneState;
        this.elements = {
            altitude: document.getElementById('altitude'),
            speed: document.getElementById('speed'),
            battery: document.getElementById('battery'),
            position: document.getElementById('position'),
            heading: document.getElementById('heading'),
            horizonLine: document.getElementById('horizon-line')
        };
    }
    
    update() {
        this.updateTelemetry();
        this.updateBatteryWarning();
        this.updateHorizon();
    }
    
    updateTelemetry() {
        const state = this.droneState;
        
        this.elements.altitude.textContent = state.altitude.toFixed(1) + ' m';
        this.elements.speed.textContent = state.speed.toFixed(1) + ' m/s';
        this.elements.battery.textContent = state.battery.toFixed(0) + '%';
        this.elements.position.textContent = 
            state.position.x.toFixed(1) + ', ' + state.position.z.toFixed(1);
        this.elements.heading.textContent = state.heading.toFixed(0) + '°';
    }
    
    updateBatteryWarning() {
        if (this.droneState.battery < 20) {
            this.elements.battery.classList.add('low');
        } else {
            this.elements.battery.classList.remove('low');
        }
    }
    
    updateHorizon() {
        const pitchDegrees = this.droneState.rotation.x * 180 / Math.PI;
        const rollDegrees = this.droneState.rotation.z * 180 / Math.PI;
        
        this.elements.horizonLine.style.transform = 
            `translateY(calc(-50% + ${pitchDegrees * 2}px)) rotate(${rollDegrees}deg)`;
    }
}
