import Physics from "./physics/Physics.js";
import Path from "./autonomy/Path.js";
import CubicPath from "./autonomy/path-planning/CubicPath.js";
import AutonomousController from "./autonomy/control/AutonomousController.js";
import FollowController from "./autonomy/control/FollowController.js";
import ManualController from "./autonomy/control/ManualController.js";
import MapObject from "./objects/MapObject.js";
import CarObject from "./objects/CarObject.js";
import StaticObstacleObject from "./objects/StaticObstacleObject.js";
import DynamicObstacleObject from "./objects/DynamicObstacleObject.js";
import Editor from "./simulator/Editor.js";
import OrbitControls from "./simulator/OrbitControls.js";
import TopDownCameraControls from "./simulator/TopDownCameraControls.js";
import Dashboard from "./simulator/Dashboard.js";
import GPGPU from "./GPGPU.js";
import RoadLattice from "./autonomy/path-planning/RoadLattice.js";
import PathPlanner from "./autonomy/path-planning/PathPlanner.js";
import StaticObstacle from "./autonomy/StaticObstacle.js";
import StopSign from "./autonomy/StopSign.js";
import TrafficLight from "./autonomy/TrafficLight.js";
import DynamicObstacle from "./autonomy/DynamicObstacle.js";
import MovingAverage from "./autonomy/MovingAverage.js";
import PathPlannerConfigEditor from "./simulator/PathPlannerConfigEditor.js";

const WELCOME_MODAL_KEY = 'dash_WelcomeModal';

