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
        for (const sign of this.stopSigns) {
            const signPos = sign.position || sign.pos;
            if (!signPos) continue;

            const dx = signPos.x - pose.pos.x;
            const dy = signPos.z - pose.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 20 && distance > 0) {
                const brakeIntensity = Math.max(0, 1.0 - (distance / 20));
                control.brake = Math.max(control.brake, brakeIntensity);
                control.gas *= (1.0 - brakeIntensity);

                if (distance < 3 && velocity < 0.5) {
                    control.brake = 1.0;
                    control.gas = 0;
                }
            }
        }
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
    }
}
