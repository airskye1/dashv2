# Dash v2 - Complete Overhaul Implementation Plan

## 🎯 Overview
Major system overhaul based on user requirements with Tesla-style UI and improved functionality.

## 📋 Requirements Breakdown

### 1. ✅ Modern Alert/Toast System (COMPLETED)
- [x] Tesla-style toast notifications
- [x] Multiple types: info, success, warning, error, fsd
- [x] Glassmorphism design
- [x] Auto-dismiss with smooth animations
- [x] Click to close
- **File**: `js/ui/ToastNotification.js`

### 2. 🔄 New Tesla-Style UI Mode (IN PROGRESS)
Based on uploaded screenshots showing:
- **FSD ON Mode** (Screenshot 2):
  - Large speed display (15 mph)
  - Time display
  - Autopilot Park indicator
  - Minimalist bottom bar
  - Speed limit indicator
  
- **FSD OFF Mode** (Screenshot 3):
  - Speed display (9 mph)
  - "Hold for driving" message
  - Different bottom bar layout

**Implementation**:
- [ ] Create `NewUIMode.js` component
- [ ] Speed display with large numbers
- [ ] Time display (current time)
- [ ] FSD status indicator
- [ ] Autopilot Park button
- [ ] Speed limit display
- [ ] Bottom info bar
- [ ] Toggle between old/new UI in settings

### 3. 🚗 Improved Autopark Logic
**Current Issues**: Doesn't slow down properly, parking is unrealistic

**Improvements Needed**:
- [ ] Slower approach speeds (2-3 mph max)
- [ ] Multi-point turn support
- [ ] Pause between maneuvers (1-2 seconds)
- [ ] Smooth steering transitions
- [ ] Distance-based speed reduction
- [ ] Final centering adjustment
- [ ] Visual feedback during parking

**Files to Modify**:
- `js/autonomy/control/ImprovedAutoparkController.js`
- `js/autonomy/control/EnhancedAutonomousController.js`

### 4. 🛣️ Better Path Planner
**Current Issues**: Buggy, unreliable paths

**Improvements**:
- [ ] More conservative path generation
- [ ] Better obstacle avoidance
- [ ] Smoother curves
- [ ] Collision prediction
- [ ] Emergency braking logic
- [ ] Lane keeping improvements

**Files to Modify**:
- `js/autonomy/path-planning/AdvancedPathPlanner.js`
- `js/autonomy/path-planning/PathPlanner.js`

### 5. 🎮 Enhanced Autopilot System
**Improvements**:
- [ ] More stable lane keeping
- [ ] Better speed control
- [ ] Smoother acceleration/braking
- [ ] Improved traffic light detection
- [ ] Better stop sign behavior (full 3-second stop)
- [ ] Reduced phantom braking

**Files to Modify**:
- `js/autonomy/control/AutonomousController.js`
- `js/autonomy/control/EnhancedAutonomousController.js`

### 6. ⌨️ Better Key Controls
**Current Issues**: Controls don't work well

**Improvements**:
- [ ] Smoother acceleration (gradual)
- [ ] Better steering response
- [ ] Brake sensitivity adjustment
- [ ] Gear shifting (P, R, N, D)
- [ ] Cruise control (set speed)
- [ ] Emergency brake (space bar)

**Files to Modify**:
- `js/autonomy/control/ManualController.js`
- `js/Simulator.js`

### 7. 🏗️ Advanced Road Editor
**New Features**:
- [ ] Highway creation tool
- [ ] Onramp/offramp builder
- [ ] Multi-lane roads (2-6 lanes)
- [ ] Intersection builder
- [ ] City grid generator
- [ ] Road connection system
- [ ] Elevation support
- [ ] Road type selector (residential, highway, freeway)

**Files to Create/Modify**:
- `js/simulator/AdvancedEditor.js`
- `js/simulator/Editor.js`
- `js/simulator/MapBuilder.js` (already created)

### 8. 🏙️ City Builder & Scenarios
**Features**:
- [ ] Pre-built city templates
- [ ] Highway network scenarios
- [ ] Complex intersection scenarios
- [ ] Freeway merge scenarios
- [ ] Urban driving scenarios
- [ ] Save/load custom cities