export default class Simulator {
  constructor(domElement) {
    this.pathPlannerWorker = new Worker(URL.createObjectURL(new Blob([`(${dash_initPathPlannerWorker.toString()})()`], { type: 'text/javascript' })));
    this.pathPlannerWorker.onmessage = this.receivePlannedPath.bind(this);
    this.pathPlannerConfigEditor = new PathPlannerConfigEditor();

    this.physics = new Physics();
    this.car = this.physics.createCar();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(domElement.clientWidth, domElement.clientHeight);
    this.renderer.shadowMap.enabled = true;
    domElement.appendChild(this.renderer.domElement);

    this.lastPlanParams = null;
    this.renderer.context.canvas.addEventListener('webglcontextlost', event => {
      console.log('Simulator: webgl context lost');
      console.log(event);
      console.log(this.lastPlanParams);
    });

    this._setUpCameras(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.sceneFog = null;//new THREE.FogExp2(0x111111, 0.0025);
    this.scene.fog = this.sceneFog;
    this.scene.background = new THREE.Color(0x111111);

    this.editor = new Editor(this.renderer.domElement, this.editorCamera, this.scene);

    const geolocation = null;//[33.523900, -111.908756];
    const map = new MapObject(geolocation);
    this.scene.add(map);

    this.carObject = new CarObject(this.car);
    this.scene.add(this.carObject);

    this.scene.add(new THREE.AmbientLight(0x666666));
    const light = new THREE.DirectionalLight(0xffffff, 0.75);
    light.position.set(1, 1, 1).normalize();
    this.scene.add(light);

    this.manualCarController = new ManualController();
    this.autonomousCarController = null;

    this.dashboard = new Dashboard(this.car);

    this.plannerReady = false;
    this.plannerRunning = false;
    this.plannerReset = false;
    this.carStation = null;
    this.plannedPathGroup = new THREE.Group();
    this.scene.add(this.plannedPathGroup);

    this.staticObstaclesGroup = new THREE.Group();
    this.scene.add(this.staticObstaclesGroup);
    this.dynamicObstaclesGroup = new THREE.Group();
    this.scene.add(this.dynamicObstaclesGroup);
    this.stopSignsGroup = new THREE.Group();
    this.scene.add(this.stopSignsGroup);
    this.trafficLightsGroup = new THREE.Group();
    this.scene.add(this.trafficLightsGroup);
    this.parkingSpotsGroup = new THREE.Group();
    this.scene.add(this.parkingSpotsGroup);

    this.stopSigns = [];
    this.trafficLights = [];
    this.parkingSpots = [];

    this.paused = false;
    this.prevTimestamp = null;
    this.frameCounter = 0;
    this.fpsTime = 0;
    this.fps = 0;
    this.simulatedTime = 0;
    this.lastPlanTime = null;
    this.averagePlanTime = new MovingAverage(20);

    window.addEventListener('resize', e => {
      this._updateCameraAspects(domElement.clientWidth / domElement.clientHeight);
      this.renderer.setSize(domElement.clientWidth, domElement.clientHeight);
    });

    window.addEventListener('hashchange', e => {
      if (window.location.hash.startsWith('#/s/'))
        window.location.reload();
    });

    this.manualModeButton = document.getElementById('mode-manual');
    this.manualModeButton.addEventListener('click', this.enableManualMode.bind(this));
    this.autonomousModeButton = document.getElementById('mode-autonomous');
    this.autonomousModeButton.addEventListener('click', this.enableAutonomousMode.bind(this));

    document.getElementById('editor-enable').addEventListener('click', this.enableEditor.bind(this));
    document.getElementById('editor-finalize').addEventListener('click', this.finalizeEditor.bind(this));
    document.getElementById('simulator-load').addEventListener('click', this.loadScenario.bind(this));

    this.scenarioPlayButton = document.getElementById('scenario-play');
    this.scenarioPlayButton.addEventListener('click', this.playScenario.bind(this));
    this.scenarioPauseButton = document.getElementById('scenario-pause');
    this.scenarioPauseButton.addEventListener('click', this.pauseScenario.bind(this));
    this.scenarioRestartButton = document.getElementById('scenario-restart');
    this.scenarioRestartButton.addEventListener('click', this.restartScenario.bind(this));

    this.welcomeModal = document.getElementById('welcome-modal');
    document.getElementById('show-welcome-modal').addEventListener('click', e => this.welcomeModal.classList.add('is-active'));

    if (window.localStorage.getItem(WELCOME_MODAL_KEY) !== 'hide') {
      this.welcomeModal.classList.add('is-active');
    }

    document.getElementById('welcome-modal-background').addEventListener('click', this.hideWelcomeModal.bind(this));
    document.getElementById('welcome-modal-close').addEventListener('click', this.hideWelcomeModal.bind(this));

    document.getElementById('welcome-modal-examples').addEventListener('click', e => {
      this.welcomeModal.classList.remove('is-active');
      this.loadScenario();
      this.editor.scenarioManager.switchTab(this.editor.scenarioManager.examplesTab);
    });

    document.getElementById('welcome-modal-create').addEventListener('click', e => {
      this.welcomeModal.classList.remove('is-active');
      this.enableEditor();
    });

    this.simModeBoxes = Array.prototype.slice.call(document.getElementsByClassName('sim-mode-box'), 0);
    this.editModeBoxes = Array.prototype.slice.call(document.getElementsByClassName('edit-mode-box'), 0);

    this.fpsBox = document.getElementById('fps');

    this.enableManualMode();
    this.changeCamera('chase');

    this.aroundAnchorIndex = null;
    this.staticObstacles = [];
    this.stopSigns = [];
    this.trafficLights = [];
    this.dynamicObstacles = [];

    this._checkHashScenario();

    requestAnimationFrame(this.step.bind(this));
  }

  toss() {
    const pose = this.car.pose;
    const rotVec = THREE.Vector2.fromAngle(pose.rot);
    const pos = rotVec.clone().multiplyScalar(50).add(new THREE.Vector2(rotVec.y, rotVec.x)).add(pose.pos);
    const obstacle = new StaticObstacle(pos, 0, 1.0, 1.0);

    const obsGeom = new THREE.PlaneGeometry(obstacle.width, obstacle.height);
    const obsMat = new THREE.MeshBasicMaterial({ color: 0x0000ff, depthTest: false, transparent: true, opacity: 0.5 });
    const obsObj = new THREE.Mesh(obsGeom, obsMat);
    obsObj.rotation.x = -Math.PI / 2;
    obsObj.rotation.z = -obstacle.rot;
    obsObj.position.set(obstacle.pos.x, 0, obstacle.pos.y);
    this.scene.add(obsObj);

    this.staticObstacles.push(obstacle);
  }

  _checkHashScenario() {
    if (!window.location.hash.startsWith('#/s/')) return;

    const [_hash, _s, code] = window.location.hash.split('/');

    try {
      const json = JSON.parse(atob(decodeURIComponent(code)));
      this.editor.loadJSON(json);
      this.finalizeEditor();
      this.welcomeModal.classList.remove('is-active');
      window.location.hash = '';
    } catch (e) {
      console.log('Error importing scenario code:');
      console.log(code);
      console.log(e);
    }
  }

  _setUpCameras(domElement) {
    this.chaseCamera = new THREE.PerspectiveCamera(55, domElement.clientWidth / domElement.clientHeight, 1, 10000);
    this.chaseCameraControls = new OrbitControls(this.chaseCamera, domElement);
    this.chaseCameraControls.minDistance = 4;
    this.chaseCameraControls.maxDistance = 5000;
    this.chaseCameraControls.maxPolarAngle = Math.PI / 2.02;
    this.chaseCameraControls.enablePan = false;
    this.chaseCameraControls.enabled = false;
    this._resetChaseCamera();

    this.freeCamera = new THREE.PerspectiveCamera(55, domElement.clientWidth / domElement.clientHeight, 1, 10000);
    this.freeCameraControls = new OrbitControls(this.freeCamera, domElement);
    this.freeCameraControls.minDistance = 5;
    this.freeCameraControls.maxDistance = 5000;
    this.freeCameraControls.maxPolarAngle = Math.PI / 2.02;
    this.freeCameraControls.enabled = true;
    this._resetFreeCamera();

    this.topDownCamera = new THREE.PerspectiveCamera(55, domElement.clientWidth / domElement.clientHeight, 1, 10000);
    this.topDownCamera.position.set(0, 50, 0);
    this.topDownCamera.lookAt(0, 0, 0);
    this.topDownControls = new TopDownCameraControls(domElement, this.topDownCamera);
    this.topDownControls.enabled = false;
    this.topDownControls.minAltitude = 5;
    this.topDownControls.maxAltitude = 10000;

    this.editorCamera = new THREE.PerspectiveCamera(45, domElement.clientWidth / domElement.clientHeight, 1, 10000);
    this.editorCamera.layers.enable(2);
    this.editorCamera.position.set(0, 200, 0);
    this.editorCamera.lookAt(0, 0, 0);
    this.editorCameraControls = new TopDownCameraControls(domElement, this.editorCamera);
    this.editorCameraControls.enabled = false;
    this.editorCameraControls.enablePanning = true;
    this.editorCameraControls.minAltitude = 10;
    this.editorCameraControls.maxAltitude = 10000;

    this.cameraButtons = {};

    ['free', 'chase', 'topDown'].forEach(c => {
      const cameraButton = document.getElementById(`camera-${c}`);
      cameraButton.addEventListener('click', () => this.changeCamera(c));
      this.cameraButtons[c] = cameraButton;
    });

    this.switchTo2DButton = document.getElementById('camera-2D');
    this.switchTo2DButton.addEventListener('click', this.switchTo2D.bind(this));
    this.switchTo3DButton = document.getElementById('camera-3D');
    this.switchTo3DButton.addEventListener('click', this.switchTo3D.bind(this));

    this.switchTo3D();
  }

  _resetFreeCamera() {
    this.freeCameraControls.position0.copy(this.chaseCamera.position);
    const carPosition = this.car.position;
    this.freeCameraControls.target0.set(carPosition.x, 0, carPosition.y);
    this.freeCameraControls.reset();
  }

  _resetChaseCamera() {
    const pos = this.car.position;
    const dirVector = THREE.Vector2.fromAngle(this.car.rotation).multiplyScalar(-20);
    this.chaseCamera.position.set(pos.x + dirVector.x, 8, pos.y + dirVector.y);
    this.chaseCamera.lookAt(pos.x, 0, pos.y);
  }

  _resetTopDownCamera() {
    const carPosition = this.car.position;
    this.topDownCamera.position.set(carPosition.x, 50, carPosition.y);
    this.topDownCamera.rotation.z = -this.car.rotation - Math.PI / 2
  }

  _updateCameraAspects(aspect) {
    this.freeCamera.aspect = aspect;
    this.freeCamera.updateProjectionMatrix();
    this.chaseCamera.aspect = aspect;
    this.chaseCamera.updateProjectionMatrix();
    this.topDownCamera.aspect = aspect;
    this.topDownCamera.updateProjectionMatrix();
    this.editorCamera.aspect = aspect;
    this.editorCamera.updateProjectionMatrix();
  }

  enableEditor() {
    this.editor.enabled = true;
    this.plannerRunning = false;

    this.previousCamera = this.camera;
    this.camera = this.editorCamera;
    this.editorCameraControls.enabled = true;
    this.chaseCameraControls.enabled = false;
    this.topDownControls.enabled = false;
    this.freeCameraControls.enabled = false;

    this.scene.fog = null;
    this.carObject.visible = false;
    if (this.plannedPathGroup) this.plannedPathGroup.visible = false;
    this.staticObstaclesGroup.visible = false;
    this.dynamicObstaclesGroup.visible = false;

    this.simModeBoxes.forEach(el => el.classList.add('is-hidden'));
    this.editModeBoxes.forEach(el => el.classList.remove('is-hidden'));
  }

  finalizeEditor(replaceCamera = true) {
    this.editor.enabled = false;
    this.editorCameraControls.enabled = false;

    this.scene.fog = this.sceneFog;
    this.carObject.visible = true;

    this.simModeBoxes.forEach(el => el.classList.remove('is-hidden'));
    this.editModeBoxes.forEach(el => el.classList.add('is-hidden'));

    if (this.editor.lanePath.anchors.length > 1) {
      const centerline = this.editor.lanePath.centerline;
      const pos = centerline[0].clone();
      const dir = centerline[1].clone().sub(centerline[0]);
      const rot = Math.atan2(dir.y, dir.x);
      const perpindicular = rot + Math.PI / 2 * (Math.sign(this.editor.lanePreference) || 0);
      const latitude = this.pathPlannerConfigEditor.config.roadWidth / 4;

      this.car.setPose(pos.x + Math.cos(perpindicular) * latitude, pos.y + Math.sin(perpindicular) * latitude, rot);
      this.car.velocity = this.editor.initialSpeed;

      this.staticObstacles = this.editor.staticObstacles;
      this.stopSigns = this.editor.stopSigns;
      this.trafficLights = this.editor.trafficLights;
      this.dynamicObstacles = this.editor.dynamicObstacles;

      // The `false` value means the controller is waiting to be created after the first planning cycle.
      // This signals the simulator to use neutral controls instead of the hard brake used for the `null` value.
      this.autonomousCarController = false;
      this.enableAutonomousMode();

      if (!this.plannerRunning) {
        this.plannerReady = true;
        this.plannerRunning = true;
      }
      this.plannerReset = true;
      this.simulatedTime = 0;
      this.carStation = 0;
      this.aroundAnchorIndex = null;

      this.pauseScenario();
      this.autonomousModeButton.classList.add('is-loading');
      this.waitingForFirstPlan = true;
    } else {
      this.dynamicObstacles = [];
    }

    this.staticObstacles = this.editor.staticObstacles;
    this.recreateStaticObstacleObjects();
    this.recreateDynamicObstacleObjects();

    this.stopSigns = this.editor.stopSigns;
    this.recreateStopSignObjects();

    this.trafficLights = this.editor.trafficLights;
    this.recreateTrafficLightObjects();

    this.parkingSpots = this.editor.parkingSpots;
    this.recreateParkingSpotObjects();



    this.dashboard.update({ steer: 0, brake: 0, gas: 0 }, this.car.velocity, null, null, 0, this.averagePlanTime.average);

    if (replaceCamera) {
      this.camera = this.previousCamera;

      if (this.previousCamera == this.chaseCamera)
        this.chaseCameraControls.enabled = true;
      else if (this.previousCamera == this.topDownCamera)
        this.topDownControls.enabled = true;
      else if (this.previousCamera == this.freeCamera)
        this.freeCameraControls.enabled = true;
      else
        this.changeCamera('chase');
    }

    this._resetFreeCamera();
    this._resetChaseCamera();
    this._resetTopDownCamera();
  }

  recreateStaticObstacleObjects() {
    this.scene.remove(this.staticObstaclesGroup);
    this.staticObstaclesGroup = new THREE.Group();
    this.scene.add(this.staticObstaclesGroup);

    this.staticObstacles.forEach(o => {
      const obstacleObject = new StaticObstacleObject(o);
      this.staticObstaclesGroup.add(obstacleObject);
    });
  }

  recreateDynamicObstacleObjects() {
    this.scene.remove(this.dynamicObstaclesGroup);
    this.dynamicObstaclesGroup = new THREE.Group();
    this.scene.add(this.dynamicObstaclesGroup);

    this.dynamicObstacles.forEach(o => {
      const obstacleObject = new DynamicObstacleObject(o, this.editor.lanePath);
      this.dynamicObstaclesGroup.add(obstacleObject);
    });

    this.updateDynamicObjects(this.simulatedTime);
  }

  recreateStopSignObjects() {
    this.scene.remove(this.stopSignsGroup);
    this.stopSignsGroup = new THREE.Group();
    this.scene.add(this.stopSignsGroup);

    this.stopSigns.forEach(s => {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.4, 8),
        new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false, transparent: true, opacity: 0.7 })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = -s.rot;
      mesh.position.set(s.pos.x, 0, s.pos.y);
      this.stopSignsGroup.add(mesh);
    });
  }

  recreateTrafficLightObjects() {
    this.scene.remove(this.trafficLightsGroup);
    this.trafficLightsGroup = new THREE.Group();
    this.scene.add(this.trafficLightsGroup);

    this.trafficLights.forEach(tl => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 3.0),
        new THREE.MeshBasicMaterial({ color: 0x555555, depthTest: false, transparent: true, opacity: 0.8 })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = -tl.rot;
      mesh.position.set(tl.pos.x, 1.5, tl.pos.y);
      // Store reference to update color later
      mesh.userData = { trafficLight: tl };
      this.trafficLightsGroup.add(mesh);
    });
  }

  recreateParkingSpotObjects() {
    this.scene.remove(this.parkingSpotsGroup);
    this.parkingSpotsGroup = new THREE.Group();
    this.scene.add(this.parkingSpotsGroup);

    this.parkingSpots.forEach(ps => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 5.0),
        new THREE.MeshBasicMaterial({ color: 0xaaaaaa, depthTest: false, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = -ps.rot;
      mesh.position.set(ps.pos.x, 0.02, ps.pos.y);
      this.parkingSpotsGroup.add(mesh);
    });
  }

  updateDynamicObjects(time) {
    this.dynamicObstaclesGroup.children.forEach(o => o.update(time));
  }

  playScenario() {
    this.paused = false;
    this.scenarioPlayButton.classList.add('is-hidden');
    this.scenarioPauseButton.classList.remove('is-hidden');
  }

  pauseScenario() {
    this.paused = true;
    this.scenarioPlayButton.classList.remove('is-hidden');
    this.scenarioPauseButton.classList.add('is-hidden');
  }

  restartScenario() {
    if (this.editor.enabled) return;

    if (this.plannedPathGroup)
      this.scene.remove(this.plannedPathGroup);

    this.finalizeEditor(false);
  }

  loadScenario() {
    if (this.editor.enabled) return;

    this.editor.scenarioManager.showModal(this.finalizeEditor.bind(this));
  }

  enableManualMode() {
    this.manualModeButton.classList.remove('is-outlined');
    this.manualModeButton.classList.add('is-selected');
    this.autonomousModeButton.classList.add('is-outlined', 'is-inverted');
    this.autonomousModeButton.classList.remove('is-selected', 'is-link');

    this.carControllerMode = 'manual';
  }

  enableAutonomousMode() {
    this.autonomousModeButton.classList.remove('is-outlined', 'is-inverted');
    this.autonomousModeButton.classList.add('is-selected', 'is-link');
    this.manualModeButton.classList.add('is-outlined');
    this.manualModeButton.classList.remove('is-selected');

    this.carControllerMode = 'autonomous';
  }

  changeCamera(mode) {
    if (this.editor.enabled) return;

    switch (mode) {
      case "free":
        this.chaseCameraControls.enabled = false;
        this.topDownControls.enabled = false;
        this.freeCameraControls.enabled = true;

        if (this.camera == this.freeCamera)
          this._resetFreeCamera();
        else
          this.camera = this.freeCamera;

        break;
      case "chase":
        this.freeCameraControls.enabled = false;
        this.topDownControls.enabled = false;
        this.chaseCameraControls.enabled = true;

        if (this.camera == this.chaseCamera)
          this._resetChaseCamera();
        else
          this.camera = this.chaseCamera;

        break;
      case "topDown":
        this.freeCameraControls.enabled = false;
        this.chaseCameraControls.enabled = false;
        this.topDownControls.enabled = true;

        if (this.camera == this.topDownCamera)
          this._resetTopDownCamera();
        else
          this.camera = this.topDownCamera;

        break;
      default:
        console.log(`Unknown camera mode: ${mode}`);
        return;
    }

    for (const c in this.cameraButtons) {
      const classes = this.cameraButtons[c].classList;
      if (c == mode) {
        classes.remove('is-outlined');
        classes.add('is-selected');
      } else {
        classes.add('is-outlined');
        classes.remove('is-selected');
      }
    }
  }

  switchTo2D() {
    this.switchTo2DButton.classList.remove('is-outlined');
    this.switchTo2DButton.classList.add('is-selected');
    this.switchTo3DButton.classList.add('is-outlined');
    this.switchTo3DButton.classList.remove('is-selected');

    this.chaseCamera.layers.enable(2);
    this.topDownCamera.layers.enable(2);
    this.freeCamera.layers.enable(2);
    this.chaseCamera.layers.disable(3);
    this.topDownCamera.layers.disable(3);
    this.freeCamera.layers.disable(3);
  }

  switchTo3D() {
    this.switchTo3DButton.classList.remove('is-outlined');
    this.switchTo3DButton.classList.add('is-selected');
    this.switchTo2DButton.classList.add('is-outlined');
    this.switchTo2DButton.classList.remove('is-selected');

    this.chaseCamera.layers.enable(3);
    this.topDownCamera.layers.enable(3);
    this.freeCamera.layers.enable(3);
    this.chaseCamera.layers.disable(2);
    this.topDownCamera.layers.disable(2);
    this.freeCamera.layers.disable(2);
  }

  hideWelcomeModal() {
    this.welcomeModal.classList.remove('is-active');
    window.localStorage.setItem(WELCOME_MODAL_KEY, 'hide');
  }

  startPlanner(pose, station) {
    this.plannerReady = false;
    this.lastPlanTime = performance.now();

    // In order to create a stable trajectory between successive planning
    // cycles, we must compensate for the latency between when a planning cycle
    // starts and when it ends. The average planning time is used to forward
    // simulate the vehicle to the pose it is expected to have when the
    // planning actually finishes.

    let predictedPose = pose;
    let predictedStation = station;
    let startTime = this.simulatedTime;

    if (!this.plannerReset && !this.paused && this.autonomousCarController && this.carControllerMode == 'autonomous') {
      const latency = this.averagePlanTime.average;
      predictedPose = this.autonomousCarController.predictPoseAfterTime(pose, latency);
      let [predictedStation] = this.editor.lanePath.stationLatitudeFromPosition(predictedPose.pos, this.aroundAnchorIndex);
      startTime += latency;
    }

    const reset = this.plannerReset;
    this.plannerReset = false;

    // Detect direction based on velocity (or previous plan if stopped?)
    // If velocity is negative (reversing), plan backwards.
    // Threshold: -0.1 m/s
    let direction = this.car.velocity < -0.1 ? -1 : 1;

    // Auto Park Logic:
    // If we are in autonomous mode, check if we should reverse into a parking spot.
    if (this.carControllerMode === 'autonomous' && this.editor.parkingSpots.length > 0) {
      // Find nearest parking spot
      let nearestSpot = null;
      let minSpotDist = Infinity;

      for (const spot of this.editor.parkingSpots) {
        // Calculate distance to spot
        // We need station of spot.
        // This is a bit expensive to do every frame if many spots, but usually few.
        const spotPos = new THREE.Vector2(spot.pos.x, spot.pos.y);
        const [s, l] = this.editor.lanePath.stationLatitudeFromPosition(spotPos);
        if (s !== null) {
          const dist = s - station; // Positive if spot is ahead, negative if behind
          if (Math.abs(dist) < Math.abs(minSpotDist)) {
            minSpotDist = dist;
            nearestSpot = spot;
          }
        }
      }

      if (nearestSpot) {
        // Logic:
        // 1. If spot is ahead (0 < dist < 20m) and we are moving forward:
        //    Keep direction = 1. Planner will stop us *past* the spot (handled in PathPlanner).
        // 2. If spot is behind (-10m < dist < 0) and we are stopped (velocity approx 0):
        //    Switch to reverse (direction = -1).
        //    Planner will plan path into spot.

        if (minSpotDist > -10 && minSpotDist < 0 && Math.abs(this.car.velocity) < 0.5) {
          // We are past the spot and stopped. Reverse!
          direction = -1;
          // Force reset if we just switched direction to ensure smooth planning
          if (this.car.velocity > -0.1) { // If we were not already reversing
            // this.plannerReset = true; // Maybe?
          }
        }
      }
    }

    let laneCenterLatitude = this.pathPlannerConfigEditor.config.laneCenterLatitude; // Default 0
    let lanePreference = this.editor.lanePreference;

    // If we have a target parking spot and we are close (or reversing), bias the lane center
    // We can reuse the nearestSpot logic from above, but we need to access it outside the block or re-calculate.
    // Let's re-calculate or scope it out.

    if (this.carControllerMode === 'autonomous' && this.editor.parkingSpots.length > 0) {
      let nearestSpot = null;
      let minSpotDist = Infinity;
      for (const spot of this.editor.parkingSpots) {
        const spotPos = new THREE.Vector2(spot.pos.x, spot.pos.y);
        const [s, l] = this.editor.lanePath.stationLatitudeFromPosition(spotPos);
        if (s !== null) {
          const dist = s - station;
          if (Math.abs(dist) < Math.abs(minSpotDist)) {
            minSpotDist = dist;
            nearestSpot = spot;
          }
        }
      }

      if (nearestSpot) {
        // If we are close enough to start maneuvering (e.g. < 30m)
        if (Math.abs(minSpotDist) < 30) {
          // Only bias lateral position if we are REVERSING into the spot
          // Or if we want to pull in forward (future logic). For now, "Reverse FSD" implies backing in.
          if (direction === -1) {
            const spotPos = new THREE.Vector2(nearestSpot.pos.x, nearestSpot.pos.y);
            const [s, l] = this.editor.lanePath.stationLatitudeFromPosition(spotPos);

            // Set target lateral position to the spot's offset
            laneCenterLatitude = Math.abs(l);

            // Set preference to the side of the spot
            lanePreference = l < 0 ? 1 : -1;
          }
        }
      }
    }

    this.lastPlanParams = {
      config: Object.assign({}, this.pathPlannerConfigEditor.config, {
        speedLimit: this.editor.speedLimit,
        lanePreference: lanePreference,
        roadWidth: this.editor.lanePath.width, // Pass dynamic road width
        laneCenterLatitude: laneCenterLatitude,
        laneShoulderLatitude: this.editor.lanePath.width / 2 // Ensure shoulder is wide enough
      }),
      vehiclePose: predictedPose,
      vehicleStation: predictedStation,
      lanePath: this.editor.lanePath,
      startTime: startTime,
      staticObstacles: this.staticObstacles,
      dynamicObstacles: this.dynamicObstacles.filter(o => o.positionAtTime(startTime).x >= 0),
      stopSigns: this.editor.stopSigns, // Pass stop signs
      trafficLights: this.trafficLights, // Pass traffic lights
      parkingSpots: this.editor.parkingSpots, // Pass parking spots
      reset: reset,
      direction: direction
    };

    this.pathPlannerWorker.postMessage(this.lastPlanParams);
  }

  receivePlannedPath(event) {
    if (event.data.error) {
      document.getElementById('planner-error').classList.remove('is-hidden');
      return;
    }

    if (this.waitingForFirstPlan && !this.plannerReset) {
      this.waitingForFirstPlan = false;
      this.autonomousModeButton.classList.remove('is-loading');
      this.playScenario();
    }

    if (this.editor.enabled) return;

    const { fromVehicleParams, vehiclePose, vehicleStation, latticeStartStation, config, dynamicObstacleGrid } = event.data;
    let { path, fromVehicleSegment } = event.data;

    this.averagePlanTime.addSample((performance.now() - this.lastPlanTime) / 1000);
    this.plannerReady = true;

    if (this.plannerReset) return;

    if (this.plannedPathGroup)
      this.scene.remove(this.plannedPathGroup);
    this.plannedPathGroup = new THREE.Group();
    this.scene.add(this.plannedPathGroup);

    const circleGeom = new THREE.CircleGeometry(0.1, 32);
    const circleMat = new THREE.MeshBasicMaterial({ color: 0x00ff80, transparent: true, opacity: 0.7 });

    const lattice = new RoadLattice(this.editor.lanePath, latticeStartStation, config);
    lattice.lattice.forEach(cells => {
      cells.forEach(c => {
        const circle = new THREE.Mesh(circleGeom, circleMat);
        circle.position.set(c.pos.x, 0, c.pos.y);
        circle.rotation.x = -Math.PI / 2;
        this.plannedPathGroup.add(circle);
      });
    });

    // TODO: clear this up or just remove it
    if (false && dynamicObstacleGrid) {
      const dynamicGridTex = new THREE.DataTexture(dynamicObstacleGrid.data, dynamicObstacleGrid.width, dynamicObstacleGrid.height, THREE.RGBAFormat, THREE.FloatType);
      dynamicGridTex.flipY = true;
      dynamicGridTex.needsUpdate = true;

      const [gridStart] = this.editor.lanePath.sampleStations(vehicleStation, 1, 0);
      if (gridStart) {
        const dynamicGridGeom = new THREE.PlaneGeometry(dynamicObstacleGrid.width * config.slGridCellSize, dynamicObstacleGrid.height * config.slGridCellSize);
        const dynamicGridMat = new THREE.MeshBasicMaterial({ map: dynamicGridTex, depthTest: false, transparent: true, opacity: 0.5 });
        const dynamicGridObj = new THREE.Mesh(dynamicGridGeom, dynamicGridMat);
        dynamicGridObj.rotation.x = -Math.PI / 2;
        dynamicGridObj.rotation.z = -gridStart.rot;
        const offset = THREE.Vector2.fromAngle(gridStart.rot).multiplyScalar(dynamicObstacleGrid.width * config.slGridCellSize / 2 - config.spatialHorizon / config.lattice.numStations);
        dynamicGridObj.position.set(gridStart.pos.x + offset.x, 0, gridStart.pos.y + offset.y);

        this.plannedPathGroup.add(dynamicGridObj);
      }
    }

    if (path === null) {
      this.autonomousCarController = null;
      return;
    }

    if (fromVehicleParams.type == 'cubic') {
      const start = this.car.pose;
      const end = fromVehicleSegment[fromVehicleSegment.length - 1];

      const pathBuilder = new CubicPath(start, end, fromVehicleParams.params);

      if (pathBuilder.optimize()) {
        fromVehicleSegment = pathBuilder.buildPath(Math.ceil(pathBuilder.params.sG / 0.25));

        const prevVelocitySq = this.car.velocity * this.car.velocity;
        const accel = (end.velocity * end.velocity - prevVelocitySq) / 2 / pathBuilder.params.sG;
        const ds = pathBuilder.params.sG / (fromVehicleSegment.length - 1);
        let s = 0;

        for (let p = 0; p < fromVehicleSegment.length; p++) {
          fromVehicleSegment[p].velocity = Math.sqrt(2 * accel * s + prevVelocitySq);
          fromVehicleSegment[p].acceleration = accel;
          s += ds;
        }
      }
    }

    path = fromVehicleSegment.concat(path);

    path.forEach(p => Object.setPrototypeOf(p.pos, THREE.Vector2.prototype));
    const followPath = new Path(path);

    if (this.autonomousCarController)
      this.autonomousCarController.replacePath(followPath);
    else
      this.autonomousCarController = new FollowController(followPath, this.car);

    const pathGeometry = new THREE.Geometry();
    pathGeometry.setFromPoints(path.map(p => new THREE.Vector3(p.pos.x, 0, p.pos.y)));
    const pathLine = new MeshLine();
    pathLine.setGeometry(pathGeometry);

    // Tesla FSD Style Colors
    const fsdBlue = new THREE.Color(0x2b80ff);
    const fsdGrey = new THREE.Color(0x555555);

    // Initialize transition state if not present
    if (this.fsdTransition === undefined) {
      this.fsdTransition = 0; // 0 = Manual (Grey/Thin), 1 = Auto (Blue/Wide)
    }

    // Create a texture for the flow effect (Subtle flow, mostly solid)
    if (!this.pathTexture) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');

      // Solid with slight fade at the very end for smoothness, but mostly opaque as requested
      const gradient = context.createLinearGradient(0, 0, 0, 64);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.8, 'rgba(255, 255, 255, 1)'); // Solid for most of the length
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Fade only at the tip

      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);

      this.pathTexture = new THREE.CanvasTexture(canvas);
      this.pathTexture.wrapS = THREE.RepeatWrapping;
      this.pathTexture.wrapT = THREE.RepeatWrapping;
      this.pathTexture.minFilter = THREE.LinearFilter;
      this.pathTexture.magFilter = THREE.LinearFilter;
    }

    // Initial properties based on current mode (will be animated in step)
    const isAuto = this.carControllerMode === 'autonomous';
    const targetWidth = isAuto ? 1.2 : 0.4; // Wide for auto, thin for manual
    const targetColor = isAuto ? fsdBlue : fsdGrey;

    const pathObject = new THREE.Mesh(
      pathLine.geometry,
      new MeshLineMaterial({
        color: targetColor,
        lineWidth: targetWidth,
        resolution: new THREE.Vector2(this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight),
        map: this.pathTexture,
        useMap: 1,
        repeat: new THREE.Vector2(1, 1),
        transparent: true,
        opacity: 1.0, // Solid opacity
        depthTest: false
      })
    );
    pathObject.renderOrder = 1;
    this.plannedPathGroup.add(pathObject);
    this.currentPathMesh = pathObject;
  }

  step(timestamp) {
    if (this.prevTimestamp == null) {
      this.prevTimestamp = timestamp;
      requestAnimationFrame(this.step.bind(this));
      return;
    }

    const dt = (timestamp - this.prevTimestamp) / 1000;

    this.editor.update();

    if (!this.editor.enabled && !this.paused) {
      this.simulatedTime += dt;

      const prevCarPosition = this.car.position;
      const prevCarRotation = this.car.rotation;

      const manualControls = this.manualCarController.control(this.car.pose, this.car.wheelAngle, this.car.velocity, dt);
      if (manualControls.steer != 0 || manualControls.brake != 0 || manualControls.gas != 0)
        this.enableManualMode();

      let autonomousControls = { steer: 0, brake: 0, gas: 0 };
      if (this.autonomousCarController)
        autonomousControls = this.autonomousCarController.control(this.car.pose, this.car.wheelAngle, this.car.velocity, dt, this.carControllerMode == 'autonomous');
      else if (this.autonomousCarController === null)
        autonomousControls = { steer: 0, brake: 1, gas: 0 };

      const controls = this.carControllerMode == 'autonomous' ? autonomousControls : manualControls;

      this.car.update(controls, dt);
      this.physics.step(dt);
      this.trafficLights.forEach(tl => {
        tl.update(dt);

        // Update Simulator visual
        const simTl = this.trafficLightsGroup.children.find(c => c.userData.trafficLight === tl);
        if (simTl) {
          let color = 0x555555;
          if (tl.state === 'red') color = 0xff0000;
          else if (tl.state === 'yellow') color = 0xffff00;
          else if (tl.state === 'green') color = 0x00ff00;
          simTl.material.color.setHex(color);
        }

        // Update visual representation in editor if needed
        const editorTl = this.editor.trafficLightGroup.children.find(c => c.userData.index === this.trafficLights.indexOf(tl));
        if (editorTl) {
          let color = 0x555555; // Off/Grey
          if (tl.state === 'red') color = 0xff0000;
          else if (tl.state === 'yellow') color = 0xffff00;
          else if (tl.state === 'green') color = 0x00ff00;
          editorTl.material.color.setHex(color);
        }
      });

      this.updateDynamicObjects(this.simulatedTime);

      const carPosition = this.car.position;
      const carRotation = this.car.rotation;
      const carRearAxle = this.car.rearAxlePosition;
      const carVelocity = this.car.velocity;

      const positionOffset = { x: carPosition.x - prevCarPosition.x, y: 0, z: carPosition.y - prevCarPosition.y };
      this.chaseCamera.position.add(positionOffset);
      this.chaseCameraControls.target.set(carPosition.x, 0, carPosition.y);
      this.chaseCameraControls.rotateLeft(carRotation - prevCarRotation);
      this.chaseCameraControls.update();

      this.topDownCamera.position.setX(carPosition.x);
      this.topDownCamera.position.setZ(carPosition.y);
      this.topDownCamera.rotation.z = -carRotation - Math.PI / 2

      let latitude = null;

      if (this.editor.lanePath.anchors.length > 1) {
        const [s, l, aroundAnchorIndex] = this.editor.lanePath.stationLatitudeFromPosition(carRearAxle, this.aroundAnchorIndex);
        this.aroundAnchorIndex = aroundAnchorIndex;

        this.carStation = s;
        latitude = l;
      }

      this.dashboard.update(controls, carVelocity, this.carStation, latitude, this.simulatedTime, this.averagePlanTime.average, this.editor.speedLimit);
    }

    if (!this.editor.enabled && this.plannerReady) {
      this.startPlanner(this.car.pose, this.carStation || 0);
      this.dashboard.updatePlanTime(this.averagePlanTime.average);
    }

    this.frameCounter++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fps = this.frameCounter / this.fpsTime;
      this.frameCounter = 0;
      this.fpsTime = 0;
      this.fpsBox.textContent = this.fps.toFixed(1);
    }

    // Update traffic light visuals in editor
    // This is a bit hacky, directly accessing editor group children
    // But we need to update colors based on state
    this.editor.trafficLightGroup.children.forEach((mesh, i) => {
      const tl = this.trafficLights[i];
      if (tl) {
        if (tl.state === 'red') mesh.material.color.setHex(0xff0000);
        else if (tl.state === 'yellow') mesh.material.color.setHex(0xffff00);
        else if (tl.state === 'green') mesh.material.color.setHex(0x00ff00);
      }
    });

    this.renderer.render(this.scene, this.camera);

    // FSD Visuals Animation & Transition Logic
    if (this.currentPathMesh && this.currentPathMesh.geometry && this.currentPathMesh.geometry.attributes.uv) {
      // 1. UV Scrolling (Flow)
      const uvs = this.currentPathMesh.geometry.attributes.uv;
      const array = uvs.array;
      const scrollSpeed = Math.max(0.1, this.car.velocity * 0.05);
      const offset = dt * scrollSpeed;
      for (let i = 1; i < array.length; i += 2) {
        array[i] -= offset;
      }
      uvs.needsUpdate = true;

      // 2. Mode Transition (Expand/Contract)
      const isAuto = this.carControllerMode === 'autonomous';
      const targetTransition = isAuto ? 1.0 : 0.0;
      const transitionSpeed = 3.0; // Speed of expansion/contraction

      // Smoothly interpolate transition state
      if (this.fsdTransition < targetTransition) {
        this.fsdTransition = Math.min(targetTransition, this.fsdTransition + dt * transitionSpeed);
      } else if (this.fsdTransition > targetTransition) {
        this.fsdTransition = Math.max(targetTransition, this.fsdTransition - dt * transitionSpeed);
      }

      // Interpolate Width: 0.4 (Manual) -> 1.2 (Auto)
      const minWidth = 0.4;
      const maxWidth = 1.2;
      const currentWidth = minWidth + (maxWidth - minWidth) * this.fsdTransition;
      this.currentPathMesh.material.uniforms.lineWidth.value = currentWidth;

      // Interpolate Color: Grey -> Blue
      const fsdBlue = new THREE.Color(0x2b80ff);
      const fsdGrey = new THREE.Color(0x555555);
      const currentColor = fsdGrey.clone().lerp(fsdBlue, this.fsdTransition);
      this.currentPathMesh.material.uniforms.color.value = currentColor;

      // 3. Slowing Down Opacity
      // Only dim if actually stopped or barely moving, otherwise keep solid
      if (this.car.velocity < 0.5) {
        this.currentPathMesh.material.uniforms.opacity.value = 0.6;
      } else {
        this.currentPathMesh.material.uniforms.opacity.value = 1.0;
      }
    }

    this.prevTimestamp = timestamp;

    requestAnimationFrame(this.step.bind(this));
  }
}
