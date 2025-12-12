# Dash v2 - Advanced FSD Simulator Improvements

## Overview
Complete overhaul of the autonomous driving simulator with improved path planning, real-world FSD failure scenarios, comprehensive map builder, and modern UI.

## 🚗 New Features

### 1. Advanced Path Planning (`AdvancedPathPlanner.js`)
- **Bidirectional Logic**: Improved forward and backward path planning with quintic polynomial interpolation
- **Multi-Objective Optimization**: Balances smoothness, safety, efficiency, and comfort
- **Slow & Deliberate**: Configurable speeds with slower reverse maneuvers (3.0 m/s vs 10.0 m/s forward)
- **Safety Scoring**: Paths evaluated for collision risk and proximity to obstacles
- **Curvature Analysis**: Smooth paths with calculated curvature constraints

**Key Improvements:**
- 50-point path generation with smooth transitions
- Lateral and longitudinal sampling (15x20 grid)
- Real-time obstacle avoidance
- Jerk minimization for passenger comfort

### 2. Comprehensive Map Builder (`MapBuilder.js`)
- **Road Types**: Regular roads, highways, freeways, residential
- **Highway System**: Multi-lane highways with medians and shoulders
- **Onramps/Offramps**: Bezier curve-based ramp generation with acceleration/deceleration lanes
- **Intersections**: 4-way, 3-way, roundabouts with traffic light phase calculation
- **A* Pathfinding**: Complete road network graph with shortest path finding
- **Lane Detection**: Dynamic lane assignment and position tracking

**Supported Elements:**
- Highways (4+ lanes, 65 mph)
- Freeways (6+ lanes, 70 mph, limited access)
- Onramps with zipper/yield merge types
- Offramps with deceleration lanes
- Traffic lights with multi-phase timing
- Stop signs at intersections
- Crosswalks and turn lanes

### 3. Improved Autopark (`ImprovedAutoparkController.js`)
- **Waypoint-Based Planning**: Multi-point path with 5+ waypoints
- **Parking Types**: Perpendicular and parallel parking support
- **Slow Speeds**: 0.8 m/s forward, 0.6 m/s reverse (very deliberate)
- **Pause Phases**: 1.5-second pauses between maneuvers for safety
- **Multi-Point Turns**: Automatic adjustment maneuvers if needed
- **Smooth Control**: Exponential smoothing on steering, gas, and brake

**Parking Phases:**
1. Approaching - Navigate to parking area
2. Aligning - Position for reverse maneuver
3. Reversing - Back into spot with precise steering
4. Centering - Fine-tune position
5. Complete - Final stop and park

### 4. Real-World FSD Failure Scenarios (`FSDFailureScenarios.js`)

Based on documented Tesla FSD v13/v14 failures with sources:

#### Critical Scenarios:
1. **Oncoming Traffic Turn** (FSD v13.2.8)
   - Source: Reddit r/TeslaMotors March 2025
   - Failure: Turns right into oncoming traffic lane
   
2. **Left Turn into Oncoming** (FSD v13.2.9)
   - Source: Medium 8,100-mile road trip analysis Aug 2025
   - Failure: Turned left into oncoming lanes ~10 times

#### High-Risk Scenarios:
3. **Wrong Lane Turn** (FSD v13.2.9)
   - Source: Forbes test drive June 2025
   - Failure: Right turn from far-left lane

4. **Blocked Entry** (FSD v13.2.9)
   - Source: Forbes test drive June 2025
   - Failure: Attempts to enter blocked private access

#### Medium-Risk Scenarios:
5. **Indecisive Highway Merge** (FSD v14)
   - Source: Reddit safety hazard report Oct 2025
   - Failure: Signals but hesitates 5+ seconds on merge

6. **Excessive Speeding** (FSD v14 "Mad Max")
   - Source: Electrek/WebProNews Oct 2025
   - Failure: 35+ mph in 25 mph school zone

7. **Random Hallucination Stop** (FSD v14.1.4)
   - Source: Electrek Oct 2025
   - Failure: Stops randomly for non-existent obstacles

8. **Brake Stabbing** (FSD v14.1.4)
   - Source: Electrek Oct 2025
   - Failure: Repeated abrupt brake taps

### 5. Modern Rounded UI (`modern-ui.css`)

Complete visual redesign with premium aesthetics:

**Design System:**
- CSS Variables for consistent theming
- Inter font family (Google Fonts)
- Glassmorphism with 20px blur + saturation
- Rounded corners (12px-32px scale)
- Smooth transitions (cubic-bezier easing)

