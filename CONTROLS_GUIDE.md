# 🎮 Dash v2 - Keyboard Controls Reference

## Manual Driving Controls

### Basic Movement
| Key | Action | Description |
|-----|--------|-------------|
| **W** or **↑** | Accelerate | Move forward (in Drive gear) |
| **S** or **↓** | Brake/Reverse | Brake (in Drive) or Reverse (in Reverse gear) |
| **A** or **←** | Steer Left | Turn left |
| **D** or **→** | Steer Right | Turn right |
| **Space** | Emergency Brake | Full brake application |

### Gear Shifting
| Key | Action | Gear Order |
|-----|--------|------------|
| **Q** | Shift Down | P → R → N → D |
| **E** | Shift Up | D → N → R → P |

### Gear Descriptions
- **P (Park)**: Vehicle locked, parking brake engaged
- **R (Reverse)**: Backward movement only
- **N (Neutral)**: No power to wheels
- **D (Drive)**: Forward movement only

### Advanced Features
| Key | Action | Description |
|-----|--------|-------------|
| **C** | Cruise Control | Toggle cruise control on/off |

## Control Behavior

### Smooth Acceleration
- Gas pedal gradually increases (not instant)
- Acceleration rate: 5% per frame
- Deceleration rate: 8% per frame
- Natural, realistic feel

### Smooth Steering
- Steering gradually turns (not instant)
- Steering rate: 12% per frame
- Returns to center when released

### Gear-Based Movement
- **In Park (P)**: No movement possible, parking brake active
- **In Reverse (R)**: 
  - S/↓ = Reverse
  - W/↑ = Brake
- **In Neutral (N)**: No power, coasting only
- **In Drive (D)**:
  - W/↑ = Accelerate
  - S/↓ = Brake

### Cruise Control
1. Press **C** to activate
2. Current speed is locked
3. Vehicle maintains speed automatically
4. Press **Space** or **S** to deactivate
5. Only works in Drive (D) gear

## Tips

### Starting from Stop
1. Shift to **D** (press E from Park)
2. Press **W** to accelerate
3. Gradually builds speed

### Parking
1. Come to complete stop
2. Press **Space** for brake
3. Shift to **P** (press Q twice from Drive)
4. Vehicle locked

### Reversing
1. From Park, press **E** once to get to Reverse
2. Press **S** to move backward
3. Press **W** to brake

### Highway Driving
1. Shift to **D**
2. Accelerate to desired speed
3. Press **C** to activate cruise control
4. Use **A/D** for lane changes
5. Press **Space** to disengage cruise

## Comparison: Old vs New Controls

### Old Controls (Basic)
- ✗ Instant acceleration/braking
- ✗ No gear system
- ✗ No cruise control
- ✗ Binary steering (full left/right)

### New Controls (Enhanced)
- ✅ Smooth acceleration/braking
- ✅ Full gear system (P/R/N/D)
- ✅ Cruise control
- ✅ Gradual steering
- ✅ Realistic physics
- ✅ Arrow key support

## Accessibility

### Alternative Keys
- **WASD** or **Arrow Keys** - both work!
- Choose what's comfortable for you

### Visual Feedback
- Gear displayed in New UI Mode
- Toast notifications for gear changes
- Cruise control status shown

## Advanced Techniques

### Quick Stop
1. Press **Space** (emergency brake)
2. Shift to **P**

### Three-Point Turn
1. Drive forward
2. Shift to **R**
3. Reverse while steering
4. Shift to **D**
5. Drive forward

### Parallel Parking (Manual)
1. Pull alongside spot
2. Shift to **R**
3. Reverse at angle
4. Straighten out
5. Shift to **P**

## Troubleshooting

**Problem**: Car won't move
- **Solution**: Check gear - must be in D or R

**Problem**: Can't reverse
- **Solution**: Shift to R gear (press E from P)

**Problem**: Steering feels sluggish
- **Solution**: This is intentional for realism

**Problem**: Cruise control not working
- **Solution**: Must be in Drive (D) gear

## Future Enhancements

Planned features:
- [ ] Speed limiter
- [ ] One-pedal driving mode
- [ ] Customizable key bindings
- [ ] Gamepad support
- [ ] Force feedback

---

**Enjoy the enhanced driving experience!** 🚗💨
