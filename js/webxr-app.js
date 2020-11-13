const MODELS_URL = 'model/';
const MODEL_OBJ = 'tardis.obj';
const MODEL_MTL = 'tardis.mtl';

import * as THREE from './three.js/three.module.js';
import { WebXRButton } from './util/webxr-button.js';
import { Reticle } from './util/utils.js';
import { LitScene } from './util/utils.js';
import { Model } from './util/utils.js';

/**
 * Container class to manage connecting to the WebXR Device API
 * and handle rendering on every frame.
 */
export class WebXRApp {
    constructor(options) {
        // Application options and defaults
        if (!options) { options = {}; }

        this.options = {
            immersiveMode: options.immersiveMode || 'immersive-ar',
            referenceSpace: options.referenceSpace || ['local']
        };

        // WebGL scene globals.
        this.camera;
        this.scene;
        this.renderer;
        this.reticle;
        this.model;

        // XR globals
        this.xrViewerSpace = null;
        this.hitTestSource = null;

        // xrButton that request and end ar session
        this.xrButton = new WebXRButton({
            onRequestSession: () => { return this.onRequestSession(); },
            onEndSession: (session) => { this.onEndSession(session); },
            textEnterXRTitle: "START AR",
            textXRNotFoundTitle: "AR NOT FOUND",
            textExitXRTitle: "EXIT AR",
        });

        // Called when the local reference space is init.
        this.frameCallback = (time, frame) => {
            let session = frame.session;
            session.requestAnimationFrame(this.frameCallback);

            this.onXRFrame(time, frame);
        };
    }

    /**
     * Start the XR application.
     */
    run() {
        this.onInitXR();
    }

    /**
     * Activate the xrButton
     * if the immersive mode is supported by the user's WebXR device.
     */
    onInitXR() {
        if (navigator.xr) {
            navigator.xr.isSessionSupported(this.options.immersiveMode)
                        .then((supported) => {
                this.xrButton.enabled = supported;
            });
        }
    }

    /**
     * Create the THREE.WebGLRenderer object, which is used to render the scene using WebGL.
     * This object has some properties.
     */
    setUpRenderer(session) {
        this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local');
        this.renderer.xr.setSession(session);
    }

    /**
     * Called when the xrButton gets clicked. Requests an immersive session.
     */
    onRequestSession() {
        return navigator.xr.requestSession(this.options.immersiveMode, {
            requiredFeatures: this.options.referenceSpace
        }).then((session) => {
            this.xrButton.setSession(session);
            session.isImmersive = true;
            this.onSessionStarted(session);
        });
    }

    onEndSession(session) {
        session.end();
    }

    /**
     * Set up a THREE.WebGLRenderer object, THREE.Scene object, a camera, and 
     * THREE reticle and our model.
     */
    addWebGLComponents(session) {
        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

        this.scene = new LitScene();

        this.model = new Model(MODELS_URL, MODEL_OBJ, MODEL_MTL);

        this.reticle = new Reticle(this.session, this.camera);
        this.scene.add(this.reticle);

        this.setUpRenderer(session);
    }

    /**
     * Set up reference spaces. They correlating its local space's reference frame 
     * coordinate system to the coordinate system of the space in which it exists.
     */
    requestReferenceSpaces(session) {
        // This request cast a ray straight out from the viewer's
        // position and render a reticle where it intersects with a real world
        // surface. To do this we first get the viewer space, then create a
        // hitTestSource that tracks it.
        session.requestReferenceSpace('viewer').then((referenceSpace) => {
            this.xrViewerSpace = referenceSpace;
            session.requestHitTestSource({ space: this.xrViewerSpace }).then((source) => {
                this.hitTestSource = source;
            });
        });

        // The local reference space is used to describe a relatively 
        // small area. After we get reference space, we can start animation frame inside.
        session.requestReferenceSpace('local').then((referenceSpace) => {
            this.xrViewerSpace = referenceSpace;

            session.requestAnimationFrame(this.frameCallback);
        });
    }

    /**
     * Called when the XRSession has begun. Here we set up our three.js
     * renderer, scene, and camera and kick off the render loop.
     */
    onSessionStarted(session) {
        session.addEventListener('end', (event) => {
            this.onSessionEnded(event.session);
        });

        session.addEventListener('select', (event) => {
            this.onSelect(event.session);
        });

        this.addWebGLComponents(session);

        this.requestReferenceSpaces(session);
    }

    onSessionEnded(session) {
        if (session == this.xrButton.session) {
            this.xrButton.setSession(null);
        }
        this.hitTestSource = null;
    }

    /**
     * If the reticle at the hit point, we can add at this point our model.
     */
    onSelect(event) {
        // The reticle should already be positioned at the latest hit point,
        // so we can just use it's matrix.
        if (this.reticle.visible) {   
            this.model.position.setFromMatrixPosition(this.reticle.matrix);
            this.scene.add(this.model);
        }
    }

    /**
     * Called every time a XRSession requests that a new frame be drawn.
     */
    onXRFrame(time, frame) {
        if (frame && this.hitTestSource) {
            const hitTestResults = frame.getHitTestResults(this.hitTestSource);

            if (hitTestResults.length) {
                const hit = hitTestResults[0];
                this.reticle.visible = true;
                this.reticle.matrix.fromArray(hit.getPose(this.xrViewerSpace).transform.matrix);
            } else {
                this.reticle.visible = false;
            }
        }

        this.renderer.render(this.scene, this.camera)
    }
}
  