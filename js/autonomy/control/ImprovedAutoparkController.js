/**
 * Improved Autopark Controller
 * Advanced path planning for parallel and perpendicular parking
 * Implements slow, deliberate maneuvers with multi-point turns
 */

export default class ImprovedAutoparkController {
    constructor(car, parkingSpot) {
        this.car = car;
        this.spot = parkingSpot;

        // Parking parameters
        this.spotWidth = 2.5; // meters
        this.spotLength = 5.0; // meters
        this.carWidth = 1.8;
        this.carLength = 4.5;
        this.carWheelbase = 2.7;

        // Speed limits for safety - VERY SLOW for realism
        this.CRAWL_SPEED = 0.5; // m/s - ultra slow forward (~1.1 mph)
        this.REVERSE_SPEED = -0.4; // m/s - ultra slow reverse (~0.9 mph)
        this.PAUSE_DURATION = 2.0; // seconds between maneuvers - longer for realism

        // State machine
        this.phase = 'idle'; // idle, approaching, aligning, reversing, adjusting, centering, complete
        this.phaseStartTime = 0;
        this.maneuverPath = [];
        this.currentPathIndex = 0;

        // Path planning
        this.waypoints = [];
        this.targetPose = null;

        // Safety
        this.maxAttempts = 5;
        this.attemptCount = 0;
        this.lastControl = { steer: 0, gas: 0, brake: 0 };

        // Smoothing factors - more aggressive for ultra-smooth control
        this.steerSmoothing = 0.08; // Very gradual steering
        this.gasSmoothing = 0.05; // Very gradual acceleration
        this.brakeSmoothing = 0.1; // Moderate braking
    }

    /**
     * Start parking sequence
     */
    start() {
        console.log('[Autopark] Starting advanced parking sequence');
        this.phase = 'planning';
        this.phaseStartTime = performance.now() / 1000;
        this.planParkingPath();
    }

    /**
     * Plan complete parking path
     */
    planParkingPath() {
        const spotPos = this.spot.pos || this.spot.position;
        const spotRot = this.spot.rot || this.spot.rotation || 0;

        // Determine parking type
        const parkingType = this.determineParkingType();

        if (parkingType === 'perpendicular') {
            this.planPerpendicularParking(spotPos, spotRot);
        } else {
            this.planParallelParking(spotPos, spotRot);
        }

        this.phase = 'approaching';
        console.log(`[Autopark] Planned ${parkingType} parking with ${this.waypoints.length} waypoints`);
    }

    /**
     * Determine parking type based on spot orientation
     */
    determineParkingType() {
        // Simplified: check if spot is perpendicular or parallel to road
        // In real implementation, would check road direction
        return 'perpendicular'; // Default for now
    }

    /**
     * Plan perpendicular parking path
     */
    planPerpendicularParking(spotPos, spotRot) {
        this.waypoints = [];

        // Waypoint 1: Approach position (beside the spot)
        const approachDist = 3.0; // meters beside spot
        this.waypoints.push({
            pos: {
                x: spotPos.x + approachDist * Math.sin(spotRot),
                y: spotPos.y - approachDist * Math.cos(spotRot)
            },
            rot: spotRot + Math.PI / 2, // Perpendicular to spot
            speed: this.CRAWL_SPEED,
            direction: 'forward',
            phase: 'approaching'
        });

        // Waypoint 2: Alignment position (ready to reverse)
        const alignDist = 2.5;
        this.waypoints.push({
            pos: {
                x: spotPos.x + alignDist * Math.sin(spotRot),
                y: spotPos.y - alignDist * Math.cos(spotRot)
            },
            rot: spotRot + Math.PI / 2,
            speed: 0,
            direction: 'stop',
            phase: 'aligning',
            pauseDuration: this.PAUSE_DURATION
        });

        // Waypoint 3: Mid-reverse position (halfway into spot)
        const midDist = this.spotLength / 2;
        this.waypoints.push({
            pos: {
                x: spotPos.x + (midDist / 2) * Math.cos(spotRot),
                y: spotPos.y + (midDist / 2) * Math.sin(spotRot)
            },
            rot: spotRot,
            speed: this.REVERSE_SPEED,
            direction: 'reverse',
            phase: 'reversing'
        });

        // Waypoint 4: Final position (centered in spot)
        this.waypoints.push({
            pos: {
                x: spotPos.x,
                y: spotPos.y
            },
            rot: spotRot,
            speed: 0,
            direction: 'stop',
            phase: 'centering',
            pauseDuration: 1.0
        });

        // Waypoint 5: Adjustment if needed
        this.waypoints.push({
            pos: {
                x: spotPos.x,
                y: spotPos.y
            },
            rot: spotRot,
            speed: 0,
            direction: 'stop',
            phase: 'complete'
        });
    }

