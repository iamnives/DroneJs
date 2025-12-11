// Input handler
class InputHandler {
    constructor() {
        this.keys = {};
        this.listeners = {
            keyDown: [],
            keyUp: []
        };
        
        this.init();
    }
    
    init() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.notifyListeners('keyDown', e.key.toLowerCase());
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.notifyListeners('keyUp', e.key.toLowerCase());
        });
    }
    
    isKeyPressed(key) {
        return this.keys[key] || false;
    }
    
    getKeys() {
        return this.keys;
    }
    
    onKeyDown(callback) {
        this.listeners.keyDown.push(callback);
    }
    
    onKeyUp(callback) {
        this.listeners.keyUp.push(callback);
    }
    
    notifyListeners(type, key) {
        this.listeners[type].forEach(callback => callback(key));
    }
}
