import THREE from "../../vendor/three.js";

export default class ParkingSpot {
    static hydrate(obj) {
        Object.setPrototypeOf(obj, ParkingSpot.prototype);
        Object.setPrototypeOf(obj.pos, THREE.Vector2.prototype);
    }

    static fromJSON(json) {
        return new ParkingSpot(new THREE.Vector2(json.p[0], json.p[1]), json.r);
    }

    constructor(pos, rot) {
        this.pos = pos;
        this.rot = rot;
        this.width = 2.5;
        this.height = 5.0;
    }

    toJSON() {
        const trunc = n => +n.toFixed(5);
        return {
            p: [trunc(this.pos.x), trunc(this.pos.y)],
            r: trunc(this.rot)
        };
    }
}