**Animations:**
- Fade in/out
- Slide in (left/right)
- Scale in
- Pulse effects
- Shimmer loading
- Glow effects

**Interactive Elements:**
- Button ripple effects on click
- Hover lift animations (translateY + scale)
- Smooth scrollbars
- Tooltip system
- Status indicators with glow
- Card hover effects

**Accessibility:**
- Respects prefers-reduced-motion
- High contrast borders
- Focus states with glow
- ARIA-compatible

## 🛠️ Enhanced Stop Sign Behavior

Fixed stop sign logic to enforce full 3-second stops:

```javascript
// State machine approach
1. Approaching (15m-2m): Gradual deceleration
2. Stopping Zone (<2m): Full brake until velocity < 0.1 m/s
3. Waiting: 3.0 second mandatory stop
4. Proceeding: Resume after wait complete
```

## 📊 Technical Specifications

### Path Planning Performance:
- Planning Horizon: 100 meters
- Time Horizon: 8 seconds
- Lateral Samples: 15
- Longitudinal Samples: 20
- Total Paths Evaluated: 300 per cycle

### Speed Profiles:
- **Sloth**: 85% speed, 3.0m following distance
- **Chill**: 95% speed, 2.5m following distance
- **Standard**: 100% speed, 2.0m following distance
- **Hurry**: 110% speed, 1.5m following distance
- **Mad Max**: 120% speed, 1.2m following distance

### Safety Thresholds:
- Minimum obstacle distance: 2.0m (collision)
- Marginal safety: 3.0-5.0m
- Safe distance: >5.0m
- Comfort deceleration: 3.0 m/s²

## 🎨 UI Color Palette

```css
--primary-color: #3b82f6 (Blue)
--secondary-color: #8b5cf6 (Purple)
--success-color: #10b981 (Green)
--warning-color: #f59e0b (Amber)
--danger-color: #ef4444 (Red)
```

## 📚 Sources & References

All FSD failure scenarios are based on real-world documented incidents:

1. **Reddit r/TeslaMotors** - User reports March-October 2025
2. **Medium** - 8,100-mile FSD v13.2.9 road trip analysis (July-Aug 2025)
3. **Forbes** - Model Y Juniper test drive (June 2025)
4. **Electrek** - FSD v14.1.4 analysis (October 2025)
5. **WebProNews** - Regulatory scrutiny reports (October 2025)
6. **Autoevolution** - FSD v13 rollout issues (December 2024)
7. **TeslaMagz** - Update blockage reports (February 2025)

## 🚀 Usage

### Loading FSD Failure Scenarios:
```javascript
import { getScenario, getAllScenarioNames } from './scenarios/FSDFailureScenarios.js';

// Get specific scenario
const scenario = getScenario('oncomingTrafficTurn');

// Load into simulator
simulator.loadScenario(scenario);
```

### Using Map Builder:
```javascript
import MapBuilder from './js/simulator/MapBuilder.js';

const mapBuilder = new MapBuilder();

// Create highway
const highway = mapBuilder.createHighway({
    lanes: 4,
    speedLimit: 29.1, // 65 mph
    path: [...]
});

// Add onramp
const onramp = mapBuilder.createOnramp(localRoad, highway, {
    length: 100,
    accelerationLane: true
});

// Build network
const network = mapBuilder.buildRoadNetwork();
```

### Using Improved Autopark:
```javascript
import ImprovedAutoparkController from './js/autonomy/control/ImprovedAutoparkController.js';

const autopark = new ImprovedAutoparkController(car, parkingSpot);
autopark.start();

// In update loop
const control = autopark.control(pose, velocity, dt);
```

## 🎯 Next Steps

1. **Integration**: Wire up new components to main simulator
2. **Testing**: Validate all FSD failure scenarios
3. **Visualization**: Add debug overlays for path planning
4. **Performance**: Optimize path planning for 60 FPS
5. **Documentation**: Add in-app tutorials

## 📝 Notes

- All speeds in m/s (multiply by 2.237 for mph)
- Angles in radians
- Coordinates in meters
- Right-hand coordinate system (x: right, y: forward)
- Rotation: 0 = east, π/2 = north

## 🐛 Known Issues

- Map builder needs integration with existing scenario system
- FSD scenarios need visual assets
- Autopark requires parking spot detection integration
- Path planner needs GPGPU optimization for real-time performance

## 📄 License

MIT License - Same as original Dash project

---

**Built with ❤️ for safer autonomous driving**
