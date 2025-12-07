import THREE from "script-loader!../vendor/three.js";
import Utils from "script-loader!../js/Utils.js";
import PathPlanner from "../js/autonomy/path-planning/PathPlanner.js";
import LanePath from "../js/autonomy/LanePath.js";
import StaticObstacle from "../js/autonomy/StaticObstacle.js";
import DynamicObstacle from "../js/autonomy/DynamicObstacle.js";
import StopSign from "../js/autonomy/StopSign.js";
import TrafficLight from "../js/autonomy/TrafficLight.js";

function init() {
  let pathPlanner;
  try {
    pathPlanner = new PathPlanner();
  } catch (e) {
    console.log('Error initializing path planner:');
    console.log(e);

    self.postMessage({ error: true });

    return;
  }

  self.onmessage = function (event) {
    const { config, vehiclePose, vehicleStation, lanePath, startTime, staticObstacles, dynamicObstacles, stopSigns, trafficLights, parkingSpots, reset, direction } = event.data;

    LanePath.hydrate(lanePath);
    staticObstacles.forEach(o => StaticObstacle.hydrate(o));
    dynamicObstacles.forEach(o => DynamicObstacle.hydrate(o));

    // Hydrate stop signs and traffic lights to restore THREE.Vector2 for pos
    if (stopSigns) stopSigns.forEach(o => StopSign.hydrate(o));
    if (trafficLights) trafficLights.forEach(o => TrafficLight.hydrate(o));

    if (reset) pathPlanner.reset();

    pathPlanner.config = config;

    try {
      const { path, fromVehicleSegment, fromVehicleParams, latticeStartStation, dynamicObstacleGrid } = pathPlanner.plan(vehiclePose, vehicleStation, lanePath, startTime, staticObstacles, dynamicObstacles, stopSigns, trafficLights, parkingSpots, direction);

      self.postMessage({ path, fromVehicleSegment, fromVehicleParams, vehiclePose, vehicleStation, latticeStartStation, config, dynamicObstacleGrid });
    } catch (error) {
      console.log('PathPlannerWorker error');
      console.log(error);
    }
  };
}

if (typeof (window) === 'undefined') {
  init();
} else {
  window.dash_initPathPlannerWorker = init;
}
