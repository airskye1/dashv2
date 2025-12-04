import GPGPU from "../../GPGPU.js";
import Car from "../../physics/Car.js";
import CubicPath from "./CubicPath.js";
import QuinticPath from "./QuinticPath.js";
import StaticObstacle from "../StaticObstacle.js";
import xyObstacleGrid from "./gpgpu-programs/xyObstacleGrid.js";
import slObstacleGrid from "./gpgpu-programs/slObstacleGrid.js";
import slObstacleGridDilation from "./gpgpu-programs/slObstacleGridDilation.js";
import slDynamicObstacleGrid from "./gpgpu-programs/slDynamicObstacleGrid.js";
import xyslMap from "./gpgpu-programs/xyslMap.js";
import optimizeCubicPaths from "./gpgpu-programs/optimizeCubicPaths.js";
import optimizeQuinticPaths from "./gpgpu-programs/optimizeQuinticPaths.js";
import pathFromVehicleCosts from "./gpgpu-programs/pathFromVehicleCosts.js";
import graphSearch from "./gpgpu-programs/graphSearch.js";
import xyObstacleCostGrid from "./gpgpu-programs/xyObstacleCostGrid.js";

const NUM_ACCELERATION_PROFILES = 8;
const NUM_VELOCITY_RANGES = 4;
const NUM_TIME_RANGES = 2;

/* Obstacle cost map:
 *
 * 1. Rasterize triangles from polygonal obstacles into XY-space occupancy grid
 * 2. Convert occupancy grid to SL-space
 *    * Width is spatial horizon of the state lattice
 *    * Height is lane width
 *    * Resolution should be higher than XY-grid
 *    * Get XY position from centerline texture
 *    * Lookup XY in XY occupancy grid (nearest)
 * 3. Dilate SL-space grid using two passes (along station, then along latitude)
 *    * collision area: half car size + 0.3m
 *    * high cost area: 1 meter
 * 4. Convert back to XY-space using XYSL map
 */

export default class PathPlanner {
  constructor() {
    this.previousStartStation = null;
    this.previousFirstLatticePoint = -1;
    this.previousSecondLatticePoint = -1;
    this.previousFirstAcceleration = -1;
    this.previousSecondLatticePoint = -1;

    let start = performance.now();
    const programs = [
      xyObstacleGrid.setUp(),
      slObstacleGrid.setUp(),
      ...slObstacleGridDilation.setUp(),
      slDynamicObstacleGrid.setUp(),
      xyslMap.setUp(),
      ...optimizeCubicPaths.setUp(),
      optimizeQuinticPaths.setUp(),
      ...pathFromVehicleCosts.setUp(),
      graphSearch.setUp(),
    ].map(p => Object.assign({}, p, { width: 1, height: 1 }));

    this.gpgpu = new GPGPU(programs);
  }

  reset() {
    this.previousStartStation = null;
    this.previousFirstLatticePoint = -1;
    this.previousSecondLatticePoint = -1;
    this.previousFirstAcceleration = -1;
    this.previousSecondLatticePoint = -1;
  }

