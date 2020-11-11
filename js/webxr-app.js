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

        this.xrButton = new WebXRButton({
            onRequestSession: () => { return this.onRequestSession(); },
            onEndSession: (session) => { this.onEndSession(session); },
            textEnterXRTitle: "START AR",
            textXRNotFoundTitle: "AR NOT FOUND",
            textExitXRTitle: "EXIT AR",
        });

        this.frameCallback = (time, frame) => {
            let session = frame.session;
            session.requestAnimationFrame(this.frameCallback);

            this.onXRFrame(time, frame);
        };
    }
  
    run() {
        this.onInitXR();
    }
  
    onInitXR() {
        if (navigator.xr) {
            navigator.xr.isSessionSupported(this.options.immersiveMode)
                        .then((supported) => {
                this.xrButton.enabled = supported;
            });
        }
    }
  
    onInitRenderer(session) {
        this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local');
        this.renderer.xr.setSession(session);
    }
  
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
  
    onSessionStarted(session) {
        session.addEventListener('end', (event) => {
            this.onSessionEnded(event.session);
        });
    
        session.addEventListener('select', (event) => {
            this.onSelect(event);
        });

        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );
        this.scene = new LitScene();

        this.model = new Model(MODELS_URL, MODEL_OBJ, MODEL_MTL);

        this.reticle = new Reticle(this.session, this.camera);
        this.scene.add(this.reticle);

        this.onInitRenderer(session);

        session.requestReferenceSpace('viewer').then((referenceSpace) => {
            this.xrViewerSpace = referenceSpace;
            session.requestHitTestSource({ space: this.xrViewerSpace }).then((source) => {
                this.hitTestSource = source;
            });
        });

        session.requestReferenceSpace('local').then((referenceSpace) => {
            this.xrViewerSpace = referenceSpace;
  
            session.requestAnimationFrame(this.frameCallback);
        });
    }
  
    onSessionEnded(session) {
        if (session == this.xrButton.session) {
            this.xrButton.setSession(null);
        }
        this.hitTestSource = null;
    }

    onSelect(event) {
        if (this.reticle.visible) { 
            this.model.position.setFromMatrixPosition(this.reticle.matrix);
            this.scene.add(this.model);
        }
    }
  
    // Override to customize frame handling
    onXRFrame(time, frame) {
        if (frame && this.hitTestSource) {
            const hitTestResults = frame.getHitTestResults(this.hitTestSource);

            if (hitTestResults.length) {
                const hit = hitTestResults[0];
                this.reticle.visible = true;
                this.reticle.matrix.fromArray( hit.getPose(this.xrViewerSpace).transform.matrix);
            } else {
                this.reticle.visible = false;
            }
        }

        this.renderer.render(this.scene, this.camera)
    }
  }
  