    /**
     * Plan parallel parking path
     */
    planParallelParking(spotPos, spotRot) {
        this.waypoints = [];

        // Parallel parking requires more complex multi-point turn
        const lateralOffset = 1.5; // meters beside spot

        // Waypoint 1: Pull alongside spot
        this.waypoints.push({
            pos: {
                x: spotPos.x - this.spotLength * 0.5 * Math.cos(spotRot) + lateralOffset * Math.sin(spotRot),
                y: spotPos.y - this.spotLength * 0.5 * Math.sin(spotRot) - lateralOffset * Math.cos(spotRot)
            },
            rot: spotRot,
            speed: this.CRAWL_SPEED,
            direction: 'forward',
            phase: 'approaching'
        });

        // Waypoint 2: Stop and prepare to reverse
        this.waypoints.push({
            pos: {
                x: spotPos.x + lateralOffset * Math.sin(spotRot),
                y: spotPos.y - lateralOffset * Math.cos(spotRot)
            },
            rot: spotRot,
            speed: 0,
            direction: 'stop',
            phase: 'aligning',
            pauseDuration: this.PAUSE_DURATION
        });

        // Waypoint 3: Reverse at angle into spot
        this.waypoints.push({
            pos: {
                x: spotPos.x + 0.5 * Math.sin(spotRot),
                y: spotPos.y - 0.5 * Math.cos(spotRot)
            },
            rot: spotRot - Math.PI / 6, // 30 degree angle
            speed: this.REVERSE_SPEED,
            direction: 'reverse',
            phase: 'reversing'
        });

        // Waypoint 4: Straighten out
        this.waypoints.push({
            pos: spotPos,
            rot: spotRot,
            speed: this.REVERSE_SPEED * 0.5,
            direction: 'reverse',
            phase: 'centering'
        });

        // Waypoint 5: Final position
        this.waypoints.push({
            pos: spotPos,
            rot: spotRot,
            speed: 0,
            direction: 'stop',
            phase: 'complete'
        });
    }

    /**
     * Execute parking maneuver
     */
    control(pose, velocity, dt) {
        const now = performance.now() / 1000;
        const phaseDuration = now - this.phaseStartTime;

        // Check if we have waypoints
        if (this.waypoints.length === 0) {
            return this.stop();
        }

        // Get current waypoint
        const currentWaypoint = this.waypoints[this.currentPathIndex];
        if (!currentWaypoint) {
            console.log('[Autopark] Parking complete!');
            this.phase = 'complete';
            return this.stop();
        }

        // Update phase if changed
        if (this.phase !== currentWaypoint.phase) {
            this.phase = currentWaypoint.phase;
            this.phaseStartTime = now;
            console.log(`[Autopark] Phase: ${this.phase}`);
        }

        // Handle pause waypoints
        if (currentWaypoint.direction === 'stop' && currentWaypoint.pauseDuration) {
            if (phaseDuration < currentWaypoint.pauseDuration) {
                return this.stop();
            } else {
                // Move to next waypoint
                this.currentPathIndex++;
                this.phaseStartTime = now;
                return this.stop();
            }
        }

        // Calculate control to reach waypoint
        const control = this.calculateControl(pose, velocity, currentWaypoint);

        // Check if waypoint reached
        if (this.isWaypointReached(pose, currentWaypoint)) {
            console.log(`[Autopark] Waypoint ${this.currentPathIndex} reached`);
            this.currentPathIndex++;
            this.phaseStartTime = now;

            // If this was the last waypoint, stop
            if (this.currentPathIndex >= this.waypoints.length) {
                return this.stop();
            }
        }

        // Apply smoothing with configurable factors
        control.steer = this.smooth(this.lastControl.steer, control.steer, this.steerSmoothing);
        control.gas = this.smooth(this.lastControl.gas, control.gas, this.gasSmoothing);
        control.brake = this.smooth(this.lastControl.brake, control.brake, this.brakeSmoothing);

        this.lastControl = control;
        return control;
    }