  plan(vehiclePose, vehicleStation, lanePath, startTime, staticObstacles, dynamicObstacles, stopSigns = [], trafficLights = [], parkingSpots = [], direction = 1) {
    const latticeStationInterval = this._latticeStationInterval();

    const numCenterlinePoints = Math.ceil((this.config.spatialHorizon + latticeStationInterval) / this.config.centerlineStationInterval) + 1;
    let centerlineRaw;

    // ... (rest of function setup) ...

    // --- STOP SIGN & TRAFFIC LIGHT LOGIC ---
    // 1. Find nearest stop sign or red/yellow traffic light ahead
    let nearestStopObj = null;
    let minStopDist = Infinity;

    // Helper to check objects
    const checkStopObjects = (objects, isTrafficLight = false, isParkingSpot = false) => {
      if (objects && objects.length > 0) {
        for (const obj of objects) {
          // For traffic lights, only stop if Red or Yellow
          if (isTrafficLight && obj.state === 'green') continue;

          // Get station of object
          let pos;
          if (obj.pos) {
            pos = new THREE.Vector2(obj.pos.x, obj.pos.y);
          } else if (obj.p) {
            pos = new THREE.Vector2(obj.p[0], obj.p[1]);
          } else {
            continue;
          }

          const [s, l] = lanePath.stationLatitudeFromPosition(pos);

          if (s !== null) {
            const dist = direction === 1 ? s - vehicleStation : vehicleStation - s;

            // For parking spots, allow checking behind (negative dist) for reversing maneuvers
            const minCheckDist = isParkingSpot ? -10 : 0;
            const horizon = isParkingSpot ? this.config.spatialHorizon * 1.5 : this.config.spatialHorizon;

            if (dist > minCheckDist && dist < horizon && Math.abs(dist) < Math.abs(minStopDist)) {
              minStopDist = dist;
              nearestStopObj = obj;
              nearestStopObj.isParkingSpot = isParkingSpot;
            }
          }
        }
      }
    };

    checkStopObjects(stopSigns, false, false);
    checkStopObjects(trafficLights, true, false);
    checkStopObjects(parkingSpots, false, true);

    // 2. If stop object is approaching, enforce stop
    if (nearestStopObj) {
      // Calculate position just past the stop line
      let pos;
      if (nearestStopObj.pos) {
        pos = new THREE.Vector2(nearestStopObj.pos.x, nearestStopObj.pos.y);
      } else {
        pos = new THREE.Vector2(nearestStopObj.p[0], nearestStopObj.p[1]);
      }
      const [s, l] = lanePath.stationLatitudeFromPosition(pos);
      const stopLineStation = s;

      // Place obstacle 3 meters after stop line (approx car length + buffer)
      // For parking spots, we want to stop exactly AT the spot, not past it.
      // But the "stop line" logic places a wall *after* the target.
      // If it's a parking spot, we might want to be more precise.
      // For now, let's treat them all as "stop lines" where we stop *before* the line.
      // So placing the wall 3m *after* the line means we stop *at* the line (front bumper).

      let obstacleStation;
      let obstacleOffset = 0; // Lateral offset from centerline

      if (nearestStopObj.isParkingSpot) {
        // Parking Spot Logic:
        if (direction === 1) {
          // Forward: Pull past the spot.
          // Stop 5m past the spot center.
          // Wall at Centerline (L=0) so we stop on road.
          obstacleStation = stopLineStation + 5.0;
        } else {
          // Reverse: Back into the spot.
          // Stop at spot center.
          // Wall at Spot Lateral Position.
          obstacleStation = stopLineStation;

          // Calculate lateral offset
          // stopLineStation is S. We need L.
          // We can re-calculate L from nearestStopObj.pos
          let spotPos;
          if (nearestStopObj.pos) {
            spotPos = new THREE.Vector2(nearestStopObj.pos.x, nearestStopObj.pos.y);
          } else {
            spotPos = new THREE.Vector2(nearestStopObj.p[0], nearestStopObj.p[1]);
          }
          const [s, l] = lanePath.stationLatitudeFromPosition(spotPos);
          obstacleOffset = l;
        }
      } else {
        // Normal Stop Line (Stop Sign / Traffic Light)
        // Place obstacle 3 meters after stop line
        obstacleStation = stopLineStation + (direction * 3.0);
      }

      // Get XY of this station
      const sample = lanePath.sampleStations(obstacleStation, 1, 0.1)[0];
      if (sample) {
        // Add a virtual static obstacle
        // Apply lateral offset
        const normal = new THREE.Vector2(-Math.sin(sample.rot), Math.cos(sample.rot));
        const pos = sample.pos.clone().add(normal.multiplyScalar(obstacleOffset));

        const virtualObstacle = {
          pos: pos,
          rot: sample.rot,
          width: 1.0, // Thin wall
          height: 4.0 // Road width approx
        };

        staticObstacles = [...staticObstacles, new StaticObstacle(virtualObstacle.pos, virtualObstacle.rot, virtualObstacle.width, virtualObstacle.height)];
      }
    }
    // -----------------------

    if (direction === -1) {
      // Reverse: Sample backwards from vehicleStation
      // sampleStations only goes forward, so we calculate the start point further back and reverse the result
      const startStation = vehicleStation - (numCenterlinePoints - 1) * this.config.centerlineStationInterval;
      centerlineRaw = lanePath.sampleStations(startStation, numCenterlinePoints, this.config.centerlineStationInterval).reverse();
    } else {
      // Forward: Sample normally
      centerlineRaw = lanePath.sampleStations(vehicleStation, numCenterlinePoints, this.config.centerlineStationInterval);
    }

    // Transform all centerline points into vehicle frame
    let effectiveVehicleRot = vehiclePose.rot;
    if (direction === -1) effectiveVehicleRot += Math.PI;

    const vehicleXform = vehicleTransform({ ...vehiclePose, rot: effectiveVehicleRot });
    const centerline = centerlineRaw.map(c => {
      let rot = c.rot;
      if (direction === -1) rot += Math.PI;
      return { pos: c.pos.clone().applyMatrix3(vehicleXform), rot: rot - effectiveVehicleRot, curv: c.curv }
    });

    const centerlineData = new Float32Array(centerline.length * 3);
    const maxPoint = new THREE.Vector2(0, 0);
    const minPoint = new THREE.Vector2(0, 0);

    for (let i = 0; i < centerline.length; i++) {
      const sample = centerline[i];
      const pos = sample.pos;
      centerlineData[i * 3 + 0] = pos.x;
      centerlineData[i * 3 + 1] = pos.y;
      centerlineData[i * 3 + 2] = sample.rot;

      maxPoint.max(pos);
      minPoint.min(pos);
    }

    const diff = maxPoint.clone().sub(minPoint);
    const xyCenterPoint = minPoint.clone().add(maxPoint).divideScalar(2);

    // Sizes of the xy grids (in pixels, not meters)
    const xyWidth = Math.ceil((diff.x + this.config.gridMargin * 2) / this.config.xyGridCellSize);
    const xyHeight = Math.ceil((diff.y + this.config.gridMargin * 2) / this.config.xyGridCellSize);

    const stationWidth = this.config.spatialHorizon + latticeStationInterval * 2;
    const slCenterPoint = new THREE.Vector2(this.config.spatialHorizon / 2, 0);

    // Sizes of the sl grids (in pixels, not meters)
    const slWidth = Math.ceil(stationWidth / this.config.slGridCellSize);
    const slHeight = Math.ceil((this.config.roadWidth + this.config.gridMargin * 2) / this.config.slGridCellSize);

    let startStation;

    if (direction === -1) {
      // For reverse, we don't use previousStartStation optimization as easily,
      // or we need to adapt it. For now, just reset it to ensure correctness.
      // Or calculate it:
      startStation = vehicleStation; // Lattice starts at vehicle and goes backwards?
      // Actually, _buildLattice needs to generate points [S, S-d, S-2d...]
      // If we pass the centerline array to _buildLattice, we don't need startStation logic there.
      // But _buildLattice currently calls sampleStations.
      // We should refactor _buildLattice to take the samples.

      // Optimization: Just pass the samples we already generated?
      // centerlineRaw has high resolution (centerlineStationInterval).
      // Lattice needs lower resolution (latticeStationInterval).

      // Let's just regenerate for lattice to be safe and simple.
      // Lattice start station:
      startStation = vehicleStation;
    } else {
      if (this.previousStartStation === null || vehicleStation + latticeStationInterval / 2 > this.previousStartStation) {
        startStation = (this.previousStartStation === null ? vehicleStation : this.previousStartStation) + latticeStationInterval;
        this.previousStartStation = startStation;
        this.previousFirstLatticePoint -= this.config.lattice.numLatitudes;
        this.previousSecondLatticePoint -= this.config.lattice.numLatitudes;
      } else {
        startStation = this.previousStartStation;
      }
    }

    const lattice = this._buildLattice(lanePath, startStation, vehiclePose.rot, vehicleXform, direction);

    const temporalHorizon = this.config.spatialHorizon / this.config.speedLimit;
    const dynamicFrameTime = temporalHorizon / this.config.numDynamicFrames;

    // --- STOP SIGN LOGIC REMOVED (Unified above) ---


    for (const [i, p] of [
      xyObstacleGrid.update(this.config, xyWidth, xyHeight, xyCenterPoint, vehicleXform, staticObstacles),
      slObstacleGrid.update(this.config, slWidth, slHeight, slCenterPoint, xyCenterPoint),
      ...slObstacleGridDilation.update(this.config, slWidth, slHeight),
      slDynamicObstacleGrid.update(this.config, slWidth, slHeight, slCenterPoint, vehicleStation, startTime, dynamicFrameTime, dynamicObstacles),
      xyslMap.update(this.config, xyWidth, xyHeight, xyCenterPoint),
      ...optimizeCubicPaths.update(this.config, vehiclePose),
      optimizeQuinticPaths.update(this.config, vehiclePose),
      ...pathFromVehicleCosts.update(this.config, vehiclePose, xyCenterPoint, slCenterPoint, this.previousFirstLatticePoint, this.previousSecondLatticePoint, dynamicFrameTime),
      graphSearch.update(this.config, vehiclePose, xyCenterPoint, slCenterPoint, this.previousFirstLatticePoint, this.previousSecondLatticePoint, dynamicFrameTime)
    ].entries()) {
      this.gpgpu.updateProgram(i, p);
    }

    this.gpgpu.updateSharedTextures({
      centerline: {
        width: centerline.length,
        height: 1,
        channels: 3,
        filter: 'linear',
        data: centerlineData
      },
      costTable: {
        width: NUM_ACCELERATION_PROFILES * NUM_VELOCITY_RANGES * NUM_TIME_RANGES,
        height: this.config.lattice.numLatitudes,
        depth: this.config.lattice.numStations,
        channels: 4,
        textureType: '2DArray'
      },
      lattice: {
        width: this.config.lattice.numLatitudes,
        height: this.config.lattice.numStations,
        channels: 4,
        data: lattice
      }
    });

    this.gpgpu._graphSearchCostTable = null;
    this.gpgpu._dynamicObstacleGrid = null;

    let start = performance.now();
    const outputs = this.gpgpu.run();
    const costTable = this.gpgpu._graphSearchCostTable;
    const cubicPathParams = outputs[6];
    const cubicPathFromVehicleParams = outputs[7];
    const quinticPathFromVehicleParams = outputs[8];

    let bestEntry = [Number.POSITIVE_INFINITY];
    let bestEntryIndex;
    const numEntries = costTable.length / 4;

    for (let i = 0; i < numEntries; i++) {
      const entryUnpacked = this._unpackCostTableIndex(i);
      const entry = [
        costTable[i * 4],
        costTable[i * 4 + 1],
        costTable[i * 4 + 2],
        costTable[i * 4 + 3]
      ];

      if (entry[0] < 0) continue;

      entry[0] += this._terminalCost(entryUnpacked, entry);

      if (entry[0] < bestEntry[0]) {
        bestEntryIndex = i;
        bestEntry = entry;
      }
    }

    const inverseVehicleXform = (new THREE.Matrix3()).getInverse(vehicleXform);
    let bestTrajectory = null;
    let fromVehicleSegment = null;
    let fromVehicleParams = null;
    let firstLatticePoint = -1;
    let firstAcceleration = -1;
    let secondLatticePoint = -1;
    let secondAcceleration = -1;

    if (isFinite(bestEntry[0])) {
      [bestTrajectory, fromVehicleSegment, fromVehicleParams, firstLatticePoint, firstAcceleration, secondLatticePoint, secondAcceleration] = this._reconstructTrajectory(
        bestEntryIndex,
        costTable,
        cubicPathParams,
        cubicPathFromVehicleParams,
        quinticPathFromVehicleParams,
        vehiclePose,
        lattice
      );

      fromVehicleSegment.forEach(p => {
        p.pos = p.pos.applyMatrix3(inverseVehicleXform);
        p.rot += effectiveVehicleRot;
      });

      bestTrajectory.forEach(p => {
        p.pos = p.pos.applyMatrix3(inverseVehicleXform);
        p.rot += effectiveVehicleRot;
      });
    }

    this.previousFirstLatticePoint = firstLatticePoint;
    this.previousFirstAcceleration = firstAcceleration;
    this.previousSecondLatticePoint = secondLatticePoint;
    this.previousSecondAcceleration = secondAcceleration;

    return {
      path: bestTrajectory,
      fromVehicleSegment: fromVehicleSegment,
      fromVehicleParams: fromVehicleParams,
      latticeStartStation: this.previousStartStation,
      dynamicObstacleGrid: { data: this.gpgpu._dynamicObstacleGrid, width: slWidth, height: slHeight }
    };
  }

