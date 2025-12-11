// Scene manager
class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        
        this.init();
    }
    
    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
        this.setupEventListeners();
    }
    
    setupScene() {
        const { BACKGROUND_COLOR, FOG_NEAR, FOG_FAR } = CONFIG.SCENE;
        this.scene.background = new THREE.Color(BACKGROUND_COLOR);
        this.scene.fog = new THREE.Fog(BACKGROUND_COLOR, FOG_NEAR, FOG_FAR);
    }
    
    setupCamera() {
        const { FOV, NEAR, FAR } = CONFIG.CAMERA;
        
        this.camera = new THREE.PerspectiveCamera(
            FOV,
            window.innerWidth / window.innerHeight,
            NEAR,
            FAR
        );
        this.camera.position.set(0, 100, 150);
        this.camera.lookAt(0, 50, 0);
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        const container = document.getElementById('three-container');
        container.appendChild(this.renderer.domElement);
    }
    
    setupLights() {
        const { AMBIENT_LIGHT, DIRECTIONAL_LIGHT, HEMISPHERE_LIGHT } = CONFIG.SCENE;
        const { BACKGROUND_COLOR } = CONFIG.SCENE;
        
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT);
        this.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, DIRECTIONAL_LIGHT);
        directionalLight.position.set(100, 200, 100);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -500;
        directionalLight.shadow.camera.right = 500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Hemisphere light
        const hemisphereLight = new THREE.HemisphereLight(BACKGROUND_COLOR, 0x545454, HEMISPHERE_LIGHT);
        this.scene.add(hemisphereLight);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    add(object) {
        this.scene.add(object);
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    getScene() {
        return this.scene;
    }
    
    getCamera() {
        return this.camera;
    }
}
