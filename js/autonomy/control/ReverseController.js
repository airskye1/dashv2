import Car from "../../physics/Car.js";
import Path from "../../autonomy/Path.js";

/**
 * FSD-style Reverse/Unstuck Controller
 * Uses existing autopilot logic but in reverse
 */
export default class ReverseController {
    constructor(car, obstacles, lanePath) {
        this.car = car;
        this.obstacles = obstacles || [];
        this.lanePath = lanePath;

        // FSD-style state tracking
        this.isReversing = false;
        this.reverseStartTime = 0;
        this.reverseDuration = 0;
        this.stuckDetectionTime = 0;
        this.positionHistory = [];
        this.maxHistoryLength = 30; // ~0.5 seconds at 60fps

        // Detection parameters
        this.minObstacleDistance = 3.0; // meters
        this.stuckVelocityThreshold = 0.2; // m/s
        this.stuckTimeThreshold = 0.8; // seconds
        this.maxReverseDuration = 3.0; // seconds

        // Learning-like behavior
        this.reverseAttempts = 0;
        this.successfulEscapes = 0;
    }

    update(dt, currentPose) {
        const now = performance.now() / 1000;

        // Track position history for stuck detection
        this.positionHistory.push({
            pos: currentPose.pos.clone(),
            time: now
        });

        if (this.positionHistory.length > this.maxHistoryLength) {
            this.positionHistory.shift();
        }

        // Check if we should start reversing
        if (!this.isReversing) {
            const shouldReverse = this.detectNeedToReverse(currentPose, now);

            if (shouldReverse) {
                this.startReverse(now, currentPose);
            }
        } else {
            // Check if we should stop reversing
            if (this.shouldStopReversing(now, currentPose)) {
                this.stopReverse();
            }
        }

        return this.getReversePath();
    }

    detectNeedToReverse(currentPose, now) {
        // 1. Check for obstacles too close
        const tooCloseToObstacle = this.checkObstacleProximity(currentPose);

        // 2. Check if stuck
        const isStuck = this.detectStuck(currentPose, now);

        return tooCloseToObstacle || isStuck;
    }

    checkObstacleProximity(currentPose) {
        const carPos = currentPose.pos;
        const carRot = currentPose.rot;

        const frontAxle = Car.getFrontAxlePosition(carPos, carRot);

        for (const obstacle of this.obstacles) {
            const obstaclePos = obstacle.position || obstacle.pos;
            if (!obstaclePos) continue;

            const dx = obstaclePos.x - frontAxle.x;
            const dz = obstaclePos.z - frontAxle.y;
            const distance = Math.sqrt(dx * dx + dz * dz);

            const angleToObstacle = Math.atan2(dz, dx);
            const relativeAngle = Math.abs(Math.wrapAngle(angleToObstacle - carRot));

            if (relativeAngle < Math.PI / 2 && distance < this.minObstacleDistance) {
                console.log('[FSD Reverse] Too close to obstacle:', distance.toFixed(2), 'm');
                return true;
            }
        }

        return false;
    }

    detectStuck(currentPose, now) {
        if (this.positionHistory.length < 10) return false;

        const recentHistory = this.positionHistory.slice(-10);
        const oldestPos = recentHistory[0].pos;
        const newestPos = recentHistory[recentHistory.length - 1].pos;
        const timeDiff = recentHistory[recentHistory.length - 1].time - recentHistory[0].time;

        const displacement = oldestPos.distanceTo(newestPos);
        const avgVelocity = displacement / timeDiff;

        const throttleApplied = Math.abs(currentPose.velocity) > 0.1;
        const notMoving = avgVelocity < this.stuckVelocityThreshold;

        if (throttleApplied && notMoving) {
            if (this.stuckDetectionTime === 0) {
                this.stuckDetectionTime = now;
            } else if (now - this.stuckDetectionTime > this.stuckTimeThreshold) {
                console.log('[FSD Reverse] Stuck detected! Avg velocity:', avgVelocity.toFixed(2), 'm/s');
                return true;
            }
        } else {
            this.stuckDetectionTime = 0;
        }

        return false;
    }

    startReverse(now, currentPose) {
        console.log('[FSD Reverse] Starting reverse maneuver');
        this.isReversing = true;
        this.reverseStartTime = now;
        this.reverseAttempts++;

        // Create a simple reverse path - just go backwards along current heading
        const carPos = currentPose.pos;
        const carRot = currentPose.rot;

        // Create path points going backwards
        const reversePath = [];
        const reverseDistance = 10; // Go back 10 meters
        const numPoints = 20;

        for (let i = 0; i <= numPoints; i++) {
            const dist = (i / numPoints) * reverseDistance;
            // Go backwards (negative direction)
            const x = carPos.x - Math.cos(carRot) * dist;
            const y = carPos.y - Math.sin(carRot) * dist;

            reversePath.push({
                pos: new THREE.Vector2(x, y),
                rot: carRot,
                curv: 0,
                dCurv: 0,
                ddCurv: 0,
                velocity: -3.0 // Negative velocity for reverse
            });
        }

        this.reversePath = new Path(reversePath);

        // Adaptive duration
        const adaptiveFactor = 1.0 + (this.reverseAttempts * 0.2);
        this.reverseDuration = Math.min(this.maxReverseDuration, 1.5 * adaptiveFactor);
    }

    shouldStopReversing(now, currentPose) {
        const elapsed = now - this.reverseStartTime;

        if (elapsed > this.reverseDuration) {
            console.log('[FSD Reverse] Reverse duration complete');
            this.successfulEscapes++;
            return true;
        }

        if (!this.checkObstacleProximity(currentPose)) {
            console.log('[FSD Reverse] Obstacles cleared');
            this.successfulEscapes++;
            return true;
        }

        return false;
    }

    stopReverse() {
        console.log('[FSD Reverse] Stopping reverse');
        this.isReversing = false;
        this.reversePath = null;
        this.stuckDetectionTime = 0;
        this.positionHistory = [];
    }

    getReversePath() {
        return this.reversePath; // Return path for autopilot to follow
    }

    reset() {
        this.isReversing = false;
        this.reversePath = null;
        this.stuckDetectionTime = 0;
        this.positionHistory = [];
        this.reverseAttempts = 0;
    }
}
