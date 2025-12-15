import Car from "../physics/Car.js";

const LOCAL_STORAGE_KEY = 'dash_PathPlannerConfig';

const internalConfig = {
  lattice: {
    numStations: 8,
    numLatitudes: 17,
    stationConnectivity: 3,
    latitudeConnectivity: 7
  },

  roadWidth: 3.7 * 2, // meters

  numDynamicFrames: 20,
  numDynamicSubframes: 4,

  dCurvatureMax: Car.MAX_STEER_SPEED / Car.WHEEL_BASE,
  rearAxleToCenter: -Car.REAR_AXLE_POS
};

const defaultConfig = {
  spatialHorizon: 120, // meters
  centerlineStationInterval: 0.5, // meters

  xyGridCellSize: 0.3, // meters
  slGridCellSize: 0.15, // meters
  gridMargin: 20, // meters
  pathSamplingStep: 1, // meters

  cubicPathPenalty: 0,

  collisionDilationS: Car.HALF_CAR_LENGTH + 2, // meters
  hazardDilationS: 8, // meters
  collisionDilationL: Car.HALF_CAR_WIDTH + 0.5, //meters
  hazardDilationL: 0.5, // meters

  dynamicHazardDilationS: 16,
  dynamicHazardDilationL: 0.5,

  obstacleHazardCost: 200,

  laneCenterLatitude: internalConfig.roadWidth / 4,
  laneShoulderLatitude: internalConfig.roadWidth / 2 * 1.1 - Car.HALF_CAR_WIDTH,
  laneCostSlope: 20, // cost / meter
  lanePreferenceDiscount: 55,

  stationReachDiscount: 400,
  extraTimePenalty: 1000,

  hysteresisDiscount: 50,

  speedLimitPenalty: 200,

  hardAccelerationPenalty: 70,
  hardDecelerationPenalty: 50,

  softLateralAccelerationLimit: 4, // m/s^2
  softLateralAccelerationPenalty: 100,
  linearLateralAccelerationPenalty: 10,

  accelerationChangePenalty: 10
};

export default class PathPlannerConfigEditor {
  constructor() {
    this._config = Object.assign({}, defaultConfig);

    // Load config from localStorage
    let storedConfig = {};
    try {
      storedConfig = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY)) || {};
    } catch (e) { }

    for (const key of Object.keys(this._config)) {
      if (storedConfig[key] !== undefined) {
        this._config[key] = storedConfig[key];
      }
    }
  }

  get config() {
    return Object.assign({}, this._config, internalConfig);
  }

  // Method to update config (called from SettingsPanel)
  updateConfig(newConfig) {
    Object.assign(this._config, newConfig);
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this._config));
    } catch (e) { }
  }
}

PathPlannerConfigEditor.internalConfig = internalConfig;