**Files**:
- `scenarios/CityScenarios.js`
- `scenarios/HighwayScenarios.js`

### 9. 🎡 Rotating Wheels
**Implementation**:
- [ ] Wheel rotation based on speed
- [ ] Steering angle visualization
- [ ] Smooth rotation animation
- [ ] Brake disc glow (optional)

**Files to Modify**:
- `js/objects/CarObject.js`
- `js/physics/VehiclePhysics.js`

### 10. ⚙️ Settings Panel Overhaul
**New Settings**:
- [ ] **New UI Mode** toggle (on/off switch)
- [ ] **Speed Units**: MPH / KM/H selector
- [ ] **Better setting names**:
  - "Autonomous Driving" instead of "mode"
  - "Speed Profile" (Chill, Standard, Sport)
  - "Visualization" (2D/3D, Camera)
  - "Audio Alerts" (on/off)
  - "Path Preview" (on/off)
- [ ] **On/Off Switches** (modern toggle design)
- [ ] **Organized Categories**:
  - Display
  - Driving
  - Autopilot
  - Advanced

**Files to Create/Modify**:
- `js/ui/SettingsPanel.js`
- Update `index.html` settings section

### 11. 📊 Speed Units (MPH/KM/H)
**Implementation**:
- [ ] Global unit setting
- [ ] Convert all speed displays
- [ ] Speed limit signs in selected unit
- [ ] Speedometer in selected unit
- [ ] Save preference to localStorage

**Files to Modify**:
- `js/Utils.js` (add conversion functions)
- `js/Simulator.js`
- All UI components showing speed

### 12. ⏰ Additional UI Info
**New Displays**:
- [ ] Current time (HH:MM)
- [ ] Plan time (path planning duration)
- [ ] Trip distance
- [ ] Average speed
- [ ] Autopilot engagement time

## 🗂️ File Structure

```
dashv2/
├── js/
│   ├── ui/
│   │   ├── ToastNotification.js ✅
│   │   ├── NewUIMode.js 🔄
│   │   ├── SettingsPanel.js 📝
│   │   └── SpeedUnitConverter.js 📝
│   ├── autonomy/
│   │   ├── control/
│   │   │   ├── ImprovedAutoparkController.js 🔄
│   │   │   ├── EnhancedAutonomousController.js 🔄
│   │   │   └── ManualController.js 🔄
│   │   └── path-planning/
│   │       └── AdvancedPathPlanner.js 🔄
│   ├── simulator/
│   │   ├── AdvancedEditor.js 📝
│   │   ├── Editor.js 🔄
│   │   └── MapBuilder.js ✅
│   └── objects/
│       └── CarObject.js 🔄
├── scenarios/
│   ├── CityScenarios.js 📝
│   └── HighwayScenarios.js 📝
└── css/
    └── new-ui-mode.css 📝
```

**Legend**: ✅ Done | 🔄 Needs Update | 📝 To Create

## 📅 Implementation Priority

### Phase 1: Core UI (Days 1-2)
1. ✅ Toast Notification System
2. New UI Mode component
3. Settings Panel overhaul
4. Speed unit conversion

### Phase 2: Driving Improvements (Days 3-4)
5. Better key controls
6. Improved autopark
7. Better path planner
8. Enhanced autopilot

### Phase 3: Editor & Scenarios (Days 5-6)
9. Advanced road editor
10. Highway/onramp tools
11. City builder
12. New scenarios

### Phase 4: Polish (Day 7)
13. Rotating wheels
14. Additional UI info
15. Bug fixes
16. Testing

## 🚀 Next Steps

1. **Immediate**: Create New UI Mode component
2. **Then**: Update Settings Panel
3. **Then**: Improve Autopark logic
4. **Then**: Fix Path Planner
5. **Continue**: Through remaining items

## 📝 Notes

- All changes maintain backward compatibility
- New UI Mode is optional (toggle in settings)
- Old UI remains functional
- Gradual rollout of features
- Extensive testing required

## 🎨 Design References

- Screenshot 1: Toast notification style
- Screenshot 2: FSD ON UI layout
- Screenshot 3: FSD OFF UI layout

---

**Status**: 1/12 components complete (8%)
**Next**: New UI Mode component
