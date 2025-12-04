

export default class StopSign {
    static hydrate(obj) {
        Object.setPrototypeOf(obj, StopSign.prototype);
        Object.setPrototypeOf(obj.pos, THREE.Vector2.prototype);
    }

    static fromJSON(json) {
        return new StopSign(new THREE.Vector2(json.p[0], json.p[1]), json.r);
    }

    constructor(pos, rot) {
        this.pos = pos;
        this.rot = rot;
        this.width = 0.8; // Standard size
        this.height = 0.8;

        // State for the planner
        this.id = Math.random().toString(36).substr(2, 9);
    }

    toJSON() {
        const trunc = n => +n.toFixed(5);
        return {
            p: [trunc(this.pos.x), trunc(this.pos.y)],
            r: trunc(this.rot)
        };
    }
}
