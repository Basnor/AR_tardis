const MODELS_URL = '../media/model/';
const MODELS_ = ''
const MODEL_OBJ_URL = 'TARDIS.obj';
const MODEL_MTL_URL = 'TARDIS.mtl';
const MODEL_SCALE = 0.9;
const MAX_QUBIUSES = 15;

import * as THREE from './three.js/three.module.js';
import { MTLLoader } from './three.js/MTLLoader.js';
import { OBJLoader } from './three.js/OBJLoader.js';
import { WebXRButton } from './util/webxr-button.js';
import './util/utils.js';

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
    
        // XR globals
        this.xrViewerSpace = null;
        this.hitTestSource;
        this.hitTestSourceRequested;
        this.xrButton = new WebXRButton({
            onRequestSession: () => { return this.onRequestSession(); },
            onEndSession: (session) => { this.onEndSession(session); },
            textEnterXRTitle: "START AR",
            textXRNotFoundTitle: "AR NOT FOUND",
            textExitXRTitle: "EXIT AR",
        });
    
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
  
    onInitRenderer() {
        this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.xr.enabled = true;
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
    
        session.addEventListener('select', this.onSelect);

   
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 200 );

        onInitRenderer();

        this.renderer.xr.setReferenceSpaceType('local');
		this.renderer.xr.setSession(session);
    
    }
  
    onSessionEnded(session) {
        if (session == this.xrButton.session) {
            this.xrButton.setSession(null);
        }
    }

    onSelect(event) {

    }
  
    // Override to customize frame handling
    onXRFrame(time, frame, refSpace) {

    }
  }
  