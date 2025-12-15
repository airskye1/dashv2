# Quick Integration Guide

## ✅ What's Been Built (7/12 Complete - 58%)

1. ✅ Toast Notification System
2. ✅ New Tesla UI Mode
3. ✅ Speed Unit Converter
4. ✅ Modern Settings Panel
5. ✅ Improved Autopark (ultra-slow, smooth)
6. ✅ Rotating Wheels
7. ✅ FSD Scenarios in examples.js

## 🔧 Integration Steps

### Step 1: Add CSS to index.html

Add before `</head>`:
```html
<link rel="stylesheet" href="css/settings-panel.css">
```

### Step 2: Add Scripts to index.html

Add before `</body>`:
```html
<script src="js/ui/ToastNotification.js"></script>
<script type="module" src="js/ui/SpeedUnitConverter.js"></script>
<script type="module" src="js/ui/NewUIMode.js"></script>
<script type="module" src="js/ui/SettingsPanel.js"></script>
```

### Step 3: Initialize in Simulator (Dash.js or Simulator.js)

Add to initialization:
```javascript
import NewUIMode from './js/ui/NewUIMode.js';
import SpeedUnitConverter from './js/ui/SpeedUnitConverter.js';
import SettingsPanel from './js/ui/SettingsPanel.js';

// In constructor or init():
this.speedConverter = new SpeedUnitConverter();
this.newUIMode = new NewUIMode(this);
this.settingsPanel = new SettingsPanel();

// Make globally accessible
window.newUIMode = this.newUIMode;
window.speedConverter = this.speedConverter;
```

### Step 4: Update Loop

In your main update/render loop:
```javascript
// Update new UI with current data
if (window.newUIMode && window.newUIMode.enabled) {
    window.newUIMode.update({
        speed: this.car.velocity,
        speedLimit: this.config.speedLimit || 25,
        fsdActive: this.autonomousEnabled,
        distance: this.tripDistance || 0,
        avgSpeed: this.avgSpeed || 0,
        planTime: this.lastPlanTime || 0,
        gear: this.gear || 'P'
    });
}
```

### Step 5: Wire Settings Button

Find your settings button and add:
```javascript
document.getElementById('btn-settings')?.addEventListener('click', () => {
    window.SettingsPanel.open();
});
```

### Step 6: Listen for Settings Changes

```javascript
window.addEventListener('settingsChanged', (e) => {
    const settings = e.detail;
    
    // Apply settings
    if (settings.speedProfile) {
        this.setSpeedProfile(settings.speedProfile);
    }
    
    if (settings.autopilotAggression) {
        this.setAutopilotAggression(settings.autopilotAggression);
    }
    
    // etc...
});
```

## 🎮 Usage

### Toast Notifications
```javascript
window.Toast.success('Autopilot engaged!');
window.Toast.warning('Approaching speed limit');
window.Toast.error('Path planning failed');
window.Toast.fsd('FSD activated');
```

### New UI Mode
```javascript
// Toggle via settings or:
window.newUIMode.toggle();

// Set speed unit
window.newUIMode.setSpeedUnit('mph'); // or 'kmh'
```

### Speed Converter
```javascript
// Convert m/s to current unit
const speed = window.SpeedConverter.fromMetersPerSecond(10);

// Format with unit
const formatted = window.SpeedConverter.format(10, 1); // "22.4 mph"
```

### Improved Autopark
```javascript
import ImprovedAutoparkController from './js/autonomy/control/ImprovedAutoparkController.js';

// When parking:
this.autoparkController = new ImprovedAutoparkController(this.car, parkingSpot);
this.autoparkController.start();

// In update loop:
if (this.isParking) {
    const control = this.autoparkController.control(pose, velocity, dt);
    // Apply control
}
```

## 🚨 Still TODO (5/12)

7. 🔄 Better Path Planner (fix bugs)
8. 🔄 Enhanced Autopilot (more stable)
9. 🔄 Better Key Controls
10. 🔄 Advanced Road Editor (highways/onramps)
11. 🔄 City Builder & Scenarios
12. 🔄 Full Integration & Testing

## 📝 Quick Test

After integration, test:
1. Open settings - should see new panel with toggles
2. Enable "New UI Mode" - should see Tesla-style UI
3. Change speed unit to KM/H - should update
4. Start autopark - should move VERY slowly
5. Drive around - wheels should rotate
6. Check console for any errors

## 🐛 Common Issues

**Issue**: New UI doesn't show
- **Fix**: Check console for errors, ensure NewUIMode.js is loaded

**Issue**: Settings don't save
- **Fix**: Check localStorage permissions

**Issue**: Wheels don't rotate
- **Fix**: Ensure CarObject.js changes are compiled (run `npm run dev`)

**Issue**: Autopark too fast
- **Fix**: Check CRAWL_SPEED and REVERSE_SPEED values

## 📊 Progress: 58% Complete

Next priorities:
1. Integrate what we have
2. Test thoroughly
3. Fix any bugs
4. Continue with remaining features
