import Physics from "./physics/Physics.js";
import Path from "./autonomy/Path.js";
import CubicPath from "./autonomy/path-planning/CubicPath.js";
import AutonomousController from "./autonomy/control/AutonomousController.js";
import FollowController from "./autonomy/control/FollowController.js";
import ManualController from "./autonomy/control/ManualController.js";
import ReverseController from "./autonomy/control/ReverseController.js";
import EnhancedAutonomousController from "./autonomy/control/EnhancedAutonomousController.js";
import MapObject from "./objects/MapObject.js";
import CarObject from "./objects/CarObject.js";
import StaticObstacleObject from "./objects/StaticObstacleObject.js";
import DynamicObstacleObject from "./objects/DynamicObstacleObject.js";
import TrafficLightObject from "./objects/TrafficLightObject.js";
import IntersectionObject from "./objects/IntersectionObject.js";
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
import AlertService from "./simulator/AlertService.js";

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
    this.reverseController = null; // FSD-style reverse/unstuck controller

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

    // FSD-like Speed Profiles: 'chill', 'standard', 'hurry'
    this.speedProfile = 'standard';
    this.autoparkState = { active: false, selectedSpot: null, phase: 'idle' };
    this.parkingMarkersContainer = document.getElementById('parking-markers-container');
    this.parkingMarkers = []; // Array of { element, spot }
    this.planningDirection = 1; // 1 for forward, -1 for reverse
    this.alertService = new AlertService();


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

    // Autopark UI handlers
    this.btnStartAutopark = document.getElementById('btn-start-autopark');
    this.btnStopAutopark = document.getElementById('btn-stop-autopark');
    this.autoparkControls = document.getElementById('autopark-controls');
    this.autoparkStatus = document.getElementById('autopark-status');
    this.autoparkStatusText = document.getElementById('autopark-status-text');

    if (this.btnStartAutopark) {
      this.btnStartAutopark.addEventListener('click', () => {
        if (this.autoparkState.selectedSpot) {
          this.autoparkState.active = true;
          this.updateAutoparkUI();
          this.alertService.show('Thinking...', 'info');

          // Delegate entirely to EnhancedAutonomousController
          this.carControllerMode = 'autopark';
          if (this.autonomousCarController) {
            this.autonomousCarController.reset();
            this.autonomousCarController.startParking(this.autoparkState.selectedSpot);
          }
          this.plannerReset = true;
        }
      });
    }

    if (this.btnStopAutopark) {
      this.btnStopAutopark.addEventListener('click', () => {
        this.autoparkState.active = false;
        this.updateAutoparkUI();
        this.alertService.show('Autopark Cancelled', 'error');
        this.carControllerMode = 'manual';
      });
    }

    // Keyboard shortcuts for speed profiles and lane changes
    window.addEventListener('keydown', e => {
      if ((this.carControllerMode === 'autonomous' || this.carControllerMode === 'autopark') && !this.editor.enabled) {
        // Speed profiles: 1, 2, 3
        if (e.key === '1') {
          this.speedProfile = 'chill';
          this.alertService.show('Speed Profile: Chill', 'info');
        } else if (e.key === '2') {
          this.speedProfile = 'standard';
          this.alertService.show('Speed Profile: Standard', 'info');
        } else if (e.key === '3') {
          this.speedProfile = 'hurry';
          this.alertService.show('Speed Profile: Hurry', 'info');
        }

        // Lane changes: Q (left), E (right)
        if (e.key === 'q' || e.key === 'Q') {
          this.editor._changeLanePreference(1); // Left
          this.alertService.show('Lane Change: Left', 'info');
        } else if (e.key === 'e' || e.key === 'E') {
          this.editor._changeLanePreference(-1); // Right
          this.alertService.show('Lane Change: Right', 'info');
        } else if (e.key === 'w' || e.key === 'W') {
          this.editor._changeLanePreference(0); // Center
          this.alertService.show('Lane: Center', 'info');
        }
      }
    });

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
      const trafficLightObj = new TrafficLightObject(tl);
      this.trafficLightsGroup.add(trafficLightObj);
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

    // Cancel autopark if active when switching to regular autonomous
    if (this.carControllerMode === 'autopark') {
      this.autoparkState.active = false;
      this.updateAutoparkUI();
    }

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

    // 1. Obstacle Avoidance / Unstuck Logic
    // If we are stopped (or moving very slowly) and there is an obstacle directly ahead, reverse.
    if (this.car.velocity > -0.1 && this.car.velocity < 0.1) {
      // Check for obstacles in front within 5 meters
      const carPos = this.car.pose.pos;
      const carRot = this.car.pose.rot;
      const forwardDir = new THREE.Vector2(Math.cos(carRot), Math.sin(carRot));

      let blocked = false;
      for (const obs of this.staticObstacles) {
        // Simple box check or distance check
        const obsPos = obs.pos; // Vector2
        const toObs = new THREE.Vector2().subVectors(obsPos, carPos);
        const dist = toObs.length();
        const dot = toObs.dot(forwardDir);

        // If obstacle is in front (dot > 0), close (dist < 8), and roughly in line (width check approx)
        if (dot > 0 && dist < 8.0) {
          // Check lateral offset relative to car heading
          // A simple way is |det(forward, toObs)|
          const det = forwardDir.x * toObs.y - forwardDir.y * toObs.x;
          if (Math.abs(det) < 2.0) { // Within 2m lateral
            blocked = true;
            break;
          }
        }
      }

      if (blocked) {
        direction = -1;
      }
    }

    // 2. Auto Park Logic
    // If we are in autonomous mode, check if we should reverse into a parking spot.
    if (this.carControllerMode === 'autonomous' && this.editor.parkingSpots.length > 0) {
      // Find nearest parking spot
      let nearestSpot = null;
      let minSpotDist = Infinity;

      for (const spot of this.editor.parkingSpots) {
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
        // 2. If spot is behind (-15m < dist < 0) and we are stopped (velocity approx 0):
        //    Switch to reverse (direction = -1).
        //    Planner will plan path into spot.

        // Expanded range for "past the spot" to -15m to ensure we catch it
        if (minSpotDist > -15 && minSpotDist < 1.0 && Math.abs(this.car.velocity) < 0.5) {
          // We are past the spot (or at it) and stopped. Reverse!
          direction = -1;
        }
      }
    }

    let laneCenterLatitude = this.pathPlannerConfigEditor.config.laneCenterLatitude; // Default 0
    let lanePreference = this.editor.lanePreference;

    // If we have a target parking spot and we are close (or reversing), bias the lane center
    if (this.carControllerMode === 'autonomous' && this.editor.parkingSpots.length > 0) {
      // Re-find nearest for scoping (could optimize)
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



    // Apply FSD-like speed profile multiplier
    let speedMultiplier = 1.0;
    if (this.speedProfile === 'chill') speedMultiplier = 0.85;
    else if (this.speedProfile === 'hurry') speedMultiplier = 1.15;

    this.lastPlanParams = {
      config: Object.assign({}, this.pathPlannerConfigEditor.config, {
        speedLimit: this.editor.speedLimit * speedMultiplier,
        lanePreference: lanePreference,
        roadWidth: this.editor.lanePath.width, // Pass dynamic road width
        laneCenterLatitude: laneCenterLatitude,
        laneShoulderLatitude: this.editor.lanePath.width / 2, // Ensure shoulder is wide enough
        speedProfile: this.speedProfile // Pass profile for behavior tuning
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

    this.planningDirection = direction; // Store for controller
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

    // Lattice visualization disabled for cleaner FSD look
    // const lattice = new RoadLattice(this.editor.lanePath, latticeStartStation, config);
    // lattice.lattice.forEach(cells => {
    //   cells.forEach(c => {
    //     const circle = new THREE.Mesh(circleGeom, circleMat);
    //     circle.position.set(c.pos.x, 0, c.pos.y);
    //     circle.rotation.x = -Math.PI / 2;
    //     this.plannedPathGroup.add(circle);
    //   });
    // });

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
      this.autonomousCarController = new EnhancedAutonomousController(
        followPath,
        this.car,
        this.staticObstacles.concat(this.dynamicObstacles),
        this.trafficLights,
        this.stopSigns,
        this.editor.parkingSpots || []
      );

    // Show a reasonable length of path ahead (Tesla FSD style - long lookahead)
    const maxPointsToShow = 250; // Show ~250 points ahead for FSD-style visualization
    const visiblePath = path.slice(0, Math.min(path.length, maxPointsToShow));

    const pathGeometry = new THREE.Geometry();
    pathGeometry.setFromPoints(visiblePath.map(p => new THREE.Vector3(p.pos.x, 0, p.pos.y))); // On ground
    const pathLine = new MeshLine();
    pathLine.setGeometry(pathGeometry);

    // Tesla FSD Style Colors
    const fsdBlue = new THREE.Color(0x3b82f6); // Brighter, more vibrant blue
    const fsdGrey = new THREE.Color(0x6b7280);

    // Initialize transition state if not present
    if (this.fsdTransition === undefined) {
      this.fsdTransition = 0; // 0 = Manual (Grey/Thin), 1 = Auto (Blue/Wide)
    }

    // Create a texture for the fade effect (FSD style)
    if (!this.pathTexture) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 256;
      const context = canvas.getContext('2d');

      // Gradient that fades at the far end (Tesla FSD style)
      const gradient = context.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); // Start opaque
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.9)'); // Stay opaque
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Fade at end

      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 256);

      this.pathTexture = new THREE.CanvasTexture(canvas);
      this.pathTexture.wrapS = THREE.ClampToEdgeWrapping; // NO REPEAT to avoid strip
      this.pathTexture.wrapT = THREE.ClampToEdgeWrapping;
      this.pathTexture.minFilter = THREE.LinearFilter;
      this.pathTexture.magFilter = THREE.LinearFilter;
    }

    // Properties based on current mode
    const isAuto = this.carControllerMode === 'autonomous' || this.carControllerMode === 'autopark';
    const targetWidth = isAuto ? 2.0 : 0.6; // Wider for auto (Tesla FSD style)
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
        opacity: 0.85, // Slightly transparent for FSD look
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
        autonomousControls = this.autonomousCarController.control(this.car.pose, this.car.wheelAngle, this.car.velocity, dt, this.carControllerMode == 'autonomous' || this.carControllerMode == 'autopark', this.planningDirection);
      else if (this.autonomousCarController === null)
        autonomousControls = { steer: 0, brake: 1, gas: 0 };

      // FSD-style reverse/unstuck - uses autopilot with reverse path
      if (this.carControllerMode == 'autonomous' || this.carControllerMode == 'autopark') {
        if (!this.reverseController) {
          const obstacles = this.staticObstacles.concat(this.dynamicObstacles);
          this.reverseController = new ReverseController(this.car, obstacles, this.editor.lanePath);
        }

        const reversePath = this.reverseController.update(dt, this.car.pose);

        if (reversePath && this.reverseController.isReversing) {
          // Use reverse path with Enhanced controller for smarter reversing
          if (!this.reverseFollowController) {
            this.reverseFollowController = new EnhancedAutonomousController(
              reversePath,
              this.car,
              obstacles,
              this.trafficLights,
              this.stopSigns,
              this.editor.parkingSpots || []
            );
          } else {
            this.reverseFollowController.replacePath(reversePath);
          }
          autonomousControls = this.reverseFollowController.control(this.car.pose, this.car.wheelAngle, this.car.velocity, dt, true, 1);
        } else if (this.reverseFollowController) {
          this.reverseFollowController = null;
        }
      }

      const controls = (this.carControllerMode == 'autonomous' || this.carControllerMode == 'autopark') ? autonomousControls : manualControls;

      this.car.update(controls, dt);
      this.physics.step(dt);
      this.trafficLights.forEach((tl, index) => {
        tl.update(dt);

        // Update the 3D traffic light object
        const trafficLightObj = this.trafficLightsGroup.children[index];
        if (trafficLightObj && trafficLightObj.update) {
          trafficLightObj.update();
        }

        // Update visual representation in editor if needed
        const editorTl = this.editor.trafficLightGroup.children.find(c => c.userData.index === index);
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
      const isAuto = this.carControllerMode === 'autonomous' || this.carControllerMode === 'autopark';
      const targetTransition = isAuto ? 1.0 : 0.0;
      const transitionSpeed = 3.0; // Speed of expansion/contraction

      // Smoothly interpolate transition state
      if (this.fsdTransition < targetTransition) {
        this.fsdTransition = Math.min(targetTransition, this.fsdTransition + dt * transitionSpeed);
      } else if (this.fsdTransition > targetTransition) {
        this.fsdTransition = Math.max(targetTransition, this.fsdTransition - dt * transitionSpeed);
      }

      // Interpolate Width: 0.6 (Manual) -> 2.0 (Auto) - Tesla FSD style
      const minWidth = 0.6;
      const maxWidth = 2.0;
      const currentWidth = minWidth + (maxWidth - minWidth) * this.fsdTransition;
      this.currentPathMesh.material.uniforms.lineWidth.value = currentWidth;

      // Interpolate Color: Grey -> Vibrant Blue
      const fsdBlue = new THREE.Color(0x3b82f6); // Brighter blue
      const fsdGrey = new THREE.Color(0x6b7280);
      const currentColor = fsdGrey.clone().lerp(fsdBlue, this.fsdTransition);
      this.currentPathMesh.material.uniforms.color.value = currentColor;

      // 3. Opacity based on speed (FSD style)
      // Slightly dim when stopped, otherwise keep visible
      if (this.car.velocity < 0.5) {
        this.currentPathMesh.material.uniforms.opacity.value = 0.7;
      } else {
        this.currentPathMesh.material.uniforms.opacity.value = 0.85;
      }
    }

    this.prevTimestamp = timestamp;

    // Update parking marker positions
    this._updateParkingMarkersPosition();

    requestAnimationFrame(this.step.bind(this));
  }


  // Click handler for parking spot selection
  onCanvasClick(event) {
    // Handle parking spot selection in 3D view implementation if needed later
  }

  selectParkingSpot(spot) {
    this.autoparkState.selectedSpot = spot;
    this.updateAutoparkUI();
    // Re-create markers to update selection state
    this._updateParkingMarkers();
  }

  updateAutoparkUI() {
    if (!this.autoparkControls) return;

    if (this.autoparkState.selectedSpot) {
      this.autoparkControls.classList.remove('is-hidden');
      this.autoparkControls.style.display = 'block'; // Ensure visibility

      if (this.autoparkState.active) {
        if (this.btnStartAutopark) this.btnStartAutopark.classList.add('is-hidden');
        if (this.btnStopAutopark) this.btnStopAutopark.classList.remove('is-hidden');
        if (this.autoparkStatus) this.autoparkStatus.classList.remove('is-hidden');
      } else {
        if (this.btnStartAutopark) this.btnStartAutopark.classList.remove('is-hidden');
        if (this.btnStopAutopark) this.btnStopAutopark.classList.add('is-hidden');
        if (this.autoparkStatus) this.autoparkStatus.classList.add('is-hidden');
      }
    } else {
      this.autoparkControls.classList.add('is-hidden');
      this.autoparkControls.style.display = 'none';
    }
  }

  _updateParkingMarkers() {
    if (!this.parkingMarkersContainer) return;

    // Clear existing markers
    this.parkingMarkers.forEach(m => m.element.remove());
    this.parkingMarkers = [];

    // Create markers for each parking spot
    this.parkingSpots.forEach((spot, index) => {
      const marker = document.createElement('div');
      marker.className = 'parking-marker';
      if (this.autoparkState.selectedSpot === spot) {
        marker.classList.add('selected');
      }

      marker.innerHTML = `
        <div class="parking-marker-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="20" height="20" rx="6" fill="${this.autoparkState.selectedSpot === spot ? '#10b981' : 'rgba(59, 130, 246, 0.8)'}" stroke="white" stroke-width="2"/>
            <text x="12" y="17" text-anchor="middle" fill="white" font-size="12" font-weight="bold">P</text>
          </svg>
        </div>
        <div class="parking-marker-label">Spot ${index + 1}</div>
      `;
      marker.addEventListener('click', () => {
        this.selectParkingSpot(spot);
      });

      this.parkingMarkersContainer.appendChild(marker);
      this.parkingMarkers.push({ element: marker, spot });
    });
  }

  _updateParkingMarkersPosition() {
    if (!this.parkingMarkersContainer || this.editor.enabled) return;

    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    this.parkingMarkers.forEach(({ element, spot }) => {
      const pos3D = new THREE.Vector3(spot.pos.x, 2, spot.pos.y);
      pos3D.project(this.camera);

      // Convert to screen coordinates
      const x = (pos3D.x * 0.5 + 0.5) * rect.width + rect.left;
      const y = (-pos3D.y * 0.5 + 0.5) * rect.height + rect.top;

      // Check if behind camera
      if (pos3D.z > 1) {
        element.style.display = 'none';
      } else {
        element.style.display = 'block';
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
      }
    });
  }
}
