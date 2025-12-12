/**
 * Advanced Path Planner with improved forward/backward logic
 * Addresses real-world FSD failure scenarios
 */

export default class AdvancedPathPlanner {
    constructor() {
        this.planningHorizon = 100; // meters
        this.lateralSamples = 15;
        this.longitudinalSamples = 20;
        this.timeHorizon = 8.0; // seconds

        // Path quality metrics
        this.weights = {
            smoothness: 0.3,
            safety: 0.4,
            efficiency: 0.2,
            comfort: 0.1
        };

        // Failure scenario detection
        this.scenarioDetectors = {
            oncomingTraffic: this.detectOncomingTraffic.bind(this),
            wrongLaneTurn: this.detectWrongLaneTurn.bind(this),
            blockedEntry: this.detectBlockedEntry.bind(this),
            indecisiveMerge: this.detectIndecisiveMerge.bind(this),
            excessiveSpeed: this.detectExcessiveSpeed.bind(this)
        };
    }

    /**
     * Plan path with improved bidirectional logic
     */
    planPath(startPose, goalPose, obstacles, roadNetwork, direction = 'forward') {
        const paths = [];

        // Generate candidate paths
        for (let lat = -this.lateralSamples / 2; lat <= this.lateralSamples / 2; lat++) {
            for (let lon = 0; lon < this.longitudinalSamples; lon++) {
                const path = this.generateCandidatePath(
                    startPose,
                    goalPose,
                    lat * 0.5, // lateral offset
                    lon * 2.0, // longitudinal distance
                    direction
                );

                if (path) {
                    path.cost = this.evaluatePathCost(path, obstacles, roadNetwork);
                    path.safetyScore = this.evaluatePathSafety(path, obstacles);
                    paths.push(path);
                }
            }
        }

        // Filter out unsafe paths
        const safePaths = paths.filter(p => p.safetyScore > 0.5);

        if (safePaths.length === 0) {
            console.warn('[PathPlanner] No safe paths found!');
            return null;
        }

        // Select best path
        safePaths.sort((a, b) => a.cost - b.cost);
        return safePaths[0];
    }

    /**
     * Generate a single candidate path
     */
    generateCandidatePath(start, goal, lateralOffset, longitudinalDist, direction) {
        const path = {
            points: [],
            velocities: [],
            curvatures: [],
            direction: direction
        };

        const numPoints = 50;
        const sign = direction === 'forward' ? 1 : -1;

        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;

            // Quintic polynomial interpolation for smooth paths
            const s = this.quinticInterpolate(t);

            // Position along path
            const x = start.pos.x + sign * s * longitudinalDist * Math.cos(start.rot);
            const y = start.pos.y + sign * s * longitudinalDist * Math.sin(start.rot);

            // Add lateral offset with smooth transition
            const lateralT = this.smoothStep(t);
            const offsetX = x + lateralT * lateralOffset * Math.sin(start.rot);
            const offsetY = y - lateralT * lateralOffset * Math.cos(start.rot);

            path.points.push({ x: offsetX, y: offsetY });

            // Velocity profile - slow at start/end, faster in middle
            const baseVel = direction === 'forward' ? 10.0 : 3.0; // Slower in reverse
            const velProfile = 1.0 - Math.abs(2 * t - 1); // Peak at middle
            path.velocities.push(baseVel * velProfile);
        }

        // Calculate curvatures
        for (let i = 1; i < path.points.length - 1; i++) {
            const curvature = this.calculateCurvature(
                path.points[i - 1],
                path.points[i],
                path.points[i + 1]
            );
            path.curvatures.push(curvature);
        }

