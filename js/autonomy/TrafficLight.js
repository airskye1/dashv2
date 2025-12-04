import THREE from "script-loader!../../vendor/three.js";

export default class TrafficLight {
    static hydrate(obj) {
        Object.setPrototypeOf(obj, TrafficLight.prototype);
        Object.setPrototypeOf(obj.pos, THREE.Vector2.prototype);
    }

    static fromJSON(json) {
        const tl = new TrafficLight(new THREE.Vector2(json.p[0], json.p[1]), json.r);
        tl.state = json.s || 'red';
        return tl;
    }

    constructor(pos, rot) {
        this.pos = pos;
        this.rot = rot;
        this.state = 'red'; // 'red', 'green', 'yellow'
        this.timer = 0;
        this.cycleDuration = 10; // seconds
    }

    update(dt) {
        this.timer += dt;
        // Simple cycle: Red (5s) -> Green (5s) -> Yellow (2s) -> Red
        // Actually: Red -> Green -> Yellow -> Red
        const cycle = this.timer % 15;
        if (cycle < 6) {
            this.state = 'red';
        } else if (cycle < 12) {
            this.state = 'green';
        } else {
            this.state = 'yellow';
        }
    }

    toJSON() {
        const trunc = n => +n.toFixed(5);
        return {
            p: [trunc(this.pos.x), trunc(this.pos.y)],
            r: trunc(this.rot),
            s: this.state
        };
    }
}
