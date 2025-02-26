export default class CarObject extends THREE.Object3D {
  constructor(car) {
    super();

    this.car = car;

    this.buildCar2D();
    this.buildCar3D();
  }

  buildCar2D() {
    // ... (remains the same)
  }

  buildCar3D() {
    const loader = new TDSLoader();
    loader.skipMaps = true;

    loader.load("path/to/modelS_plaid.tds", object => {
      object.layers.set(3);
      object.rotation.z = Math.PI / 2;
      object.rotation.x = -Math.PI / 2;

      const box = (new THREE.Box3()).setFromObject(object);
      const scaleLength = Car.HALF_CAR_LENGTH * 2 / (box.max.x - box.min.x);
      const scaleWidth = Car.HALF_CAR_WIDTH * 2 / (box.max.z - box.min.z);
      object.scale.set(scaleWidth, scaleLength, (scaleWidth + scaleLength) / 2);

      box.setFromObject(object);
      object.position.setX(-(box.max.x + box.min.x) / 2);
      object.position.setY(-box.min.y);

      this.add(object);

      const carMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 }); // Adjust color for car body
      const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 }); // Adjust color for wheels

      object.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.layers.set(3);
          child.material = child.name.startsWith("Wheel") ? wheelMaterial : carMaterial;
        }
      });

      [...object.children].filter(child => child.name.startsWith("Wheel")).forEach(wheel => {
        wheel.geometry.computeBoundingBox();
        wheel.geometry.center();
        wheel.position.setY(wheel.position.y - Car.WHEEL_OFFSET); // Adjust vertical position
        wheel.geometry = new THREE.CylinderGeometry(Car.HALF_WHEEL_RADIUS, Car.HALF_WHEEL_RADIUS, Car.WHEEL_THICKNESS, 32); // Use cylinder for wheels
      });
    });
  }

  // ... (updateMatrix and updateCar remain the same)
}
