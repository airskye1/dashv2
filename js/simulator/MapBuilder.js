/**
 * Comprehensive Map Builder
 * Supports highways, freeways, intersections, onramps, and complex road networks
 */

export default class MapBuilder {
    constructor() {
        this.roads = [];
        this.intersections = [];
        this.highways = [];
        this.onramps = [];
        this.offramps = [];
        this.lanes = [];
        this.roadNetwork = {
            nodes: [],
            edges: [],
            segments: []
        };

        this.idCounter = 0;
    }

    /**
     * Create a new road segment
     */
    createRoad(config) {
        const road = {
            id: this.generateId('road'),
            type: config.type || 'regular', // regular, highway, freeway, residential
            lanes: config.lanes || 2,
            width: config.width || 7.4,
            speedLimit: config.speedLimit || 13.4, // m/s (~30 mph)
            path: config.path || [],
            direction: config.direction || 'bidirectional', // bidirectional, oneway
            surface: config.surface || 'asphalt',
            markings: config.markings || 'standard',
            ...config
        };

        this.roads.push(road);
        return road;
    }

    /**
     * Create a highway segment
     */
    createHighway(config) {
        const highway = this.createRoad({
            type: 'highway',
            lanes: config.lanes || 4,
            width: config.width || 14.6, // ~4 lanes
            speedLimit: config.speedLimit || 29.1, // m/s (~65 mph)
            direction: 'bidirectional',
            hasMedian: true,
            medianWidth: config.medianWidth || 3.0,
            shoulderWidth: config.shoulderWidth || 2.5,
            ...config
        });

        this.highways.push(highway);
        return highway;
    }

    /**
     * Create a freeway segment (limited access highway)
     */
    createFreeway(config) {
        const freeway = this.createRoad({
            type: 'freeway',
            lanes: config.lanes || 6,
            width: config.width || 21.9, // ~6 lanes
            speedLimit: config.speedLimit || 31.3, // m/s (~70 mph)
            direction: 'bidirectional',
            hasMedian: true,
            medianWidth: config.medianWidth || 4.0,
            shoulderWidth: config.shoulderWidth || 3.0,
            limitedAccess: true,
            ...config
        });

        this.highways.push(freeway);
        return freeway;
    }

    /**
     * Create an onramp
     */
    createOnramp(fromRoad, toHighway, config = {}) {
        const onramp = {
            id: this.generateId('onramp'),
            type: 'onramp',
            from: fromRoad.id,
            to: toHighway.id,
            lanes: 1,
            width: 3.7,
            speedLimit: 20.1, // m/s (~45 mph)
            length: config.length || 100, // meters
            curvature: config.curvature || 0.02,
            accelerationLane: config.accelerationLane !== false,
            accelerationLaneLength: config.accelerationLaneLength || 50,
            mergeType: config.mergeType || 'zipper', // zipper, yield
            path: this.generateRampPath(fromRoad, toHighway, 'on', config),
            ...config
        };

        this.onramps.push(onramp);
        this.roads.push(onramp);
        return onramp;
    }

    /**
     * Create an offramp
     */
    createOfframp(fromHighway, toRoad, config = {}) {
        const offramp = {
            id: this.generateId('offramp'),
            type: 'offramp',
            from: fromHighway.id,
            to: toRoad.id,
            lanes: 1,
            width: 3.7,
            speedLimit: 20.1, // m/s (~45 mph)
            length: config.length || 100,
            curvature: config.curvature || 0.02,
            decelerationLane: config.decelerationLane !== false,
            decelerationLaneLength: config.decelerationLaneLength || 50,
            path: this.generateRampPath(fromHighway, toRoad, 'off', config),
            ...config
        };

        this.offramps.push(offramp);
        this.roads.push(offramp);
        return offramp;
    }