  _buildLattice(lanePath, startStation, vehicleRot, vehicleXform, direction = 1) {
    let centerline;
    if (direction === -1) {
      // Reverse: Sample backwards from startStation
      const numStations = this.config.lattice.numStations;
      const interval = this._latticeStationInterval();
      const actualStart = startStation - (numStations - 1) * interval;
      centerline = lanePath.sampleStations(actualStart, numStations, interval).reverse();
    } else {
      centerline = lanePath.sampleStations(startStation, this.config.lattice.numStations, this._latticeStationInterval());
    }

    const offset = Math.floor(this.config.lattice.numLatitudes / 2);
    const lattice = new Float32Array(this.config.lattice.numStations * this.config.lattice.numLatitudes * 4);
    let index = 0;

    for (let s = 0; s < centerline.length; s++) {
      const sample = centerline[s];

      for (let l = 0; l < this.config.lattice.numLatitudes; l++) {
        const latitude = (l - offset) / offset * this.config.roadWidth / 2;
        const rot = sample.rot - vehicleRot;
        const pos = THREE.Vector2.fromAngle(rot + Math.PI / 2).multiplyScalar(latitude).add(sample.pos.clone().applyMatrix3(vehicleXform));
        const curv = sample.curv == 0 ? 0 : 1 / (1 / sample.curv - latitude);

        lattice[index++] = pos.x;
        lattice[index++] = pos.y;
        lattice[index++] = rot;
        lattice[index++] = curv;
      }
    }

    return lattice;
  }

