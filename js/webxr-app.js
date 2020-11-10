const MODELS_URL = '../media/model/';
const MODEL_OBJ_URL = 'TARDIS.obj';
const MODEL_MTL_URL = 'TARDIS.mtl';

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
        this.reticle;
    
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
  
    setWebGLRenderer() {
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

        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

        const light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
		light.position.set( 0.5, 1, 0.25 );
		this.scene.add( light );


        this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local');
        this.renderer.xr.setSession(session);


        this.reticle = new THREE.Mesh(
            new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX( - Math.PI / 2 ),
            new THREE.MeshBasicMaterial()
        );
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);


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
        console.log('onSelect');
    }
  
    // Override to customize frame handling
    onXRFrame(time, frame) {
        if (frame) {
            if (this.hitTestSource) {
                const hitTestResults = frame.getHitTestResults(this.hitTestSource);

                if (hitTestResults.length) {
                    const hit = hitTestResults[0];
                    //console.log(this.reticle);
                    this.reticle.visible = true;
                    this.reticle.matrix.fromArray( hit.getPose(this.xrViewerSpace).transform.matrix);
                } else {
                    this.reticle.visible = false;
                }
            }

        }

        this.renderer.render(this.scene, this.camera)
    }
  }
  