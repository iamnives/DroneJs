# Drone Control Simulator

A web-based drone flight simulator built with Three.js and Leaflet that lets you control a DJI-like drone over a map.

## Features

- **3D Drone Model**: Detailed quadcopter with rotating propellers
- **Realistic Physics**: Smooth acceleration, deceleration, and tilting based on movement
- **Map Integration**: Real-time position tracking on OpenStreetMap
- **HUD Display**: Comprehensive heads-up display showing:
  - Altitude
  - Speed
  - Battery level
  - GPS position
  - Heading/compass
  - Attitude indicator
- **Multiple Camera Modes**: Switch between follow camera and FPV (first-person view)
- **3D Environment**: Buildings, trees, and grid terrain

## Controls

| Key | Action |
|-----|--------|
| W/S | Move Forward/Backward |
| A/D | Move Left/Right |
| Q/E | Rotate Left/Right |
| Space | Ascend |
| Shift | Descend |
| V | Toggle Camera View (Follow/FPV) |
| R | Reset Drone Position |

## Getting Started

Simply open `index.html` in a modern web browser. No build process or dependencies required - all libraries are loaded via CDN.

## Technologies Used

- **Three.js** (r128): 3D graphics and rendering
- **Leaflet**: Interactive map display
- **OpenStreetMap**: Map tile provider

## Browser Compatibility

Works best in modern browsers with WebGL support:
- Chrome/Edge (recommended)
- Firefox
- Safari

## License

MIT License - Feel free to modify and use for your projects!
