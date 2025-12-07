// THREE is available globally via script tag

/**
 * Simple traffic light - just a box with colored light boxes on top
 */
export default class TrafficLightObject extends THREE.Group {
    constructor(trafficLight) {
        super();
        this.trafficLight = trafficLight;

        // Main housing - dark grey box
        const housingGeom = new THREE.BoxGeometry(0.6, 2.0, 0.4);
        const housingMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const housing = new THREE.Mesh(housingGeom, housingMat);
        housing.position.y = 5.0; // Float in air
        this.add(housing);

        // Pole
        const poleGeom = new THREE.BoxGeometry(0.2, 4.0, 0.2);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeom, poleMat);
        pole.position.y = 2.0;
        this.add(pole);

        // Light materials
        this.redMat = new THREE.MeshBasicMaterial({ color: 0x330000 });
        this.yellowMat = new THREE.MeshBasicMaterial({ color: 0x333300 });
        this.greenMat = new THREE.MeshBasicMaterial({ color: 0x003300 });

        // Red light (top)
        const lightGeom = new THREE.BoxGeometry(0.4, 0.4, 0.45);
        this.redLight = new THREE.Mesh(lightGeom, this.redMat);
        this.redLight.position.set(0, 5.6, 0);
        this.add(this.redLight);

        // Yellow light (middle)
        this.yellowLight = new THREE.Mesh(lightGeom.clone(), this.yellowMat);
        this.yellowLight.position.set(0, 5.0, 0);
        this.add(this.yellowLight);

        // Green light (bottom)
        this.greenLight = new THREE.Mesh(lightGeom.clone(), this.greenMat);
        this.greenLight.position.set(0, 4.4, 0);
        this.add(this.greenLight);

        // Position
        this.position.set(trafficLight.pos.x, 0, trafficLight.pos.y);
        this.rotation.y = -trafficLight.rot + Math.PI; // Face forward (towards road)

        // Initial update
        this.update();
    }

    update() {
        const state = this.trafficLight.state;

        // Reset all to dim
        this.redMat.color.setHex(0x330000);
        this.yellowMat.color.setHex(0x333300);
        this.greenMat.color.setHex(0x003300);

        // Light up the active one
        if (state === 'red') {
            this.redMat.color.setHex(0xff0000);
        } else if (state === 'yellow') {
            this.yellowMat.color.setHex(0xffff00);
        } else if (state === 'green') {
            this.greenMat.color.setHex(0x00ff00);
        }
    }
}
