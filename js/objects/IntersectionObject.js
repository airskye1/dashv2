// THREE is available globally via script tag

/**
 * Simple intersection matching the existing road style
 * Blue centerlines, pink boundaries
 */
export default class IntersectionObject extends THREE.Group {
    constructor(center, size = 14, rotation = 0) {
        super();

        const halfSize = size / 2;

        // Colors matching the Editor road style
        const centerlineColor = 0x004488; // Blue
        const boundaryColor = 0xff40ff;   // Pink

        // Materials
        const centerlineMat = new THREE.MeshBasicMaterial({
            color: centerlineColor,
            transparent: true,
            opacity: 0.8,
            depthWrite: false
        });
        const boundaryMat = new THREE.MeshBasicMaterial({
            color: boundaryColor,
            transparent: true,
            opacity: 0.7,
            depthWrite: false
        });
        const asphaltMat = new THREE.MeshBasicMaterial({
            color: 0x222222,
            transparent: true,
            opacity: 0.5,
            depthWrite: false
        });

        // Asphalt base (dark square)
        const asphaltGeom = new THREE.PlaneGeometry(size, size);
        const asphalt = new THREE.Mesh(asphaltGeom, asphaltMat);
        asphalt.rotation.x = -Math.PI / 2;
        asphalt.position.y = 0.01;
        asphalt.renderOrder = 0;
        this.add(asphalt);

        // Create centerlines (cross pattern)
        const lineWidth = 0.3;
        const lineGeom = new THREE.PlaneGeometry(lineWidth, size);

        // North-South centerline
        const nsLine = new THREE.Mesh(lineGeom, centerlineMat);
        nsLine.rotation.x = -Math.PI / 2;
        nsLine.position.y = 0.02;
        nsLine.renderOrder = 1;
        this.add(nsLine);

        // East-West centerline
        const ewLine = new THREE.Mesh(lineGeom.clone(), centerlineMat);
        ewLine.rotation.x = -Math.PI / 2;
        ewLine.rotation.z = Math.PI / 2;
        ewLine.position.y = 0.02;
        ewLine.renderOrder = 1;
        this.add(ewLine);

        // Boundary lines (outer edges)
        const boundaryGeom = new THREE.PlaneGeometry(0.15, size);

        // Left boundary (west)
        const leftBound = new THREE.Mesh(boundaryGeom, boundaryMat);
        leftBound.rotation.x = -Math.PI / 2;
        leftBound.position.set(-halfSize, 0.02, 0);
        leftBound.renderOrder = 1;
        this.add(leftBound);

        // Right boundary (east)
        const rightBound = new THREE.Mesh(boundaryGeom.clone(), boundaryMat);
        rightBound.rotation.x = -Math.PI / 2;
        rightBound.position.set(halfSize, 0.02, 0);
        rightBound.renderOrder = 1;
        this.add(rightBound);

        // Top boundary (north)
        const topBound = new THREE.Mesh(boundaryGeom.clone(), boundaryMat);
        topBound.rotation.x = -Math.PI / 2;
        topBound.rotation.z = Math.PI / 2;
        topBound.position.set(0, 0.02, -halfSize);
        topBound.renderOrder = 1;
        this.add(topBound);

        // Bottom boundary (south)
        const bottomBound = new THREE.Mesh(boundaryGeom.clone(), boundaryMat);
        bottomBound.rotation.x = -Math.PI / 2;
        bottomBound.rotation.z = Math.PI / 2;
        bottomBound.position.set(0, 0.02, halfSize);
        bottomBound.renderOrder = 1;
        this.add(bottomBound);

        // Position the intersection
        this.position.set(center.x, 0, center.y);
        this.rotation.y = rotation;
    }
}
