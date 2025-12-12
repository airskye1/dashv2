import FollowController from "./FollowController.js";

/**
 * Enhanced FSD-style Autonomous Controller
 * Implements FSD 13/14 features for human-like driving
 */
export default class EnhancedAutonomousController {
    constructor(path, car, obstacles, trafficLights, stopSigns, parkingSpots) {
        this.baseController = new FollowController(path, car);
        this.car = car;
        this.obstacles = obstacles || [];
        this.trafficLights = trafficLights || [];
        this.stopSigns = stopSigns || [];
        this.parkingSpots = parkingSpots || [];

        // Parking spot dimensions (from Simulator.js)
        this.spotWidth = 2.5; // meters
        this.spotLength = 5.0; // meters

        // FSD 13/14 Features
        this.speedProfile = 'standard';
        this.audioAwareness = true;
        this.visionEnhanced = true;
        this.contextLength = 3;

        // Human-like behavior parameters
        this.reactionTime = 0.3;
        this.smoothingFactor = 0.85;
        this.anticipationDistance = 50;
        this.comfortDeceleration = 3.0;
        this.assertiveness = 0.5;

        // State tracking
        this.lastControl = { steer: 0, gas: 0, brake: 0 };
        this.emergencyVehicleDetected = false;
        this.roadClosureDetected = false;
        this.decisionHistory = [];
        this.maxHistoryLength = 100;

        // Smart Autopark State (FSD v13 Style)
        this.isParking = false;
        this.parkingPhase = 'none'; // none, scanning, positioning, reversing, adjusting, finalizing
        this.targetParkingSpot = null;
        this.parkingStartTime = 0;
        this.maneuverStartTime = 0;
        this.parkingAttempts = 0;

        // Stop Sign State
        this.stopSignState = {
            id: null,
            stoppedTime: 0,
            hasStopped: false,
            waitTime: 3.0 // Full 3 second stop
        };

        this.setSpeedProfile('standard');
    }

    replacePath(path) {
        this.baseController.replacePath(path);
        this.pathEndReached = false;
    }

    predictPoseAfterTime(currentPose, predictionTime) {
        return this.baseController.predictPoseAfterTime(currentPose, predictionTime);
    }

    setSpeedProfile(profile) {
        this.speedProfile = profile;

        const profiles = {
            'sloth': { assertiveness: 0.2, maxSpeedMultiplier: 0.85, followDistance: 3.0 },
            'chill': { assertiveness: 0.4, maxSpeedMultiplier: 0.95, followDistance: 2.5 },
            'standard': { assertiveness: 0.5, maxSpeedMultiplier: 1.0, followDistance: 2.0 },
            'hurry': { assertiveness: 0.7, maxSpeedMultiplier: 1.1, followDistance: 1.5 },
            'mad_max': { assertiveness: 0.9, maxSpeedMultiplier: 1.2, followDistance: 1.2 }
        };

        const config = profiles[profile] || profiles['standard'];
        this.assertiveness = config.assertiveness;
        this.maxSpeedMultiplier = config.maxSpeedMultiplier;
        this.followDistance = config.followDistance;

        console.log(`[FSD] Speed Profile: ${profile.toUpperCase()}`);
    }

    control(pose, wheelAngle, velocity, dt, enabled, direction) {
        if (!enabled) {
            return { steer: 0, gas: 0, brake: 0 };
        }

        // Check for auto-parking execution
        if (this.isParking) {
            const parkingCtrl = this.executeSmartParkingManeuver(pose, velocity, dt);
            if (parkingCtrl) return parkingCtrl;
        }

        // Get base control from path follower
        let control = this.baseController.control(pose, wheelAngle, velocity, dt, enabled, direction);

        // FSD 13/14 Enhancements
        control = this.applyEmergencyVehicleDetection(control, pose);
        control = this.applyTrafficLightAwareness(control, pose, velocity);
        control = this.applyStopSignBehavior(control, pose, velocity);
        control = this.applyObstacleAvoidance(control, pose, velocity);
        control = this.applySpeedProfileAdjustments(control, velocity);
        control = this.applyHumanLikeSmoothing(control, dt);
        control = this.applyComfortableBraking(control, velocity);

        // Track decision history
        this.decisionHistory.push({
            time: performance.now() / 1000,
            control: { ...control },
            velocity: velocity,
            pose: { pos: pose.pos.clone(), rot: pose.rot }
        });

        if (this.decisionHistory.length > this.maxHistoryLength) {
            this.decisionHistory.shift();
        }

        this.lastControl = control;
        return control;
    }