    /**
     * Create an intersection
     */
    createIntersection(roads, config = {}) {
        const intersection = {
            id: this.generateId('intersection'),
            type: config.type || '4-way', // 4-way, 3-way, roundabout, complex
            roads: roads.map(r => r.id),
            center: config.center || this.calculateIntersectionCenter(roads),
            radius: config.radius || 15,
            controlType: config.controlType || 'traffic-light', // traffic-light, stop-sign, yield, roundabout
            trafficLights: [],
            stopSigns: [],
            yieldSigns: [],
            crosswalks: config.crosswalks || [],
            turnLanes: config.turnLanes || {},
            ...config
        };

        // Generate traffic control elements
        if (intersection.controlType === 'traffic-light') {
            intersection.trafficLights = this.generateTrafficLights(intersection, roads);
        } else if (intersection.controlType === 'stop-sign') {
            intersection.stopSigns = this.generateStopSigns(intersection, roads);
        }

        this.intersections.push(intersection);
        return intersection;
    }

    /**
     * Generate ramp path (onramp or offramp)
     */
    generateRampPath(fromRoad, toRoad, rampType, config) {
        const path = [];
        const numPoints = 50;

        // Get start and end points
        const startPoint = rampType === 'on' ?
            this.getRoadEndPoint(fromRoad) :
            this.getRoadPoint(fromRoad, 0.7); // Exit 70% along highway

        const endPoint = rampType === 'on' ?
            this.getRoadPoint(toRoad, 0.3) : // Merge 30% along highway
            this.getRoadStartPoint(toRoad);

        // Generate smooth curved path
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;

            // Use cubic Bezier curve for smooth ramp
            const controlPoint1 = {
                x: startPoint.x + (endPoint.x - startPoint.x) * 0.25,
                y: startPoint.y + (endPoint.y - startPoint.y) * 0.25 + (config.curvature || 0.02) * 50
            };

            const controlPoint2 = {
                x: startPoint.x + (endPoint.x - startPoint.x) * 0.75,
                y: startPoint.y + (endPoint.y - startPoint.y) * 0.75 + (config.curvature || 0.02) * 50
            };

            const point = this.cubicBezier(t, startPoint, controlPoint1, controlPoint2, endPoint);
            path.push(point);
        }

