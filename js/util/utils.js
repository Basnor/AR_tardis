import * as THREE from '../three.js/three.module.js';
import { MTLLoader } from '../three.js/MTLLoader.js';
import { OBJLoader } from '../three.js/OBJLoader.js';

/**
 * The Reticle class creates an object that calls
 * a ring along a found horizontal surface.
 */
export class Reticle extends THREE.Mesh {
    /**
     * @param {XRSession} xrSession
     * @param {THREE.Camera} camera
     */
    constructor(xrSession, camera) {
        super();

        this.geometry = new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX( - Math.PI / 2 );
        this.material = new THREE.MeshBasicMaterial()
        this.matrixAutoUpdate = false;
        this.visible = false;
        this.session = xrSession;
        this.camera = camera;
    }
}

/**
 * Creates a THREE.Scene containing lights that case shadows,
 * and a mesh that will receive shadows.
 */
export class LitScene extends THREE.Scene {
    constructor() {
        super();

        const light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
        light.position.set( 0.5, 1, 0.25 );
        this.add(light);
    }
}

/**
 * Loads an OBJ model with an MTL material applied.
 * Returns a THREE.Group object containing the mesh.
 */
export class Model extends THREE.Group {
    /**
     * @param {string} URL
     * @param {string} obj
     * @param {string} mtl
     */
    constructor(URL, obj, mtl) {
        super();

        const onProgress = function (xhr) {
            if ( xhr.lengthComputable ) {
                const percentComplete = xhr.loaded / xhr.total * 100;
                console.log(Math.round(percentComplete, 2) + '% downloaded');
            }
        };

        const onError = function () { };

        const manager = new THREE.LoadingManager();

        new MTLLoader(manager)
            .setPath(URL)
            .load(mtl, function (materials) {
                materials.preload();

                new OBJLoader(manager)
                    .setMaterials(materials)
                    .setPath(URL)
                    .load(obj, function (object) {
                        object.scale.set(1.0, 1.0, 1.0);
                        this.add(object);
                    }, onProgress, onError);

            } );
    }
}
