import LanePath from "../autonomy/LanePath.js";
import StaticObstacle from "../autonomy/StaticObstacle.js";
import StopSign from "../autonomy/StopSign.js";
import TrafficLight from "../autonomy/TrafficLight.js";
import ParkingSpot from "../autonomy/ParkingSpot.js";
import DynamicObstacleEditor from "./DynamicObstacleEditor.js";
import ScenarioManager from "./ScenarioManager.js";
import ShareManager from "./ShareManager.js";
import IntersectionObject from "../objects/IntersectionObject.js";
import { formatDate } from "../Helpers.js";

const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0));

const NORMAL_OPACITY = 0.7;
const HOVER_OPACITY = 1;
const NORMAL_POINT_COLOR = 0x0088ff;
const HOVER_POINT_COLOR = 0x33ccff;
const NORMAL_STATIC_OBSTACLE_COLOR = 0xdd0000;
const HOVER_STATIC_OBSTACLE_COLOR = 0xdd3333;
const NORMAL_STOP_SIGN_COLOR = 0xff0000; // Red for stop signs
const HOVER_STOP_SIGN_COLOR = 0xff4444;
const NORMAL_TRAFFIC_LIGHT_COLOR = 0xffff00; // Yellow placeholder for editor
const HOVER_TRAFFIC_LIGHT_COLOR = 0xffff88;
const NORMAL_PARKING_SPOT_COLOR = 0xaaaaaa;
const HOVER_PARKING_SPOT_COLOR = 0xcccccc;
const NORMAL_DYNAMIC_OBSTACLE_COLOR = 0xff8800;
const HOVER_DYNAMIC_OBSTACLE_COLOR = 0xffcc33;

const INITIAL_SPEED_FALLBACK = 10;
const SPEED_LIMIT_FALLBACK = 15;
const LANE_PREFERENCE_FALLBACK = 0;
const ROAD_WIDTH_FALLBACK = 7.4; +1;

export default class Editor {
  constructor(canvas, camera, scene) {
    this.canvas = canvas;
    this.camera = camera;

    this.isEnabled = false;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragOffset = new THREE.Vector3();
    this.draggingPoint = null;
    this.pointIndex = 0;
    this.obstacleIndex = 0;
    this.stopSignIndex = 0;
    this.trafficLightIndex = 0;
    this.parkingSpotIndex = 0;
    this.intersectionIndex = 0;
    this.previousSavedName = null;
    this.scenarioManager = new ScenarioManager(this);
    this.shareManager = new ShareManager();

    this.centerlineGeometry = new THREE.Geometry();
    this.leftBoundaryGeometry = new THREE.Geometry();
    this.rightBoundaryGeometry = new THREE.Geometry();
    this.draggingObstaclePreview = null;

    this.group = new THREE.Group();
    this.group.renderOrder = 1;
    this.pointGroup = new THREE.Group();
    this.pointGroup.renderOrder = 2;
    this.obstacleGroup = new THREE.Group();
    this.obstacleGroup.renderOrder = 1;
    this.stopSignGroup = new THREE.Group(); // Group for stop signs
    this.stopSignGroup.renderOrder = 2;
    this.trafficLightGroup = new THREE.Group();
    this.trafficLightGroup.renderOrder = 2;
    this.parkingSpotGroup = new THREE.Group();
    this.parkingSpotGroup.renderOrder = 0; // On ground
    this.intersectionGroup = new THREE.Group();
    this.intersectionGroup.renderOrder = 0; // On ground
    this.group.add(this.obstacleGroup);
    this.group.add(this.stopSignGroup);
    this.group.add(this.trafficLightGroup);
    this.group.add(this.parkingSpotGroup);
    this.group.add(this.intersectionGroup);
    this.group.add(this.pointGroup);
    scene.add(this.group);

    this.lanePath = new LanePath();
    this.dynamicObstacleEditor = new DynamicObstacleEditor();

    this.editorPathButton = document.getElementById('editor-path');
    this.editorPathButton.addEventListener('click', e => this.changeEditMode('path'));
    this.editorObstaclesButton = document.getElementById('editor-obstacles');
    this.editorObstaclesButton.addEventListener('click', e => this.changeEditMode('staticObstacles'));
    this.editorDynamicObstaclesButton = document.getElementById('editor-dynamic-obstacles');
    this.editorDynamicObstaclesButton.addEventListener('click', e => this.changeEditMode('dynamicObstacles'));

    // Add Stop Sign Button Listener (Assuming HTML will be updated or using existing button for now?)
    // For now, let's assume we might need to add a button dynamically or hook into an existing one if available.
    // Or better, let's add a new mode 'stopSigns' triggered by a new button.
    // I'll need to ask the user to add the button to HTML or I can try to inject it.
    // Wait, I can just add the button to the HTML file.
    // For now, let's hook it up assuming the ID exists, and I'll update index.html next.
    this.editorStopSignsButton = document.getElementById('editor-stop-signs');
    if (this.editorStopSignsButton) {
      this.editorStopSignsButton.addEventListener('click', e => this.changeEditMode('stopSigns'));
    }

    this.editorTrafficLightsButton = document.getElementById('editor-traffic-lights');
    if (this.editorTrafficLightsButton) {
      this.editorTrafficLightsButton.addEventListener('click', e => this.changeEditMode('trafficLights'));
    }

    this.editorParkingSpotsButton = document.getElementById('editor-parking-spots');
    if (this.editorParkingSpotsButton) {
      this.editorParkingSpotsButton.addEventListener('click', e => this.changeEditMode('parkingSpots'));
    }

    this.editorIntersectionsButton = document.getElementById('editor-intersections');
    if (this.editorIntersectionsButton) {
      this.editorIntersectionsButton.addEventListener('click', e => this.changeEditMode('intersections'));
    }

    this.editorRoadBox = document.getElementById('editor-road-box');
    this.editorRoadWidthDom = document.getElementById('editor-road-width');
    this.initialSpeedDom = document.getElementById('editor-initial-speed');
    this.speedLimitDom = document.getElementById('editor-speed-limit');
    this.laneLeftDom = document.getElementById('editor-lane-left');
    this.laneRightDom = document.getElementById('editor-lane-right');

    if (this.editorRoadWidthDom) {
      this.editorRoadWidthDom.addEventListener('change', () => {
        this.lanePath.width = parseFloat(this.editorRoadWidthDom.value);
        this.lanePath.resampleAll();
        this.rebuildPathGeometry();
      });
    }

    this.laneLeftDom.addEventListener('click', e => this._changeLanePreference(-1));
    this.laneRightDom.addEventListener('click', e => this._changeLanePreference(+1));

    // Road type toggle
    this.roadRegularDom = document.getElementById('editor-road-regular');
    this.roadHighwayDom = document.getElementById('editor-road-highway');

    this.roadRegularDom.addEventListener('click', () => this._changeRoadType('regular'));
    this.roadHighwayDom.addEventListener('click', () => this._changeRoadType('highway'));

    this.initialSpeedDom.value = INITIAL_SPEED_FALLBACK;
    this.speedLimitDom.value = SPEED_LIMIT_FALLBACK;
    this._changeLanePreference(LANE_PREFERENCE_FALLBACK);
    this.lanePath.width = ROAD_WIDTH_FALLBACK;
    if (this.editorRoadWidthDom) this.editorRoadWidthDom.value = ROAD_WIDTH_FALLBACK;



    this.statsRoadLength = document.getElementById('editor-stats-road-length');
    this.statsStaticObstacles = document.getElementById('editor-stats-static-obstacles');
    this.statsStation = document.getElementById('editor-stats-station');
    this.statsLatitude = document.getElementById('editor-stats-latitude');
    this.scenarioNameDom = document.getElementById('editor-scenario-name');
    this.scenarioSavedAtDom = document.getElementById('editor-scenario-saved-at');

    this.helpPath = document.getElementById('editor-help-path');
    this.helpStaticObstacles = document.getElementById('editor-help-static-obstacles');
    this.helpDynamicObstacles = document.getElementById('editor-help-dynamic-obstacles');

    this.changeEditMode('path');
    this.removeMode = false;

    canvas.addEventListener('mousedown', this.mouseDown.bind(this));
    canvas.addEventListener('mousemove', this.mouseMove.bind(this));
    canvas.addEventListener('mouseup', this.mouseUp.bind(this));
    canvas.addEventListener('contextmenu', e => this.isEnabled && e.preventDefault());

    const editorClearOptions = document.getElementById('editor-clear-options');
    document.getElementById('editor-clear').addEventListener('click', event => {
      event.stopPropagation();
      editorClearOptions.classList.toggle('is-hidden');
    });
    document.addEventListener('click', () => editorClearOptions.classList.add('is-hidden'));

    document.getElementById('editor-clear-obstacles').addEventListener('click', this.clearStaticObstacles.bind(this));
    document.getElementById('editor-clear-dynamic-obstacles').addEventListener('click', this.dynamicObstacleEditor.clearDynamicObstacles.bind(this.dynamicObstacleEditor));
    document.getElementById('editor-clear-stop-signs').addEventListener('click', this.clearStopSigns.bind(this));
    document.getElementById('editor-clear-traffic-lights').addEventListener('click', this.clearTrafficLights.bind(this));
    document.getElementById('editor-clear-parking-spots').addEventListener('click', this.clearParkingSpots.bind(this));
    const clearIntersectionsBtn = document.getElementById('editor-clear-intersections');
    if (clearIntersectionsBtn) {
      clearIntersectionsBtn.addEventListener('click', this.clearIntersections.bind(this));
    }
    document.getElementById('editor-clear-path').addEventListener('click', this.clearPath.bind(this));
    document.getElementById('editor-clear-all').addEventListener('click', this.clearAll.bind(this));

    document.getElementById('editor-save').addEventListener('click', this.saveClicked.bind(this));
    document.getElementById('editor-load').addEventListener('click', this.loadClicked.bind(this));
    document.getElementById('editor-share').addEventListener('click', this.shareClicked.bind(this));

    document.addEventListener('keydown', this.keyDown.bind(this));
    document.addEventListener('keyup', this.keyUp.bind(this));

    const resolution = new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight);
    this.centerlineObject = new THREE.Mesh(
      new THREE.Geometry(),
      new MeshLineMaterial({
        color: new THREE.Color(0x004488),
        lineWidth: 8,
        resolution: resolution,
        sizeAttenuation: false,
        near: camera.near,
        far: camera.far,
        depthWrite: false
      })
    );
    this.centerlineObject.rotation.x = Math.PI / 2;
    this.centerlineObject.renderOrder = 1;
    this.group.add(this.centerlineObject);