        return path;
    }

    /**
     * Cubic Bezier interpolation
     */
    cubicBezier(t, p0, p1, p2, p3) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;

        return {
            x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
            y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
        };
    }

    /**
     * Generate traffic lights for intersection
     */
    generateTrafficLights(intersection, roads) {
        const lights = [];
        const phases = this.calculateTrafficLightPhases(intersection, roads);

        roads.forEach((road, index) => {
            const position = this.getIntersectionEntryPoint(intersection, road);

            lights.push({
                id: this.generateId('light'),
                position: position,
                road: road.id,
                state: index === 0 ? 'green' : 'red',
                phases: phases,
                currentPhase: 0,
                timer: 0,
                yellowDuration: 3.0,
                redDuration: 2.0
            });
        });

        return lights;
    }

    /**
     * Calculate traffic light phases
     */
    calculateTrafficLightPhases(intersection, roads) {
        if (intersection.type === '4-way') {
            return [
                { duration: 30, greenRoads: [0, 2], yellowRoads: [], redRoads: [1, 3] },
                { duration: 3, greenRoads: [], yellowRoads: [0, 2], redRoads: [1, 3] },
                { duration: 2, greenRoads: [], yellowRoads: [], redRoads: [0, 1, 2, 3] },
                { duration: 30, greenRoads: [1, 3], yellowRoads: [], redRoads: [0, 2] },
                { duration: 3, greenRoads: [], yellowRoads: [1, 3], redRoads: [0, 2] },
                { duration: 2, greenRoads: [], yellowRoads: [], redRoads: [0, 1, 2, 3] }
            ];
        }

        // Default simple alternating
        return [
            { duration: 30, greenRoads: [0], yellowRoads: [], redRoads: [1] },
            { duration: 3, greenRoads: [], yellowRoads: [0], redRoads: [1] },
            { duration: 30, greenRoads: [1], yellowRoads: [], redRoads: [0] },
            { duration: 3, greenRoads: [], yellowRoads: [1], redRoads: [0] }
        ];
    }

    /**
     * Generate stop signs for intersection
     */
    generateStopSigns(intersection, roads) {
        const signs = [];

        roads.forEach(road => {
            const position = this.getIntersectionEntryPoint(intersection, road);

            signs.push({
                id: this.generateId('stop'),
                position: position,
                road: road.id,
                type: 'stop-sign'
            });
        });

        return signs;
    }

    /**
     * Build complete road network graph
     */
    buildRoadNetwork() {
        // Create nodes for all road endpoints and intersections
        this.roadNetwork.nodes = [];
        this.roadNetwork.edges = [];

        // Add intersection nodes
        this.intersections.forEach(intersection => {
            this.roadNetwork.nodes.push({
                id: intersection.id,
                type: 'intersection',
                position: intersection.center,
                data: intersection
            });
        });

        // Add road edges
        this.roads.forEach(road => {
            const startNode = this.findOrCreateNode(this.getRoadStartPoint(road));
            const endNode = this.findOrCreateNode(this.getRoadEndPoint(road));

            this.roadNetwork.edges.push({
                id: road.id,
                from: startNode.id,
                to: endNode.id,
                road: road,
                cost: this.calculateRoadCost(road)
            });
        });

        return this.roadNetwork;
    }

    /**
     * Find shortest path between two points
     */
    findPath(startPos, endPos) {
        const startNode = this.findNearestNode(startPos);
        const endNode = this.findNearestNode(endPos);

        if (!startNode || !endNode) return null;

        // A* pathfinding
        return this.aStarSearch(startNode, endNode);
    }

    /**
     * A* pathfinding algorithm
     */
    aStarSearch(startNode, endNode) {
        const openSet = [startNode];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map([[startNode.id, 0]]);
        const fScore = new Map([[startNode.id, this.heuristic(startNode, endNode)]]);

        while (openSet.length > 0) {
            // Get node with lowest fScore
            openSet.sort((a, b) => fScore.get(a.id) - fScore.get(b.id));
            const current = openSet.shift();

            if (current.id === endNode.id) {
                return this.reconstructPath(cameFrom, current);
            }

            closedSet.add(current.id);

            // Check neighbors
            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                if (closedSet.has(neighbor.id)) continue;

                const tentativeGScore = gScore.get(current.id) + this.distance(current, neighbor);

                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= gScore.get(neighbor.id)) {
                    continue;
                }

                cameFrom.set(neighbor.id, current);
                gScore.set(neighbor.id, tentativeGScore);
                fScore.set(neighbor.id, tentativeGScore + this.heuristic(neighbor, endNode));
            }
        }

        return null; // No path found
    }

    /**
     * Reconstruct path from A* search
     */
    reconstructPath(cameFrom, current) {
        const path = [current];
        while (cameFrom.has(current.id)) {
            current = cameFrom.get(current.id);
            path.unshift(current);
        }
        return path;
    }

    /**
     * Heuristic for A* (Euclidean distance)
     */
    heuristic(nodeA, nodeB) {
        const dx = nodeA.position.x - nodeB.position.x;
        const dy = nodeA.position.y - nodeB.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Distance between nodes
     */
    distance(nodeA, nodeB) {
        return this.heuristic(nodeA, nodeB);
    }

    /**
     * Get neighboring nodes
     */
    getNeighbors(node) {
        const neighbors = [];

        for (const edge of this.roadNetwork.edges) {
            if (edge.from === node.id) {
                const neighborNode = this.roadNetwork.nodes.find(n => n.id === edge.to);
                if (neighborNode) neighbors.push(neighborNode);
            }
        }

        return neighbors;
    }

    // ===== Helper Methods =====

    generateId(prefix) {
        return `${prefix}_${this.idCounter++}`;
    }

    getRoadStartPoint(road) {
        if (road.path && road.path.length > 0) {
            return road.path[0];
        }
        return { x: 0, y: 0 };
    }

    getRoadEndPoint(road) {
        if (road.path && road.path.length > 0) {
            return road.path[road.path.length - 1];
        }
        return { x: 0, y: 0 };
    }

    getRoadPoint(road, t) {
        if (!road.path || road.path.length === 0) {
            return { x: 0, y: 0 };
        }

        const index = Math.floor(t * (road.path.length - 1));
        return road.path[index];
    }

    calculateIntersectionCenter(roads) {
        let sumX = 0, sumY = 0;

        roads.forEach(road => {
            const midPoint = this.getRoadPoint(road, 0.5);
            sumX += midPoint.x;
            sumY += midPoint.y;
        });

        return {
            x: sumX / roads.length,
            y: sumY / roads.length
        };
    }

    getIntersectionEntryPoint(intersection, road) {
        // Get point on road closest to intersection center
        const center = intersection.center;
        let closestPoint = null;
        let minDist = Infinity;

        if (road.path) {
            for (const point of road.path) {
                const dx = point.x - center.x;
                const dy = point.y - center.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minDist) {
                    minDist = dist;
                    closestPoint = point;
                }
            }
        }

        return closestPoint || center;
    }

    findOrCreateNode(position) {
        // Check if node already exists at this position
        const existing = this.roadNetwork.nodes.find(n => {
            const dx = n.position.x - position.x;
            const dy = n.position.y - position.y;
            return Math.sqrt(dx * dx + dy * dy) < 1.0; // Within 1 meter
        });

        if (existing) return existing;

        // Create new node
        const node = {
            id: this.generateId('node'),
            type: 'road-point',
            position: position
        };

        this.roadNetwork.nodes.push(node);
        return node;
    }

    findNearestNode(position) {
        let nearest = null;
        let minDist = Infinity;

        for (const node of this.roadNetwork.nodes) {
            const dx = node.position.x - position.x;
            const dy = node.position.y - position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist) {
                minDist = dist;
                nearest = node;
            }
        }

        return nearest;
    }

    calculateRoadCost(road) {
        // Cost based on length and speed limit
        const length = this.calculateRoadLength(road);
        const timeToTraverse = length / road.speedLimit;
        return timeToTraverse;
    }

    calculateRoadLength(road) {
        if (!road.path || road.path.length < 2) return 0;

        let length = 0;
        for (let i = 1; i < road.path.length; i++) {
            const dx = road.path[i].x - road.path[i - 1].x;
            const dy = road.path[i].y - road.path[i - 1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }

        return length;
    }

    /**
     * Get lane at specific point
     */
    getLaneAtPoint(point) {
        for (const road of this.roads) {
            if (this.isPointOnRoad(point, road)) {
                return this.determineLane(point, road);
            }
        }
        return null;
    }

    /**
     * Check if point is on road
     */
    isPointOnRoad(point, road) {
        if (!road.path) return false;

        for (let i = 0; i < road.path.length - 1; i++) {
            const dist = this.distanceToSegment(point, road.path[i], road.path[i + 1]);
            if (dist < road.width / 2) return true;
        }

        return false;
    }

    /**
     * Distance from point to line segment
     */
    distanceToSegment(point, segStart, segEnd) {
        const dx = segEnd.x - segStart.x;
        const dy = segEnd.y - segStart.y;
        const lengthSq = dx * dx + dy * dy;

        if (lengthSq === 0) {
            const pdx = point.x - segStart.x;
            const pdy = point.y - segStart.y;
            return Math.sqrt(pdx * pdx + pdy * pdy);
        }

        let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));

        const projX = segStart.x + t * dx;
        const projY = segStart.y + t * dy;
        const pdx = point.x - projX;
        const pdy = point.y - projY;

        return Math.sqrt(pdx * pdx + pdy * pdy);
    }

    /**
     * Determine which lane point is in
     */
    determineLane(point, road) {
        // Simplified: return lane info
        return {
            road: road.id,
            direction: road.direction,
            position: 'center', // left, center, right, far-left, far-right
            number: 1
        };
    }

    /**
     * Get road segment at point
     */
    getSegmentAtPoint(point) {
        for (const road of this.roads) {
            if (this.isPointOnRoad(point, road)) {
                return road;
            }
        }
        return null;
    }

    /**
     * Get current lane (simplified)
     */
    getCurrentLane() {
        return {
            position: 'center',
            number: 1
        };
    }

    /**
     * Export map data
     */
    exportMap() {
        return {
            roads: this.roads,
            intersections: this.intersections,
            highways: this.highways,
            onramps: this.onramps,
            offramps: this.offramps,
            network: this.roadNetwork
        };
    }

    /**
     * Import map data
     */
    importMap(mapData) {
        this.roads = mapData.roads || [];
        this.intersections = mapData.intersections || [];
        this.highways = mapData.highways || [];
        this.onramps = mapData.onramps || [];
        this.offramps = mapData.offramps || [];
        this.roadNetwork = mapData.network || { nodes: [], edges: [], segments: [] };
    }
}