  _latticeStationInterval() {
    return this.config.spatialHorizon / this.config.lattice.numStations;
  }

  _terminalCost([stationIndex, latitudeIndex, timeIndex, velocityIndex, accelerationIndex], [cost, finalVelocity, finalTime, incomingIndex]) {
    // Only consider vertices that reach the end of the spatial or temporal horizon
    if (stationIndex != this.config.lattice.numStations - 1 && finalVelocity > 0.05)
      return Number.POSITIVE_INFINITY;

    const station = (this.config.spatialHorizon / this.config.lattice.numStations) * (stationIndex + 1);

    return station * -this.config.stationReachDiscount + finalTime * this.config.extraTimePenalty;
  }

  _unpackCostTableIndex(index) {
    if (index < 0) return [-1, index + 2, null, null, null];

    const numPerTime = NUM_ACCELERATION_PROFILES * NUM_VELOCITY_RANGES;
    const numPerLatitude = numPerTime * NUM_TIME_RANGES;
    const numPerStation = this.config.lattice.numLatitudes * numPerLatitude;

    const stationIndex = Math.floor(index / numPerStation);
    index -= stationIndex * numPerStation;

    const latitudeIndex = Math.floor(index / numPerLatitude);
    index -= latitudeIndex * numPerLatitude;

    const timeIndex = Math.floor(index / numPerTime);
    index -= timeIndex * numPerTime;

    const velocityIndex = Math.floor(index / NUM_ACCELERATION_PROFILES);
    const accelerationIndex = index % NUM_ACCELERATION_PROFILES;

    return [stationIndex, latitudeIndex, timeIndex, velocityIndex, accelerationIndex];
  }