        return path;
    }

    /**
     * Quintic polynomial for smooth interpolation
     */
    quinticInterpolate(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    /**
     * Smooth step function
     */
    smoothStep(t) {
        return t * t * (3 - 2 * t);
    }

    /**
     * Calculate path curvature at a point
     */
    calculateCurvature(p1, p2, p3) {
        const dx1 = p2.x - p1.x;
        const dy1 = p2.y - p1.y;
        const dx2 = p3.x - p2.x;
        const dy2 = p3.y - p2.y;

        const cross = dx1 * dy2 - dy1 * dx2;
        const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        if (d1 < 0.001 || d2 < 0.001) return 0;

        return cross / (d1 * d2 * (d1 + d2) / 2);
    }

    /**
     * Evaluate path cost
     */
    evaluatePathCost(path, obstacles, roadNetwork) {
        let cost = 0;

        // Smoothness cost (based on curvature)
        const avgCurvature = path.curvatures.reduce((a, b) => a + Math.abs(b), 0) / path.curvatures.length;
        cost += this.weights.smoothness * avgCurvature * 100;

        // Safety cost (proximity to obstacles)
        const minObstacleDist = this.getMinObstacleDistance(path, obstacles);
        if (minObstacleDist < 5.0) {
            cost += this.weights.safety * (5.0 - minObstacleDist) * 50;
        }

        // Efficiency cost (path length)
        const pathLength = this.calculatePathLength(path);
        cost += this.weights.efficiency * pathLength * 0.1;

        // Comfort cost (acceleration changes)
        const jerk = this.calculateJerk(path);
        cost += this.weights.comfort * jerk * 10;

        return cost;
    }

    /**
     * Evaluate path safety
     */
    evaluatePathSafety(path, obstacles) {
        const minDist = this.getMinObstacleDistance(path, obstacles);

        if (minDist < 2.0) return 0; // Collision
        if (minDist < 3.0) return 0.3; // Very unsafe
        if (minDist < 5.0) return 0.6; // Marginal
        return 1.0; // Safe
    }

    /**
     * Get minimum distance to obstacles
     */
    getMinObstacleDistance(path, obstacles) {
        let minDist = Infinity;

        for (const point of path.points) {
            for (const obstacle of obstacles) {
                const obstPos = obstacle.position || obstacle.pos;
                if (!obstPos) continue;

                const dx = point.x - obstPos.x;
                const dy = point.y - (obstPos.z || obstPos.y);
                const dist = Math.sqrt(dx * dx + dy * dy);

                minDist = Math.min(minDist, dist);
            }
        }

        return minDist;
    }

    /**
     * Calculate total path length
     */
    calculatePathLength(path) {
        let length = 0;
        for (let i = 1; i < path.points.length; i++) {
            const dx = path.points[i].x - path.points[i - 1].x;
            const dy = path.points[i].y - path.points[i - 1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    }

    /**
     * Calculate jerk (rate of acceleration change)
     */
    calculateJerk(path) {
        let totalJerk = 0;
        for (let i = 2; i < path.velocities.length; i++) {
            const a1 = path.velocities[i - 1] - path.velocities[i - 2];
            const a2 = path.velocities[i] - path.velocities[i - 1];
            totalJerk += Math.abs(a2 - a1);
        }
        return totalJerk / (path.velocities.length - 2);
    }

    // ===== FSD Failure Scenario Detection =====

    /**
     * Detect potential turn into oncoming traffic
     * Based on: FSD v13.2.8 & v13.2.9 failures
     * Source: Reddit reports, Medium road trip analysis
     */
    detectOncomingTraffic(path, roadNetwork, obstacles) {
        // Check if path crosses into opposing lane
        for (const point of path.points) {
            const lane = roadNetwork.getLaneAtPoint(point);
            if (lane && lane.direction === 'opposing') {
                console.warn('[FSD Safety] Detected path into oncoming traffic!');
                return {
                    detected: true,
                    severity: 'critical',
                    mitigation: 'abort_maneuver'
                };
            }
        }
        return { detected: false };
    }

    /**
     * Detect wrong lane for turn
     * Based on: FSD v13.2.9 turning right from far-left lane
     * Source: Forbes test drive report
     */
    detectWrongLaneTurn(path, roadNetwork, turnDirection) {
        const currentLane = roadNetwork.getCurrentLane();

        if (turnDirection === 'right' && currentLane.position === 'far-left') {
            console.warn('[FSD Safety] Attempting right turn from wrong lane!');
            return {
                detected: true,
                severity: 'high',
                mitigation: 'change_lane_first'
            };
        }

        if (turnDirection === 'left' && currentLane.position === 'far-right') {
            console.warn('[FSD Safety] Attempting left turn from wrong lane!');
            return {
                detected: true,
                severity: 'high',
                mitigation: 'change_lane_first'
            };
        }

        return { detected: false };
    }

    /**
     * Detect blocked/no-entry paths
     * Based on: FSD v13.2.9 entering blocked private access
     * Source: Forbes test drive report
     */
    detectBlockedEntry(path, roadNetwork) {
        for (const point of path.points) {
            const roadSegment = roadNetwork.getSegmentAtPoint(point);
            if (roadSegment && (roadSegment.type === 'no-entry' || roadSegment.blocked)) {
                console.warn('[FSD Safety] Path leads to blocked/no-entry area!');
                return {
                    detected: true,
                    severity: 'high',
                    mitigation: 'find_alternate_route'
                };
            }
        }
        return { detected: false };
    }

    /**
     * Detect indecisive merge behavior
     * Based on: FSD v14 indecisive lane changes
     * Source: Reddit safety hazard reports
     */
    detectIndecisiveMerge(path, mergeHistory) {
        const recentMergeAttempts = mergeHistory.filter(m =>
            performance.now() / 1000 - m.timestamp < 5.0
        );

        if (recentMergeAttempts.length > 3) {
            console.warn('[FSD Safety] Indecisive merge behavior detected!');
            return {
                detected: true,
                severity: 'medium',
                mitigation: 'commit_or_abort'
            };
        }

        return { detected: false };
    }

    /**
     * Detect excessive speeding
     * Based on: FSD v14 "Mad Max mode" excessive speeding
     * Source: Electrek, WebProNews reports
     */
    detectExcessiveSpeed(velocity, speedLimit, roadType) {
        const threshold = roadType === 'highway' ? 1.15 : 1.08; // 15% over on highway, 8% on regular

        if (velocity > speedLimit * threshold) {
            console.warn('[FSD Safety] Excessive speed detected!');
            return {
                detected: true,
                severity: 'medium',
                mitigation: 'reduce_speed'
            };
        }

        return { detected: false };
    }
}