    applyEmergencyVehicleDetection(control, pose) {
        if (this.emergencyVehicleDetected) {
            console.log('[FSD] Emergency vehicle detected - pulling over');
            control.steer = Math.min(control.steer + 0.3, 1.0);
            control.brake = Math.max(control.brake, 0.5);
            control.gas = 0;
        }
        return control;
    }

    applyTrafficLightAwareness(control, pose, velocity) {
        for (const light of this.trafficLights) {
            const lightPos = light.position || light.pos;
            if (!lightPos) continue;

            const dx = lightPos.x - pose.pos.x;
            const dy = lightPos.z - pose.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 30 && distance > 0) {
                if (light.state === 'red' || light.state === 'yellow') {
                    const stoppingDistance = (velocity * velocity) / (2 * this.comfortDeceleration);

                    if (distance < stoppingDistance + 5) {
                        const brakeIntensity = Math.min(1.0, stoppingDistance / distance);
                        control.brake = Math.max(control.brake, brakeIntensity * 0.8);
                        control.gas = 0;
                    }
                }
            }
        }
        return control;
    }

    applyStopSignBehavior(control, pose, velocity) {
        let nearestSign = null;
        let minDistance = Infinity;

        // Find nearest stop sign
        for (const sign of this.stopSigns) {
            const signPos = sign.position || sign.pos;
            if (!signPos) continue;

            const dx = signPos.x - pose.pos.x;
            const dy = signPos.z - pose.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
                nearestSign = sign;
            }
        }

        if (nearestSign && minDistance < 30) {
            // New Robust State Machine for Stop Signs
            const now = performance.now() / 1000;

            // 1. Approaching
            if (minDistance < 15 && minDistance > 2) {
                const requiredSpeed = Math.min(minDistance / 2.0, 5.0); // Linearly decrease speed
                if (velocity > requiredSpeed) {
                    control.brake = Math.max(control.brake, 0.5);
                    control.gas = 0;
                }
            }
            // 2. Stopping Zone
            else if (minDistance <= 2) {
                if (!this.stopSignState.hasStopped) {
                    control.brake = 1.0;
                    control.gas = 0;

                    if (Math.abs(velocity) < 0.1) {
                        if (this.stopSignState.stoppedTime === 0) {
                            this.stopSignState.stoppedTime = now;
                            console.log('[FSD] Stopped at sign. Waiting...');
                        }

                        if (now - this.stopSignState.stoppedTime > this.stopSignState.waitTime) {
                            this.stopSignState.hasStopped = true;
                            this.stopSignState.stoppedTime = 0;
                            console.log('[FSD] Proceeding from stop sign.');
                        }
                    }
                }
            }

            // Reset if we moved away
            if (minDistance > 20) {
                this.stopSignState.hasStopped = false;
                this.stopSignState.stoppedTime = 0;
            }
        }

        return control;
    }

    // --- Smart Autopark Logic (FSD v13) ---
    startParking(spot) {
        console.log('[FSD] Smart Autopark initiated.');
        this.isParking = true;
        this.targetParkingSpot = spot;
        this.parkingPhase = 'positioning';
        this.maneuverStartTime = performance.now() / 1000;
        this.parkingAttempts = 0;
    }

    executeSmartParkingManeuver(pose, velocity, dt) {
        const spot = this.targetParkingSpot;
        if (!spot) { this.isParking = false; return null; }

        const now = performance.now() / 1000;
        const phaseDuration = now - this.maneuverStartTime;

        const spotPos = spot.pos || spot.position;
        const spotRot = spot.rot || spot.rotation || 0;

        // Transform car to spot local coordinates
        // dx, dy relative to spot center
        const dx = pose.pos.x - spotPos.x;
        const dy = pose.pos.y - spotPos.y;

        // Rotate into spot frame (where +Y is out of spot, +X is right)
        // Adjust for spot rotation
        const localX = dx * Math.cos(-spotRot) - dy * Math.sin(-spotRot);
        const localY = dx * Math.sin(-spotRot) + dy * Math.cos(-spotRot);

        // Spot dimensions (approx)
        // localY should be 0 when centered
        // localX should be 0 when centered

        const alignmentError = Math.wrapAngle(pose.rot - spotRot); // 0 means aligned with spot (facing OUT or IN depends on def)
        // Usually spots are defined s.t. cars park aligned with rotation. 
        // Assuming we want to reverse in: we want car rear facing spot back.
        // Actually, let's assume standard parallel or perpendicular. 
        // For perpendicular, we want to align with spotRot.

        let control = { steer: 0, gas: 0, brake: 0 };
        const CRAWL_SPEED = 0.5;
        const REVERSE_CRAWL = -0.5;

        // FSD "Deliberate" Pauses
        const pause = () => {
            control.gas = 0;
            control.brake = 1.0;
            control.steer = 0;
        };

        switch (this.parkingPhase) {
            case 'positioning':
                // Move forward past the spot to get ready to reverse
                // Target: x = 0 (aligned laterally), y = 6.0 (6 meters out)
                // Actually usually we are on the road (y = 0 relative to road, spot is at y = -something)

                // Simple logic: Drive until we are past the spot in the direction of the road
                // Distance to "Reverse Start Point"
                // Let's aim for a point ~5 meters "forward" of the spot and ~3 meters "out"

                // For now, let's use a simple state machine based on local coordinates

                // If we are "behind" the spot (relative to road flow) or "in" it, drive out/forward
                // This is hard without full map context. 
                // Let's assume we are approaching.

                if (localY < 5.0) {
                    // Drive forward
                    control.steer = 0; // Keep straight roughly
                    control.gas = CRAWL_SPEED;
                } else {
                    // We are past it. Stop.
                    pause();
                    if (Math.abs(velocity) < 0.1 && phaseDuration > 1.0) {
                        this.parkingPhase = 'pausing_before_reverse';
                        this.maneuverStartTime = now;
                        console.log('[FSD] Positioning complete. Improving angle...');
                    }
                }
                break;

            case 'pausing_before_reverse':
                pause();
                if (phaseDuration > 2.0) {
                    this.parkingPhase = 'reversing';
                    this.maneuverStartTime = now;
                    console.log('[FSD] Shifting to Reverse...');
                }
                break;

            case 'reversing':
                // Back into the spot using pure geometric pursuit on the spot center
                // Target: localX = 0, localY = 0

                // Steering logic for reversing: 
                // If localX > 0 (we are to the right of spot), we need to steer RIGHT to make rear go LEFT?
                // No, when reversing, steering Right makes Rear go Right.
                // We want rear to go towards 0. 

                // P-Controller for steering based on cross-track error to spot centerline
                const kP = 0.8;
                const kHeading = 2.0;

                // Desired heading is straight into spot (Math.PI/2 relative to road usually? or 0 relative to spot)
                // effectively we want alignmentError to be close to 0 (if spotRot is 'out') or PI (if 'in')
                // Let's target alignmentError = 0 (aligned with spot orientation)

                // While reversing, if we are to the Right (localX > 0), we want to steer Right to move Left? 
                // Wait, if I steer RIGHT (positive), the car turns CW. The rear moves LEFT (relative to car front).
                // It moves towards -Y local in car frame.

                // Let's stick to simple "steer towards error"
                // Error = localX. 
                // If localX is positive, we are "Right" of center. We want to go "Left".
                // In reverse, steering Left makes car turn CCW, rear moves Right.
                // Steering Right makes car turn CW, rear moves Left.

                // So if localX > 0, we want rear to move Left (-X). So we steer Right (+).

                let steer = localX * kP + Math.wrapAngle(alignmentError) * kHeading;

                // Clamp
                steer = Math.max(-1.0, Math.min(1.0, steer));
                control.steer = steer;
                control.gas = REVERSE_CRAWL;

                // Distance check
                const dist = Math.sqrt(localX * localX + localY * localY);

                if (localY < 0.5 && Math.abs(localX) < 0.5) {
                    // Close enough!
                    pause();
                    if (Math.abs(velocity) < 0.1) {
                        this.parkingPhase = 'finalizing';
                        this.maneuverStartTime = now;
                    }
                } else if (localY < -1.0) {
                    // Went too far back?
                    control.brake = 1.0;
                    control.gas = 0;
                    // Maybe pull forward (multi-point turn)
                    if (Math.abs(velocity) < 0.1) {
                        this.parkingPhase = 'adjusting_forward';
                        this.maneuverStartTime = now;
                    }
                }
                break;

            case 'adjusting_forward':
                // Pull forward to fix angle
                control.gas = CRAWL_SPEED;
                control.steer = -Math.sign(localX); // Steer opposite to fix error

                if (phaseDuration > 2.0 || localY > 2.0) {
                    pause();
                    if (Math.abs(velocity) < 0.1) {
                        this.parkingPhase = 'reversing'; // Try reversing again
                        this.maneuverStartTime = now;
                    }
                }
                break;

            case 'finalizing':
                pause();
                console.log('[FSD] Parked.');
                break;
        }

        // Smooth output
        control.steer = this.lastControl.steer * 0.9 + control.steer * 0.1;
        control.gas = this.lastControl.gas * 0.9 + control.gas * 0.1;

        this.lastControl = control;
        return control;
    }

    applyObstacleAvoidance(control, pose, velocity) {
        const carPos = pose.pos;
        const carRot = pose.rot;

        let closestObstacleDistance = Infinity;
        let obstacleOnLeft = false;

        for (const obstacle of this.obstacles) {
            const obstaclePos = obstacle.position || obstacle.pos;
            if (!obstaclePos) continue;

            const dx = obstaclePos.x - carPos.x;
            const dy = obstaclePos.z - carPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.anticipationDistance) {
                const angleToObstacle = Math.atan2(dy, dx);
                const relativeAngle = Math.wrapAngle(angleToObstacle - carRot);

                if (Math.abs(relativeAngle) < Math.PI / 3) {
                    if (distance < closestObstacleDistance) {
                        closestObstacleDistance = distance;
                        obstacleOnLeft = relativeAngle > 0;
                    }
                }
            }
        }

        if (closestObstacleDistance < 15) {
            const urgency = 1.0 - (closestObstacleDistance / 15);
            control.gas *= (1.0 - urgency * 0.5);
            control.brake = Math.max(control.brake, urgency * 0.3);

            const steerAdjustment = urgency * 0.2 * (obstacleOnLeft ? -1 : 1);
            control.steer += steerAdjustment;
            control.steer = Math.max(-1, Math.min(1, control.steer));

            if (closestObstacleDistance < 5) {
                console.log('[FSD] Obstacle avoidance active');
            }
        }
        return control;
    }

    applySpeedProfileAdjustments(control, velocity) {
        if (this.speedProfile === 'sloth' || this.speedProfile === 'chill') {
            control.gas *= 0.9;
        } else if (this.speedProfile === 'hurry' || this.speedProfile === 'mad_max') {
            control.gas = Math.min(1.0, control.gas * 1.1);
        }
        return control;
    }

    applyHumanLikeSmoothing(control, dt) {
        control.steer = this.lastControl.steer * (1 - this.smoothingFactor) + control.steer * this.smoothingFactor;
        control.gas = this.lastControl.gas * (1 - this.smoothingFactor) + control.gas * this.smoothingFactor;
        control.brake = this.lastControl.brake * (1 - this.smoothingFactor) + control.brake * this.smoothingFactor;
        return control;
    }

    applyComfortableBraking(control, velocity) {
        if (control.brake > 0.7 && velocity > 5) {
            control.brake = Math.min(control.brake, 0.7);
        }
        return control;
    }

    reset() {
        this.baseController.reset();
        this.lastControl = { steer: 0, gas: 0, brake: 0 };
        this.decisionHistory = [];
        this.emergencyVehicleDetected = false;

        // Reset Smart Autopark
        this.isParking = false;
        this.parkingPhase = 'none';
        this.targetParkingSpot = null;

        // Reset Stop Sign State
        this.stopSignState = { id: null, stoppedTime: 0, hasStopped: false, waitTime: 3.0 };
    }
}