  _reconstructTrajectory(index, costTable, cubicPathParams, cubicPathFromVehicleParams, quinticPathFromVehicleParams, vehiclePose, lattice) {
    let unpacked = this._unpackCostTableIndex(index);
    unpacked.push(costTable[index * 4 + 1]);
    const nodes = [unpacked];

    let count = 0;
    while (unpacked[0] >= 0 && count++ < 100) {
      index = costTable[index * 4 + 3];
      unpacked = this._unpackCostTableIndex(index);

      const finalVelocity = unpacked[0] >= 0 ? costTable[index * 4 + 1] : vehiclePose.velocity;
      unpacked.push(finalVelocity);

      nodes.unshift(unpacked);
    }
    if (count >= 100) throw new Error('Infinite loop encountered while reconstructing trajectory.');

    const points = [];
    let fromVehicleSegment = [];
    let fromVehicleParams = null;

    for (let i = 0; i < nodes.length - 1; i++) {
      const [prevStation, prevLatitude, _pt, _pv, _pa, prevVelocity] = nodes[i];
      const [station, latitude, _t, _v, _a, velocity] = nodes[i + 1];

      let length;
      let pathBuilder;

      if (prevStation < 0) {
        const start = {
          pos: new THREE.Vector2(0, 0),
          rot: 0,
          curv: vehiclePose.curv
        };

        const endIndex = (station * this.config.lattice.numLatitudes + latitude) * 4;
        const end = {
          pos: new THREE.Vector2(lattice[endIndex], lattice[endIndex + 1]),
          rot: lattice[endIndex + 2],
          curv: lattice[endIndex + 3]
        };

        if (prevLatitude == 0) { // Cubic path from vehicle to lattice node
          length = cubicPathFromVehicleParams[endIndex + 2];

          const params = {
            p1: cubicPathFromVehicleParams[endIndex],
            p2: cubicPathFromVehicleParams[endIndex + 1],
            sG: length
          };

          pathBuilder = new CubicPath(start, end, params);

          fromVehicleParams = { type: 'cubic', params: params };
        } else { // Quintic path from vehicle to lattice node
          length = quinticPathFromVehicleParams[endIndex + 2];

          const params = {
            p3: quinticPathFromVehicleParams[endIndex],
            p4: quinticPathFromVehicleParams[endIndex + 1],
            sG: length
          };

          pathBuilder = new QuinticPath(start, end, params);

          fromVehicleParams = { type: 'quintic', params: params };
        }
      } else {
        const startIndex = (prevStation * this.config.lattice.numLatitudes + prevLatitude) * 4;
        const endIndex = (station * this.config.lattice.numLatitudes + latitude) * 4;

        const start = {
          pos: new THREE.Vector2(lattice[startIndex], lattice[startIndex + 1]),
          rot: lattice[startIndex + 2],
          curv: lattice[startIndex + 3]
        };

        const end = {
          pos: new THREE.Vector2(lattice[endIndex], lattice[endIndex + 1]),
          rot: lattice[endIndex + 2],
          curv: lattice[endIndex + 3]
        };

        const slIndex = station * this.config.lattice.numLatitudes + latitude;
        const connectivityIndex = (prevStation - station + this.config.lattice.stationConnectivity) * this.config.lattice.latitudeConnectivity + prevLatitude - latitude + Math.floor(this.config.lattice.latitudeConnectivity / 2);
        const cubicPathIndex = (connectivityIndex * this.config.lattice.numStations * this.config.lattice.numLatitudes + slIndex) * 4;

        length = cubicPathParams[cubicPathIndex + 2];

        pathBuilder = new CubicPath(start, end, {
          p1: cubicPathParams[cubicPathIndex],
          p2: cubicPathParams[cubicPathIndex + 1],
          sG: length
        });
      }

      const path = pathBuilder.buildPath(Math.ceil(length / 0.25));

      const prevVelocitySq = prevVelocity * prevVelocity;
      const accel = (velocity * velocity - prevVelocitySq) / 2 / length;
      const ds = length / (path.length - 1);
      let s = 0;

      for (let p = 0; p < path.length; p++) {
        path[p].velocity = Math.sqrt(2 * accel * s + prevVelocitySq);
        path[p].acceleration = accel;
        s += ds;
      }

      if (prevStation < 0) {
        fromVehicleSegment = path;
      } else {
        if (i > 0) path.shift();
        points.push(...path);
      }
    }

    let firstLatticePoint = null
    let firstAcceleration = null;
    let secondLatticePoint = null;
    let secondAcceleration = null;

    if (nodes.length >= 2) {
      firstLatticePoint = nodes[1][0] * this.config.lattice.numLatitudes + nodes[1][1];
      firstAcceleration = nodes[1][4];
    }

    if (nodes.length >= 3) {
      secondLatticePoint = nodes[2][0] * this.config.lattice.numLatitudes + nodes[2][1];
      secondAcceleration = nodes[2][4];
    }

    return [points, fromVehicleSegment, fromVehicleParams, firstLatticePoint, firstAcceleration, secondLatticePoint, secondAcceleration];
  }
}

function vehicleTransform({ pos, rot }) {
  const translate = new THREE.Matrix3();
  translate.set(
    1, 0, -pos.x,
    0, 1, -pos.y,
    0, 0, 1
  );

  const cosRot = Math.cos(rot);
  const sinRot = Math.sin(rot);

  const rotate = new THREE.Matrix3();
  rotate.set(
    cosRot, sinRot, 0,
    -sinRot, cosRot, 0,
    0, 0, 1
  );

  return rotate.multiply(translate);
}

function obstacleTransform(vehicleXform, xyCenterPoint, width, height) {
  const translate = new THREE.Matrix3();
  translate.set(
    1, 0, -xyCenterPoint.x,
    0, 1, -xyCenterPoint.y,
    0, 0, 1
  );

  const scale = new THREE.Matrix3();
  scale.set(
    2 / width, 0, 0,
    0, 2 / height, 0,
    0, 0, 1
  );

  return scale.multiply(translate).multiply(vehicleXform);
}
