/**
 * Enhanced Manual Controller
 * Improved keyboard controls with smooth acceleration, gear shifting, and cruise control
 */

export default class ManualController {
  constructor() {
    this.carKeys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      brake: false,
      shiftUp: false,
      shiftDown: false,
      cruiseControl: false
    };

    // Smooth control values
    this.currentGas = 0;
    this.currentBrake = 0;
    this.currentSteer = 0;

    // Acceleration/deceleration rates
    this.gasAccelRate = 0.05; // How fast gas increases
    this.gasDecelRate = 0.08; // How fast gas decreases
    this.brakeAccelRate = 0.15; // How fast brake engages
    this.brakeDecelRate = 0.2; // How fast brake releases
    this.steerRate = 0.12; // Steering response rate

    // Gear system
    this.gear = 'P'; // P, R, N, D
    this.gearOrder = ['P', 'R', 'N', 'D'];
    this.gearIndex = 0;

    // Cruise control
    this.cruiseActive = false;
    this.cruiseSpeed = 0;

    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('keydown', event => {
      // Prevent default for space (brake)
      if (event.key === ' ') {
        event.preventDefault();
      }

      switch (event.key) {
        case 'w': case 'W':
        case 'ArrowUp':
          this.carKeys.forward = true;
          break;
        case 's': case 'S':
        case 'ArrowDown':
          this.carKeys.backward = true;
          break;
        case 'a': case 'A':
        case 'ArrowLeft':
          this.carKeys.left = true;
          break;
        case 'd': case 'D':
        case 'ArrowRight':
          this.carKeys.right = true;
          break;
        case ' ':
          this.carKeys.brake = true;
          break;
        case 'q': case 'Q':
          this.shiftDown();
          break;
        case 'e': case 'E':
          this.shiftUp();
          break;
        case 'c': case 'C':
          this.toggleCruiseControl();
          break;
      }
    });

    document.addEventListener('keyup', event => {
      switch (event.key) {
        case 'w': case 'W':
        case 'ArrowUp':
          this.carKeys.forward = false;
          break;
        case 's': case 'S':
        case 'ArrowDown':
          this.carKeys.backward = false;
          break;
        case 'a': case 'A':
        case 'ArrowLeft':
          this.carKeys.left = false;
          break;
        case 'd': case 'D':
        case 'ArrowRight':
          this.carKeys.right = false;
          break;
        case ' ':
          this.carKeys.brake = false;
          break;
      }
    });
  }

  shiftUp() {
    if (this.gearIndex < this.gearOrder.length - 1) {
      this.gearIndex++;
      this.gear = this.gearOrder[this.gearIndex];
      console.log(`[Manual] Shifted to ${this.gear}`);

      // Show toast if available
      if (window.Toast) {
        window.Toast.info(`Gear: ${this.gear}`);
      }
    }
  }

  shiftDown() {
    if (this.gearIndex > 0) {
      this.gearIndex--;
      this.gear = this.gearOrder[this.gearIndex];
      console.log(`[Manual] Shifted to ${this.gear}`);

      // Show toast if available
      if (window.Toast) {
        window.Toast.info(`Gear: ${this.gear}`);
      }
    }
  }

  toggleCruiseControl() {
    this.cruiseActive = !this.cruiseActive;

    if (this.cruiseActive) {
      console.log('[Manual] Cruise control activated');
      if (window.Toast) {
        window.Toast.success('Cruise Control ON');
      }
    } else {
      console.log('[Manual] Cruise control deactivated');
      if (window.Toast) {
        window.Toast.info('Cruise Control OFF');
      }
    }
  }

  control(velocity) {
    // If in Park or Neutral, no gas
    if (this.gear === 'P' || this.gear === 'N') {
      this.currentGas = 0;
      this.currentBrake = this.carKeys.brake ? 1 : 0.5; // Parking brake
      this.currentSteer = 0;
      return {
        gas: 0,
        brake: this.currentBrake,
        steer: 0,
        gear: this.gear
      };
    }

    // Target values based on input
    let targetGas = 0;
    let targetBrake = 0;
    let targetSteer = 0;

    // Gas/Brake based on gear
    if (this.gear === 'D') {
      // Drive - forward only
      if (this.carKeys.forward) targetGas = 1;
      if (this.carKeys.backward) targetBrake = 1; // Brake in drive
    } else if (this.gear === 'R') {
      // Reverse - backward only
      if (this.carKeys.backward) targetGas = -1; // Reverse
      if (this.carKeys.forward) targetBrake = 1; // Brake in reverse
    }

    // Brake overrides gas
    if (this.carKeys.brake) {
      targetGas = 0;
      targetBrake = 1;
    }

    // Steering
    if (this.carKeys.left) targetSteer = -1;
    if (this.carKeys.right) targetSteer = 1;

    // Smooth transitions
    // Gas
    if (targetGas > this.currentGas) {
      this.currentGas = Math.min(this.currentGas + this.gasAccelRate, targetGas);
    } else if (targetGas < this.currentGas) {
      this.currentGas = Math.max(this.currentGas - this.gasDecelRate, targetGas);
    }

    // Brake
    if (targetBrake > this.currentBrake) {
      this.currentBrake = Math.min(this.currentBrake + this.brakeAccelRate, targetBrake);
    } else if (targetBrake < this.currentBrake) {
      this.currentBrake = Math.max(this.currentBrake - this.brakeDecelRate, targetBrake);
    }

    // Steering
    if (targetSteer > this.currentSteer) {
      this.currentSteer = Math.min(this.currentSteer + this.steerRate, targetSteer);
    } else if (targetSteer < this.currentSteer) {
      this.currentSteer = Math.max(this.currentSteer - this.steerRate, targetSteer);
    }

    // Cruise control (only in Drive)
    if (this.cruiseActive && this.gear === 'D' && !this.carKeys.brake) {
      // Maintain speed
      if (velocity < this.cruiseSpeed - 0.5) {
        this.currentGas = 0.5;
      } else if (velocity > this.cruiseSpeed + 0.5) {
        this.currentGas = 0;
        this.currentBrake = 0.2;
      }
    }

    return {
      gas: this.currentGas,
      brake: this.currentBrake,
      steer: this.currentSteer,
      gear: this.gear
    };
  }

  setCruiseSpeed(speed) {
    this.cruiseSpeed = speed;
  }

  getGear() {
    return this.gear;
  }

  reset() {
    this.currentGas = 0;
    this.currentBrake = 0;
    this.currentSteer = 0;
    this.gear = 'P';
    this.gearIndex = 0;
    this.cruiseActive = false;
  }
}