    this.leftBoundaryObject = new THREE.Mesh(
      new THREE.Geometry(),
      new MeshLineMaterial({
        color: new THREE.Color(0xff40ff),
        lineWidth: 0.15,
        resolution: resolution,
        transparent: true,
        opacity: 0.7
      })
    );
    this.leftBoundaryObject.rotation.x = Math.PI / 2;
    this.leftBoundaryObject.renderOrder = 1;
    this.group.add(this.leftBoundaryObject);

    this.rightBoundaryObject = new THREE.Mesh(
      new THREE.Geometry(),
      new MeshLineMaterial({
        color: new THREE.Color(0xff40ff),
        lineWidth: 0.15,
        resolution: resolution,
        transparent: true,
        opacity: 0.7
      })
    );
    this.rightBoundaryObject.rotation.x = Math.PI / 2;
    this.rightBoundaryObject.renderOrder = 1;
    this.group.add(this.rightBoundaryObject);

    window.addEventListener('resize', () => {
      // Use setTimeout to queue the resolution update after the canvas is reflowed.
      // This gets around some weirdness noticed when opening and closing Chrome Developer Tools.
      setTimeout(() => {
        const resolution = new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight);
        this.centerlineObject.material.uniforms.resolution.value = resolution;
        this.leftBoundaryObject.material.uniforms.resolution.value = resolution;
        this.rightBoundaryObject.material.uniforms.resolution.value = resolution;
      }, 0);
    });

    // Initialize road type after objects are created
    this._changeRoadType('regular');
  }

  get enabled() {
    return this.isEnabled;
  }

  set enabled(e) {
    this.isEnabled = e;
    this.pointGroup.visible = this.obstacleGroup.visible = this.stopSignGroup.visible = this.trafficLightGroup.visible = this.parkingSpotGroup.visible = this.intersectionGroup.visible = !!this.isEnabled;
  }

  get staticObstacles() {
    return this.obstacleGroup.children.map(o => new StaticObstacle(new THREE.Vector2(o.position.x, o.position.z), -o.rotation.z, o.userData.width, o.userData.height));
  }

  get stopSigns() {
    return this.stopSignGroup.children.map(o => new StopSign(new THREE.Vector2(o.position.x, o.position.z), -o.rotation.z));
  }

  get trafficLights() {
    return this.trafficLightGroup.children.map(o => new TrafficLight(new THREE.Vector2(o.position.x, o.position.z), -o.rotation.z));
  }

  get parkingSpots() {
    return this.parkingSpotGroup.children.map(o => new ParkingSpot(new THREE.Vector2(o.position.x, o.position.z), -o.rotation.z));
  }

  get dynamicObstacles() {
    return this.dynamicObstacleEditor.collectDynamicObstacles();
  }

  get initialSpeed() {
    let speed = parseFloat(this.initialSpeedDom.value);
    if (Number.isNaN(speed) || speed < 0)
      speed = 0;

    return Number.isNaN(speed) || speed < 0 ? INITIAL_SPEED_FALLBACK : speed;
  }

  get speedLimit() {
    let limit = parseFloat(this.speedLimitDom.value);
    if (Number.isNaN(limit) || limit < 0)
      limit = 0;

    return Number.isNaN(limit) || limit < 0 ? SPEED_LIMIT_FALLBACK : limit;
  }

  scenarioToJSON() {
    const trunc = n => +n.toFixed(5);

    const json = {
      p: Array.prototype.concat.apply([], this.lanePath.anchors.map(a => [trunc(a.x), trunc(a.y)])),
      s: this.staticObstacles.map(o => o.toJSON()),
      ss: this.stopSigns.map(o => o.toJSON()), // Save stop signs
      tl: this.trafficLights.map(o => o.toJSON()), // Save traffic lights
      ps: this.parkingSpots.map(o => o.toJSON()), // Save parking spots
      d: this.dynamicObstacleEditor.toJSON(),
      l: Number(this.lanePath.arcLength.toFixed(3)),
      w: this.lanePath.width, // Save road width
      c: {
        s: Number(this.initialSpeedDom.value),
        sl: Number(this.speedLimitDom.value),
        lp: this.lanePreference
      },
      v: 1
    };

    return json;
  }

  loadJSON(json) {
    if (json.p === undefined || json.p.length % 2 != 0) {
      throw new Error('Incomplete lane path.');
    }

    this.clearAll();

    this.lanePath = new LanePath();
    for (let i = 0; i < json.p.length; i += 2) {
      this.addPoint(new THREE.Vector2(json.p[i], json.p[i + 1]), false);
    }
    this.lanePath.resampleAll();
    this.rebuildPathGeometry();

    json.s.forEach(o => {
      const staticObstacle = StaticObstacle.fromJSON(o);
      this.addStaticObstacle(new THREE.Vector3(staticObstacle.pos.x, 0, staticObstacle.pos.y), staticObstacle.width, staticObstacle.height, staticObstacle.rot)
    });

    // Load Stop Signs
    if (json.ss) {
      json.ss.forEach(o => {
        const stopSign = StopSign.fromJSON(o);
        this.addStopSign(new THREE.Vector3(stopSign.pos.x, 0, stopSign.pos.y), stopSign.rot);
      });
    }

    if (json.tl) {
      json.tl.forEach(o => {
        const trafficLight = TrafficLight.fromJSON(o);
        this.addTrafficLight(new THREE.Vector3(trafficLight.pos.x, 0, trafficLight.pos.y), trafficLight.rot);
      });
    }

    if (json.ps) {
      json.ps.forEach(o => {
        const parkingSpot = ParkingSpot.fromJSON(o);
        this.addParkingSpot(new THREE.Vector3(parkingSpot.pos.x, 0, parkingSpot.pos.y), parkingSpot.rot);
      });
    }

    this.dynamicObstacleEditor.loadJSON(json.d);

    let initialSpeed = INITIAL_SPEED_FALLBACK;
    let speedLimit = SPEED_LIMIT_FALLBACK;
    let lanePreference = LANE_PREFERENCE_FALLBACK;
    let roadWidth = ROAD_WIDTH_FALLBACK;

    if (json.c) {
      if (json.c.s !== undefined) initialSpeed = Number(json.c.s) || INITIAL_SPEED_FALLBACK;
      if (json.c.sl !== undefined) speedLimit = Number(json.c.sl) || SPEED_LIMIT_FALLBACK;
      if (json.c.lp !== undefined) lanePreference = Math.sign(Number(json.c.lp)) || LANE_PREFERENCE_FALLBACK;
    }

    if (typeof json.w === 'number') {
      roadWidth = json.w;
    }

    this.initialSpeedDom.value = initialSpeed;
    this.speedLimitDom.value = speedLimit;
    this.lanePath.width = roadWidth;
    if (this.editorRoadWidthDom) this.editorRoadWidthDom.value = roadWidth;

    this._changeLanePreference(lanePreference);
  }

  update() {
    if (!this.isEnabled) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = this.raycaster.ray.intersectPlane(GROUND_PLANE);

    const [station, latitude, _around] = this.lanePath.stationLatitudeFromPosition(new THREE.Vector2(intersection.x, intersection.z));
    this.statsStation.textContent = (station || 0).toFixed(1);
    this.statsLatitude.textContent = (latitude || 0).toFixed(1);

    if (this.draggingPoint) {
      if (intersection != null) {
        this.updatePoint(this.draggingPoint, intersection.clone().add(this.dragOffset));
        this.rebuildPathGeometry();
      }
    } else if (this.draggingObstacle) {
      if (intersection !== null) {
        if (this.draggingObstacle === true) {
          if (this.draggingObstaclePreview) this.group.remove(this.draggingObstaclePreview);

          const [center, width, height] = this._dimensionsFromRect(this.dragOffset, intersection);

          this.draggingObstaclePreview = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ color: NORMAL_STATIC_OBSTACLE_COLOR, depthTest: false, transparent: true, opacity: 0.4 })
          );
          this.draggingObstaclePreview.rotation.x = -Math.PI / 2;
          this.draggingObstaclePreview.position.copy(center);
          this.group.add(this.draggingObstaclePreview);
        } else {
          this.draggingObstacle.position.copy(intersection.clone().add(this.dragOffset));
        }
      }
    } else if (this.draggingStopSign) {
      if (intersection != null) {
        this.draggingStopSign.position.copy(intersection.clone().add(this.dragOffset));
      }
    } else if (this.rotatingObstacle) {
      const rotation = (this.dragOffset.x - this.mouse.x) * 2 * Math.PI;
      this.rotatingObstacle.rotation.z = Math.wrapAngle(rotation + this.initialObstacleRotation);
    } else if (this.rotatingStopSign) {
      const rotation = (this.dragOffset.x - this.mouse.x) * 2 * Math.PI;
      this.rotatingStopSign.rotation.z = Math.wrapAngle(rotation + this.initialObstacleRotation);
    } else if (this.rotatingTrafficLight) {
      const rotation = (this.dragOffset.x - this.mouse.x) * 2 * Math.PI;
      this.rotatingTrafficLight.rotation.z = Math.wrapAngle(rotation + this.initialObstacleRotation);
    } else if (this.rotatingParkingSpot) {
      const rotation = (this.dragOffset.x - this.mouse.x) * 2 * Math.PI;
      this.rotatingParkingSpot.rotation.z = Math.wrapAngle(rotation + this.initialObstacleRotation);
    } else if (this.draggingIntersection) {
      if (intersection != null) {
        this.draggingIntersection.position.copy(intersection.clone().add(this.dragOffset));
      }
    } else if (this.rotatingIntersection) {
      const rotation = (this.dragOffset.x - this.mouse.x) * 2 * Math.PI;
      this.rotatingIntersection.rotation.y = Math.wrapAngle(rotation + this.initialObstacleRotation);
    } else {
      this.pointGroup.children.forEach(p => {
        p.material.color.set(NORMAL_POINT_COLOR)
        p.material.opacity = NORMAL_OPACITY;
      });

      this.obstacleGroup.children.forEach(o => {
        o.material.color.set(NORMAL_STATIC_OBSTACLE_COLOR)
        o.material.opacity = NORMAL_OPACITY;
      });

      this.stopSignGroup.children.forEach(o => {
        o.material.color.set(NORMAL_STOP_SIGN_COLOR);
        o.material.opacity = NORMAL_OPACITY;
      });

      this.trafficLightGroup.children.forEach(o => {
        o.material.color.set(NORMAL_TRAFFIC_LIGHT_COLOR);
        o.material.opacity = NORMAL_OPACITY;
      });

      this.parkingSpotGroup.children.forEach(o => {
        o.material.color.set(NORMAL_PARKING_SPOT_COLOR);
        o.material.opacity = NORMAL_OPACITY;
      });

      this.canvas.classList.remove('editor-grab', 'editor-grabbing', 'editor-removing');

      if (this.editMode == 'path' && this.pointGroup.children.length > 0) {
        let picked = null;
        this.raycaster.intersectObjects(this.pointGroup.children).forEach(p => {
          if (picked === null || p.object.userData.index > picked.object.userData.index) picked = p;
        });

        if (picked) {
          picked.object.material.color.set(HOVER_POINT_COLOR);
          picked.object.material.opacity = HOVER_OPACITY;

          if (this.removeMode)
            this.canvas.classList.add('editor-removing');
          else
            this.canvas.classList.add('editor-grab');
        }
      } else if (this.editMode == 'staticObstacles' && this.obstacleGroup.children.length > 0) {
        let picked = null;
        this.raycaster.intersectObjects(this.obstacleGroup.children).forEach(o => {
          if (picked === null || o.object.userData.index > picked.object.userData.index) picked = o;
        });

        if (picked) {
          picked.object.material.color.set(HOVER_STATIC_OBSTACLE_COLOR);
          picked.object.material.opacity = HOVER_OPACITY;

          if (this.removeMode)
            this.canvas.classList.add('editor-removing');
          else
            this.canvas.classList.add('editor-grab');
        }
      } else if (this.editMode == 'stopSigns' && this.stopSignGroup.children.length > 0) {
        let picked = null;
        this.raycaster.intersectObjects(this.stopSignGroup.children).forEach(o => {
          if (picked === null || o.object.userData.index > picked.object.userData.index) picked = o;
        });

        if (picked) {
          picked.object.material.color.set(HOVER_STOP_SIGN_COLOR);
          picked.object.material.opacity = HOVER_OPACITY;

          if (this.removeMode)
            this.canvas.classList.add('editor-removing');
          else
            this.canvas.classList.add('editor-grab');
        }
      } else if (this.editMode == 'trafficLights' && this.trafficLightGroup.children.length > 0) {
        let picked = null;
        this.raycaster.intersectObjects(this.trafficLightGroup.children).forEach(o => {
          if (picked === null || o.object.userData.index > picked.object.userData.index) picked = o;
        });

        if (picked) {
          picked.object.material.color.set(HOVER_TRAFFIC_LIGHT_COLOR);
          picked.object.material.opacity = HOVER_OPACITY;

          if (this.removeMode)
            this.canvas.classList.add('editor-removing');
          else
            this.canvas.classList.add('editor-grab');
        }
      }
    }
  }

  changeEditMode(mode) {
    this.editorPathButton.classList.add('is-outlined');
    this.editorObstaclesButton.classList.add('is-outlined');
    this.editorDynamicObstaclesButton.classList.add('is-outlined');
    if (this.editorStopSignsButton) this.editorStopSignsButton.classList.add('is-outlined');
    if (this.editorTrafficLightsButton) this.editorTrafficLightsButton.classList.add('is-outlined');
    if (this.editorParkingSpotsButton) this.editorParkingSpotsButton.classList.add('is-outlined');
    if (this.editorIntersectionsButton) this.editorIntersectionsButton.classList.add('is-outlined');

    this.editorPathButton.classList.remove('is-selected');
    this.editorObstaclesButton.classList.remove('is-selected');
    this.editorDynamicObstaclesButton.classList.remove('is-selected');
    if (this.editorStopSignsButton) this.editorStopSignsButton.classList.remove('is-selected');
    if (this.editorTrafficLightsButton) this.editorTrafficLightsButton.classList.remove('is-selected');
    if (this.editorParkingSpotsButton) this.editorParkingSpotsButton.classList.remove('is-selected');
    if (this.editorIntersectionsButton) this.editorIntersectionsButton.classList.remove('is-selected');

    this.editorRoadBox.classList.add('is-hidden');
    this.helpPath.classList.add('is-hidden');
    this.helpStaticObstacles.classList.add('is-hidden');
    this.helpDynamicObstacles.classList.add('is-hidden');

    if (mode == 'path') {
      this.editMode = 'path';
      this.editorPathButton.classList.remove('is-outlined');
      this.editorPathButton.classList.add('is-selected');
      this.editorRoadBox.classList.remove('is-hidden');
      this.helpPath.classList.remove('is-hidden');
      this.dynamicObstacleEditor.disable();
    } else if (mode == 'staticObstacles') {
      this.editMode = 'staticObstacles';
      this.editorObstaclesButton.classList.remove('is-outlined');
      this.editorObstaclesButton.classList.add('is-selected');
      this.helpStaticObstacles.classList.remove('is-hidden');
      this.dynamicObstacleEditor.disable();
    } else if (mode == 'dynamicObstacles') {
      this.editMode = 'dynamicObstacles';
      this.editorDynamicObstaclesButton.classList.remove('is-outlined');
      this.editorDynamicObstaclesButton.classList.add('is-selected');
      this.helpDynamicObstacles.classList.remove('is-hidden');
      this.dynamicObstacleEditor.enable();
    } else if (mode == 'stopSigns') {
      this.editMode = 'stopSigns';
      if (this.editorStopSignsButton) {
        this.editorStopSignsButton.classList.remove('is-outlined');
        this.editorStopSignsButton.classList.add('is-selected');
      }
      // Reuse static obstacle help for now or add new help
      this.helpStaticObstacles.classList.remove('is-hidden');
      this.dynamicObstacleEditor.disable();
    } else if (mode == 'trafficLights') {
      this.editMode = 'trafficLights';
      if (this.editorTrafficLightsButton) {
        this.editorTrafficLightsButton.classList.remove('is-outlined');
        this.editorTrafficLightsButton.classList.add('is-selected');
      }
      this.helpStaticObstacles.classList.remove('is-hidden');
      this.dynamicObstacleEditor.disable();
    } else if (mode == 'parkingSpots') {
      this.editMode = 'parkingSpots';
      if (this.editorParkingSpotsButton) {
        this.editorParkingSpotsButton.classList.remove('is-outlined');
        this.editorParkingSpotsButton.classList.add('is-selected');
      }
      this.helpStaticObstacles.classList.remove('is-hidden');
      this.dynamicObstacleEditor.disable();
    } else if (mode == 'intersections') {
      this.editMode = 'intersections';
      if (this.editorIntersectionsButton) {
        this.editorIntersectionsButton.classList.remove('is-outlined');
        this.editorIntersectionsButton.classList.add('is-selected');
      }
      this.helpStaticObstacles.classList.remove('is-hidden');
      this.dynamicObstacleEditor.disable();
    }
  }

  addStaticObstacle(center, width, height, rotation = 0) {
    const obstacle = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: NORMAL_STATIC_OBSTACLE_COLOR, depthTest: false, transparent: true, opacity: NORMAL_OPACITY })
    );
    obstacle.rotation.x = -Math.PI / 2;
    obstacle.rotation.z = -Math.wrapAngle(rotation);
    obstacle.position.copy(center);
    obstacle.userData = { index: this.obstacleIndex++, width: width, height: height };

    this.obstacleGroup.add(obstacle);
    this.statsStaticObstacles.textContent = this.obstacleGroup.children.length;
  }

  addStopSign(center, rotation = 0) {
    const stopSign = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 8), // Octagon-ish
      new THREE.MeshBasicMaterial({ color: NORMAL_STOP_SIGN_COLOR, depthTest: false, transparent: true, opacity: NORMAL_OPACITY })
    );
    stopSign.rotation.x = -Math.PI / 2;
    stopSign.rotation.z = -Math.wrapAngle(rotation);
    stopSign.position.copy(center);
    stopSign.userData = { index: this.stopSignIndex++ };

    this.stopSignGroup.add(stopSign);
  }

  addTrafficLight(center, rotation = 0) {
    const trafficLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 3.0), // Taller box
      new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false, transparent: true, opacity: 0.8 }) // Start Red
    );
    trafficLight.rotation.x = -Math.PI / 2;
    trafficLight.rotation.z = -Math.wrapAngle(rotation);
    trafficLight.position.copy(center);
    trafficLight.position.y = 1.5; // Lift up
    trafficLight.userData = { index: this.trafficLightIndex++ };

    this.trafficLightGroup.add(trafficLight);
  }

  addParkingSpot(center, rotation = 0) {
    const parkingSpot = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 5.0),
      new THREE.MeshBasicMaterial({ color: NORMAL_PARKING_SPOT_COLOR, depthTest: false, transparent: true, opacity: NORMAL_OPACITY, side: THREE.DoubleSide })
    );
    parkingSpot.rotation.x = -Math.PI / 2;
    parkingSpot.rotation.z = -Math.wrapAngle(rotation);
    parkingSpot.position.copy(center);
    // Lift slightly to avoid z-fighting with ground but below obstacles
    parkingSpot.position.y = 0.02;
    parkingSpot.userData = { index: this.parkingSpotIndex++ };

    this.parkingSpotGroup.add(parkingSpot);
  }

  removeStaticObstacle(obstacle) {
    this.obstacleGroup.remove(obstacle);
    this.statsStaticObstacles.textContent = this.obstacleGroup.children.length;
  }

  removeStopSign(stopSign) {
    this.stopSignGroup.remove(stopSign);
  }

  removeTrafficLight(trafficLight) {
    this.trafficLightGroup.remove(trafficLight);
  }

  removeParkingSpot(parkingSpot) {
    this.parkingSpotGroup.remove(parkingSpot);
  }

  addIntersection(center, rotation = 0) {
    try {
      console.log('addIntersection called with:', center);
      // Use the actual IntersectionObject
      const centerPos = { x: center.x, y: center.z };

      // Safety check for IntersectionObject
      if (typeof IntersectionObject === 'undefined') {
        console.error('IntersectionObject class is not defined!');
        alert('Error: IntersectionObject not loaded. See console.');
        return;
      }

      const intersection = new IntersectionObject(centerPos, 14, rotation);
      intersection.userData = { index: this.intersectionIndex || 0, size: 14 };
      this.intersectionIndex = (this.intersectionIndex || 0) + 1;

      this.intersectionGroup.add(intersection);
      console.log('Intersection added successfully');
    } catch (e) {
      console.error('Error adding intersection:', e);
      alert('Error adding intersection: ' + e.message);
    }
  }

  removeIntersection(intersection) {
    this.intersectionGroup.remove(intersection);
  }

  clearStaticObstacles() {
    this.group.remove(this.obstacleGroup);
    this.obstacleGroup = new THREE.Group();
    this.obstacleGroup.renderOrder = 1;
    this.group.add(this.obstacleGroup);
    this.obstacleIndex = 0;
    this.statsStaticObstacles.textContent = 0;
  }

  clearStopSigns() {
    this.group.remove(this.stopSignGroup);
    this.stopSignGroup = new THREE.Group();
    this.stopSignGroup.renderOrder = 2;
    this.group.add(this.stopSignGroup);
    this.stopSignIndex = 0;
  }

  clearTrafficLights() {
    this.group.remove(this.trafficLightGroup);
    this.trafficLightGroup = new THREE.Group();
    this.trafficLightGroup.renderOrder = 2;
    this.group.add(this.trafficLightGroup);
    this.trafficLightIndex = 0;
  }

  clearParkingSpots() {
    this.group.remove(this.parkingSpotGroup);
    this.parkingSpotGroup = new THREE.Group();
    this.parkingSpotGroup.renderOrder = 0;
    this.group.add(this.parkingSpotGroup);
    this.parkingSpotIndex = 0;
  }

  clearIntersections() {
    this.group.remove(this.intersectionGroup);
    this.intersectionGroup = new THREE.Group();
    this.intersectionGroup.renderOrder = 0;
    this.group.add(this.intersectionGroup);
    this.intersectionIndex = 0;
  }

  clearAll() {
    this.clearPath();
    this.clearPath();
    this.clearStaticObstacles();
    this.clearStopSigns();
    this.clearTrafficLights();
    this.clearParkingSpots();
    this.clearIntersections();
    this.dynamicObstacleEditor.clearDynamicObstacles();
  }

  rebuildPathGeometry() {
    if (this.lanePath.anchors.length > 1) {
      this.centerlineGeometry.setFromPoints(this.lanePath.centerline);
      const centerline = new MeshLine();
      centerline.setGeometry(this.centerlineGeometry);
      this.centerlineObject.geometry = centerline.geometry;
      this.centerlineObject.material.uniforms.resolution.value.set(this.canvas.clientWidth, this.canvas.clientHeight);

      this.leftBoundaryGeometry.setFromPoints(this.lanePath.leftBoundary);
      const leftBoundary = new MeshLine();
      leftBoundary.setGeometry(this.leftBoundaryGeometry);
      this.leftBoundaryObject.geometry = leftBoundary.geometry;
      this.leftBoundaryObject.material.uniforms.resolution.value.set(this.canvas.clientWidth, this.canvas.clientHeight);

      this.rightBoundaryGeometry.setFromPoints(this.lanePath.rightBoundary);
      const rightBoundary = new MeshLine();
      rightBoundary.setGeometry(this.rightBoundaryGeometry);
      this.rightBoundaryObject.geometry = rightBoundary.geometry;
      this.rightBoundaryObject.material.uniforms.resolution.value.set(this.canvas.clientWidth, this.canvas.clientHeight);
    } else {
      if (this.centerlineObject.geometry) this.centerlineObject.geometry.dispose();
      this.centerlineObject.geometry = new THREE.Geometry();

      if (this.leftBoundaryObject.geometry) this.leftBoundaryObject.geometry.dispose();
      this.leftBoundaryObject.geometry = new THREE.Geometry();

      if (this.rightBoundaryObject.geometry) this.rightBoundaryObject.geometry.dispose();
      this.rightBoundaryObject.geometry = new THREE.Geometry();
    }

    this.statsRoadLength.textContent = this.lanePath.arcLength.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  addPoint(pos, resample = true) {
    const point = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({
        color: NORMAL_POINT_COLOR,
        depthTest: false,
        transparent: true,
        opacity: NORMAL_OPACITY
      })
    );
    point.rotation.x = -Math.PI / 2;
    point.position.set(pos.x, 0, pos.y);
    point.userData = { index: this.pointIndex++ };

    this.lanePath.addAnchor(pos, resample);
    this.pointGroup.add(point);

    return point;
  }

  updatePoint(object, pos) {
    object.position.copy(pos);
    this.lanePath.updateAnchor(object.userData.index, new THREE.Vector2(pos.x, pos.z));
  }

  removePoint(object) {
    const index = object.userData.index;

    this.pointGroup.remove(object);
    this.pointGroup.children.forEach(p => {
      if (p.userData.index > index) p.userData.index--;
    });
    this.pointIndex--;

    this.lanePath.removeAnchor(index);
  }

  clearPath() {
    this.group.remove(this.pointGroup);
    this.pointGroup = new THREE.Group();
    this.pointGroup.renderOrder = 2;
    this.group.add(this.pointGroup);
    this.pointIndex = 0;

    this.lanePath = new LanePath();
    this.rebuildPathGeometry();

    this.initialSpeedDom.value = INITIAL_SPEED_FALLBACK;
    this.speedLimitDom.value = SPEED_LIMIT_FALLBACK;
  }

  keyDown(event) {
    if (event.repeat || (this.editMode != 'path' && this.editMode != 'staticObstacles' && this.editMode != 'stopSigns' && this.editMode != 'trafficLights' && this.editMode != 'parkingSpots' && this.editMode != 'intersections')) return;

    if (event.key == 'Shift') {
      this.removeMode = true;
      this.canvas.classList.add('editor-pointing');
      event.preventDefault();
    } else if (event.key == 'Control' && (this.editMode == 'staticObstacles' || this.editMode == 'stopSigns' || this.editMode == 'trafficLights' || this.editMode == 'parkingSpots' || this.editMode == 'intersections')) {
      this.rotateMode = true;
      this.canvas.classList.add('editor-pointing');
      event.preventDefault();
    }
  }

  keyUp(event) {
    if (event.key == 'Shift') {
      this.removeMode = false;
      this.canvas.classList.remove('editor-pointing', 'editor-removing');
    } else if (event.key == 'Control') {
      this.rotateMode = false;
      this.canvas.classList.remove('editor-pointing', 'editor-grabbing');
    }
  }

  mouseDown(event) {
    console.log('[Editor] mouseDown called. Enabled:', this.isEnabled, 'Button:', event.button, 'EditMode:', this.editMode);
    if (!this.isEnabled || event.button != 0) return;

    this.mouse.x = (event.offsetX / this.canvas.clientWidth) * 2 - 1;
    this.mouse.y = -(event.offsetY / this.canvas.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.editMode == 'path') {
      let picked = null;
      this.raycaster.intersectObjects(this.pointGroup.children).forEach(p => {
        if (picked === null || p.object.userData.index > picked.object.userData.index) picked = p;
      });

      if (picked) {
        if (this.removeMode) {
          this.removePoint(picked.object);
          this.rebuildPathGeometry();
        } else {
          this.canvas.classList.remove('editor-grab');
          this.canvas.classList.add('editor-grabbing');

          this.draggingPoint = picked.object;
          this.dragOffset.copy(picked.object.position).sub(picked.point);
        }
      } else if (!this.removeMode) {
        const intersection = this.raycaster.ray.intersectPlane(GROUND_PLANE);
        if (intersection != null) {
          this.addPoint(new THREE.Vector2(intersection.x, intersection.z));
          this.rebuildPathGeometry();
        }
      }
    } else if (this.editMode == 'staticObstacles') {
      let picked = null;
      this.raycaster.intersectObjects(this.obstacleGroup.children).forEach(o => {
        if (picked === null || o.object.userData.index > picked.object.userData.index) picked = o;
      });

      if (picked) {
        if (this.removeMode) {
          this.removeStaticObstacle(picked.object);
        } else {
          this.canvas.classList.remove('editor-grab');
          this.canvas.classList.add('editor-grabbing');

          if (this.rotateMode) {
            this.rotatingObstacle = picked.object;
            this.initialObstacleRotation = picked.object.rotation.z;
            this.dragOffset.set(this.mouse.x, this.mouse.y, 0);
          } else {
            this.draggingObstacle = picked.object;
            this.dragOffset.copy(picked.object.position).sub(picked.point);
          }
        }
      } else if (!this.removeMode && !this.rotateMode) {
        const intersection = this.raycaster.ray.intersectPlane(GROUND_PLANE);
        if (intersection != null) {
          this.draggingObstacle = true;
          this.dragOffset.copy(intersection);
        }
      }
    } else if (this.editMode == 'stopSigns') {
      let picked = null;
      this.raycaster.intersectObjects(this.stopSignGroup.children).forEach(o => {
        if (picked === null || o.object.userData.index > picked.object.userData.index) picked = o;
      });

      if (picked) {
        if (this.removeMode) {
          this.removeStopSign(picked.object);
        } else {
          this.canvas.classList.remove('editor-grab');
          this.canvas.classList.add('editor-grabbing');

          if (this.rotateMode) {
            this.rotatingStopSign = picked.object;
            this.initialObstacleRotation = picked.object.rotation.z;
            this.dragOffset.set(this.mouse.x, this.mouse.y, 0);
          } else {
            this.draggingStopSign = picked.object;
            this.dragOffset.copy(picked.object.position).sub(picked.point);
          }
        }
      } else if (!this.removeMode && !this.rotateMode) {
        const intersection = this.raycaster.ray.intersectPlane(GROUND_PLANE);
        if (intersection != null) {
          this.addStopSign(intersection);
        }
      }
    } else if (this.editMode == 'trafficLights') {
      let picked = null;
      this.raycaster.intersectObjects(this.trafficLightGroup.children).forEach(o => {
        if (picked === null || o.object.userData.index > picked.object.userData.index) picked = o;
      });

      if (picked) {
        if (this.removeMode) {
          this.removeTrafficLight(picked.object);
        } else {
          this.canvas.classList.remove('editor-grab');
          this.canvas.classList.add('editor-grabbing');

          if (this.rotateMode) {
            this.rotatingTrafficLight = picked.object;
            this.initialObstacleRotation = picked.object.rotation.z;
            this.dragOffset.set(this.mouse.x, this.mouse.y, 0);
          } else {
            this.draggingTrafficLight = picked.object;
            this.dragOffset.copy(picked.object.position).sub(picked.point);
          }
        }
      } else if (!this.removeMode && !this.rotateMode) {
        const intersection = this.raycaster.ray.intersectPlane(GROUND_PLANE);
        if (intersection != null) {
          this.addTrafficLight(intersection);
        }
      }
    } else if (this.editMode == 'parkingSpots') {
      let picked = null;
      this.raycaster.intersectObjects(this.parkingSpotGroup.children).forEach(o => {
        if (picked === null || o.object.userData.index > picked.object.userData.index) picked = o;
      });

      if (picked) {
        if (this.removeMode) {
          this.removeParkingSpot(picked.object);
        } else {
          this.canvas.classList.remove('editor-grab');
          this.canvas.classList.add('editor-grabbing');

          if (this.rotateMode) {
            this.rotatingParkingSpot = picked.object;
            this.initialObstacleRotation = picked.object.rotation.z;
            this.dragOffset.set(this.mouse.x, this.mouse.y, 0);
          } else {
            this.draggingParkingSpot = picked.object;
            this.dragOffset.copy(picked.object.position).sub(picked.point);
          }
        }
      } else if (!this.removeMode && !this.rotateMode) {
        const intersection = this.raycaster.ray.intersectPlane(GROUND_PLANE);
        if (intersection != null) {
          this.addParkingSpot(intersection);
        }
      }
    } else if (this.editMode == 'intersections') {
      console.log('[Intersections] Mode active');
      // Intersections snap to road endpoints (first or last anchor)
      if (!this.removeMode && !this.rotateMode) {
        console.log('[Intersections] Not in remove/rotate mode');
        // Check if we're near the start or end of the road
        if (this.lanePath.anchors.length >= 2) {
          console.log('[Intersections] Road has', this.lanePath.anchors.length, 'anchors');
          const intersection = this.raycaster.ray.intersectPlane(GROUND_PLANE);
          if (intersection != null) {
            // Check for Alt key specific bypass
            if (event.altKey) {
              console.log('[Intersections] Alt key held - free placement');
              this.addIntersection(intersection);
              return;
            }
            console.log('[Intersections] Click at:', intersection.x.toFixed(2), intersection.z.toFixed(2));
            const clickPos = new THREE.Vector2(intersection.x, intersection.z);
            const firstAnchor = this.lanePath.anchors[0];
            const lastAnchor = this.lanePath.anchors[this.lanePath.anchors.length - 1];

            const distToFirst = clickPos.distanceTo(firstAnchor);
            const distToLast = clickPos.distanceTo(lastAnchor);
            console.log('[Intersections] Dist to first:', distToFirst.toFixed(2), 'last:', distToLast.toFixed(2));
            const snapDistance = 15; // Increased snap distance

            let snapPoint = null;
            if (distToFirst < snapDistance && distToFirst <= distToLast) {
              snapPoint = firstAnchor;
              console.log('[Intersections] Snapping to FIRST anchor');
            } else if (distToLast < snapDistance) {
              snapPoint = lastAnchor;
              console.log('[Intersections] Snapping to LAST anchor');
            } else {
              console.log('[Intersections] Not close enough to any endpoint (need <', snapDistance, ')');
            }

            if (snapPoint) {
              // Check if intersection already exists at this point
              const existingIntersection = this.intersectionGroup.children.find(child => {
                const childPos = new THREE.Vector2(child.position.x, child.position.z);
                return childPos.distanceTo(snapPoint) < 2;
              });

              if (!existingIntersection) {
                console.log('[Intersections] Creating at:', snapPoint.x.toFixed(2), snapPoint.y.toFixed(2));
                // Create intersection at road endpoint
                const intersectionPos = new THREE.Vector3(snapPoint.x, 0, snapPoint.y);
                this.addIntersection(intersectionPos);
                console.log('[Intersections] Created! Total intersections:', this.intersectionGroup.children.length);
              } else {
                console.log('[Intersections] Already exists at this point');
              }
            }
          }
        } else {
          console.log('[Intersections] Need at least 2 road points, have:', this.lanePath.anchors.length);
        }
      } else if (this.removeMode) {
        // Allow removing intersections
        let picked = null;
        this.raycaster.intersectObjects(this.intersectionGroup.children, true).forEach(o => {
          let obj = o.object;
          while (obj.parent && obj.parent !== this.intersectionGroup) {
            obj = obj.parent;
          }
          if (picked === null || obj.userData.index > (picked.userData && picked.userData.index || 0)) picked = obj;
        });

        if (picked) {
          this.removeIntersection(picked);
        }
      }
    }
  }

  mouseMove(event) {
    this.mouse.x = (event.offsetX / this.canvas.clientWidth) * 2 - 1;
    this.mouse.y = -(event.offsetY / this.canvas.clientHeight) * 2 + 1;
  }

  mouseUp(event) {
    if (!this.isEnabled || event.button != 0) return;

    if (this.draggingObstacle === true) {
      this.group.remove(this.draggingObstaclePreview);
      this.draggingObstaclePreview = null;

      this.mouse.x = (event.offsetX / this.canvas.clientWidth) * 2 - 1;
      this.mouse.y = -(event.offsetY / this.canvas.clientHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersection = this.raycaster.ray.intersectPlane(GROUND_PLANE);
      if (intersection != null) {
        const [center, width, height] = this._dimensionsFromRect(this.dragOffset, intersection);
        this.addStaticObstacle(center, width, height);
      }
    }

    this.draggingPoint = null;
    this.draggingObstacle = null;
    this.rotatingObstacle = null;
    this.draggingStopSign = null;
    this.rotatingStopSign = null;
    this.draggingTrafficLight = null;
    this.rotatingTrafficLight = null;
    this.draggingParkingSpot = null;
    this.rotatingParkingSpot = null;
    this.draggingIntersection = null;
    this.rotatingIntersection = null;
    this.canvas.classList.remove('editor-grab', 'editor-grabbing');
  }

  updateSavedInfo(name, savedAt) {
    this.previousSavedName = name || null;

    name = name || 'Untitled';
    savedAt = savedAt || 'Unsaved';

    this.scenarioNameDom.textContent = name;
    this.scenarioNameDom.title = name;
    this.scenarioSavedAtDom.textContent = savedAt;
  }

  _changeLanePreference(pref) {
    this.lanePreference = pref;

    if (pref > 0) {
      this.laneLeftDom.classList.add('is-outlined');
      this.laneLeftDom.classList.remove('is-selected');
      this.laneRightDom.classList.remove('is-outlined');
      this.laneRightDom.classList.add('is-selected');
    } else {
      this.laneRightDom.classList.add('is-outlined');
      this.laneRightDom.classList.remove('is-selected');
      this.laneLeftDom.classList.remove('is-outlined');
      this.laneLeftDom.classList.add('is-selected');
    }
  }

  _changeRoadType(type) {
    this.lanePath.roadType = type;

    if (type === 'highway') {
      this.roadRegularDom.classList.add('is-outlined');
      this.roadRegularDom.classList.remove('is-selected');
      this.roadHighwayDom.classList.remove('is-outlined');
      this.roadHighwayDom.classList.add('is-selected');

      // Highway is wider (4 lanes)
      this.lanePath.width = 14.8;
      if (this.editorRoadWidthDom) this.editorRoadWidthDom.value = 14.8;
    } else {
      this.roadHighwayDom.classList.add('is-outlined');
      this.roadHighwayDom.classList.remove('is-selected');
      this.roadRegularDom.classList.remove('is-outlined');
      this.roadRegularDom.classList.add('is-selected');

      // Regular road (2 lanes)
      this.lanePath.width = 7.4;
      if (this.editorRoadWidthDom) this.editorRoadWidthDom.value = 7.4;
    }

    this.lanePath.resampleAll();
    this.rebuildPathGeometry();
  }

  saveClicked() {
    const name = window.prompt('Name your scenario:', this.previousSavedName || '');
    if (name === null) return;
    if (name === '') {
      window.alert('The scenario name cannot be blank.');
      return;
    }

    let [success, savedAt] = this.scenarioManager.saveScenario(name, this.scenarioToJSON(), name === this.previousSavedName);
    const formattedSavedAt = formatDate(savedAt);

    if (success) {
      this.updateSavedInfo(name, formattedSavedAt);
    } else if (confirm(`A scenario named "${name}" already exists, last saved ${formattedSavedAt}. Do you want to overwrite it?`)) {
      [success, savedAt] = this.scenarioManager.saveScenario(name, this.scenarioToJSON(), true);
      this.updateSavedInfo(name, formatDate(savedAt));
    }
  }

  loadClicked() {
    this.scenarioManager.showModal();
  }

  shareClicked() {
    this.shareManager.showModal(this.scenarioToJSON());
  }

  _dimensionsFromRect(from, to) {
    const center = from.clone().add(to).divideScalar(2);
    const width = Math.max(0.5, Math.abs(from.x - to.x));
    const height = Math.max(0.5, Math.abs(from.z - to.z));
    return [center, width, height];
  }
}