    /**
     * Calculate control to reach waypoint
     */
    calculateControl(pose, velocity, waypoint) {
        const control = { steer: 0, gas: 0, brake: 0 };

        // Calculate distance and angle to waypoint
        const dx = waypoint.pos.x - pose.pos.x;
        const dy = waypoint.pos.y - pose.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angleToWaypoint = Math.atan2(dy, dx);

        // Calculate heading error
        let headingError = this.normalizeAngle(angleToWaypoint - pose.rot);

        // If reversing, flip the heading error
        if (waypoint.direction === 'reverse') {
            headingError = this.normalizeAngle(headingError + Math.PI);
        }

        // Steering control (proportional)
        const kP_steer = 2.5;
        control.steer = Math.max(-1, Math.min(1, headingError * kP_steer));

        // Speed control
        const targetSpeed = waypoint.speed;
        const speedError = targetSpeed - velocity;

        if (waypoint.direction === 'reverse') {
            // Reversing
            if (velocity > targetSpeed) {
                control.gas = 0;
                control.brake = 0.3;
            } else {
                control.gas = Math.abs(targetSpeed) * 0.5; // Gentle reverse
                control.brake = 0;
            }
        } else if (waypoint.direction === 'forward') {
            // Forward
            if (velocity < targetSpeed) {
                control.gas = Math.min(0.5, speedError * 0.3);
                control.brake = 0;
            } else {
                control.gas = 0;
                control.brake = 0.2;
            }
        } else {
            // Stop
            control.gas = 0;
            control.brake = Math.abs(velocity) > 0.1 ? 1.0 : 0.5;
        }

        // Reduce speed when close to waypoint - start slowing down earlier
        if (distance < 3.0 && waypoint.direction !== 'stop') {
            const slowdownFactor = Math.max(0.3, distance / 3.0); // Never go below 30% speed
            control.gas *= slowdownFactor;
        }

        return control;
    }

    /**
     * Check if waypoint is reached
     */
    isWaypointReached(pose, waypoint) {
        const dx = waypoint.pos.x - pose.pos.x;
        const dy = waypoint.pos.y - pose.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const headingError = Math.abs(this.normalizeAngle(waypoint.rot - pose.rot));

        // Tolerances - tighter for better accuracy
        const positionTolerance = 0.25; // meters - tighter
        const headingTolerance = 0.12; // radians (~7 degrees) - tighter

        return distance < positionTolerance && headingError < headingTolerance;
    }

    /**
     * Stop the vehicle
     */
    stop() {
        return {
            steer: 0,
            gas: 0,
            brake: 1.0
        };
    }

    /**
     * Smooth value transition
     */
    smooth(current, target, alpha) {
        return current * (1 - alpha) + target * alpha;
    }

    /**
     * Normalize angle to [-PI, PI]
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    /**
     * Get current phase
     */
    getPhase() {
        return this.phase;
    }

    /**
     * Get progress (0 to 1)
     */
    getProgress() {
        if (this.waypoints.length === 0) return 0;
        return this.currentPathIndex / this.waypoints.length;
    }

    /**
     * Reset controller
     */
    reset() {
        this.phase = 'idle';
        this.waypoints = [];
        this.currentPathIndex = 0;
        this.attemptCount = 0;
        this.lastControl = { steer: 0, gas: 0, brake: 0 };
    }
}
