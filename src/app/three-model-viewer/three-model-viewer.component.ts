import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  input
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-three-model-viewer',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './three-model-viewer.component.html',
  styleUrls: ['./three-model-viewer.component.scss']
})
export class ThreeModelViewerComponent implements AfterViewInit, OnDestroy {
  // Input for model paths
  public modelPath = input.required<string>();
  public modelPath2 = input.required<string>();

  @ViewChild('modelCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  // State properties
  public isLoading = false;
  public error: string | null = null;

  // Three.js properties
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private loader: GLTFLoader;
  private clock: THREE.Clock;
  private mixer: THREE.AnimationMixer | null = null;
  private currentModel: THREE.Object3D | null = null;
  private currentAnimation: THREE.AnimationAction | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    this.loader = new GLTFLoader();
    this.clock = new THREE.Clock();
  }

  ngAfterViewInit() {
    this.initScene();
    this.loadInitialModel();
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private initScene() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2c3e50);

    // Setup camera
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 1, 4);
    this.camera.lookAt(0, 0, 0);

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Setup controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.maxPolarAngle = Math.PI / 2;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 0, -5);
    this.scene.add(fillLight);

    // Start animation loop
    this.animate();
  }

  private async loadInitialModel() {
    try {
      const gltf = await this.loadModel(this.modelPath());
      if (gltf.scene) {
        this.currentModel = gltf.scene;
        this.centerAndScaleModel(this.currentModel);
        this.scene.add(this.currentModel);
      }
    } catch (error) {
      this.handleError('Error loading initial model:', error);
    }
  }

  private loadModel(modelPath: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        modelPath,
        (gltf) => {
          resolve(gltf);
        },
        (progress) => {
          console.log(`Loading model: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        (error) => {
          console.error('Error loading model:', error);
          reject(error);
        }
      );
    });
  }

  private centerAndScaleModel(model: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 3 / maxDim;
      model.scale.multiplyScalar(scale);
    }

    model.position.y -= 1;
  }

  private onWindowResize() {
    if (this.camera && this.renderer) {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  async loadAndPlayModel(modelNumber: number) {
    if (!this.modelPath() || !this.modelPath2()) {
      this.handleError('Model path is not provided');
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      this.cleanupCurrentModel();

      const modelPath = modelNumber === 1 ? this.modelPath() : this.modelPath2();
      const gltf = await this.loadModel(modelPath);

      if (gltf.scene) {
        this.currentModel = gltf.scene;
        this.centerAndScaleModel(this.currentModel);
        this.scene.add(this.currentModel);

        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.currentModel);
          this.currentAnimation = this.mixer.clipAction(gltf.animations[0]);
          this.currentAnimation.reset();
          this.currentAnimation.setLoop(THREE.LoopRepeat, Infinity);
          this.currentAnimation.play();
        }
      }
    } catch (error) {
      this.handleError('Error loading model:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private handleError(message: string, error?: any) {
    console.error(message, error);
    this.error = `${message}${error ? ': ' + error.message : ''}`;
  }

  private cleanupCurrentModel() {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }
    if (this.currentAnimation) {
      this.currentAnimation.stop();
    }
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    // Update controls
    this.controls.update();

    // Update animations
    if (this.mixer) {
      const delta = this.clock.getDelta();
      this.mixer.update(delta);
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.cleanupCurrentModel();
    this.renderer?.dispose();
    this.controls?.dispose();
  }
}