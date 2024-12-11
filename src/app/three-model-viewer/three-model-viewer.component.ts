import { 
  Component, 
  AfterViewInit, 
  OnDestroy, 
  ElementRef, 
  ViewChild, 
  input
} from '@angular/core';
import { NgFor } from '@angular/common';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-three-model-viewer',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="model-viewer-container">
      <canvas #modelCanvas></canvas>
      <div class="controls">
        @for (animation of animationNames(); track $index) {
          <button 
            class="control-button"
            (click)="playAnimation($index)"
          >
            Play {{ animation }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }

    .model-viewer-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    canvas {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }

    .controls {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 8px;
      z-index: 10;
    }

    .control-button {
      padding: 0.5rem 1rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .control-button:hover {
      background: #2563eb;
    }
  `]
})
export class ThreeModelViewerComponent implements AfterViewInit, OnDestroy {
  // Inputs
  public baseModelPath = input<string>('');
  public animationFiles = input<string[]>([]);
  public animationNames = input<string[]>([]);

  @ViewChild('modelCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  // Three.js properties
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private loader: GLTFLoader;
  private clock: THREE.Clock;
  private mixer: THREE.AnimationMixer | null = null;
  private model: THREE.Object3D | null = null;
  private animationsMap: Map<string, THREE.AnimationClip[]> = new Map();
  private currentAnimation: THREE.AnimationAction | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    this.loader = new GLTFLoader();
    this.clock = new THREE.Clock();
  }

  ngAfterViewInit() {
    this.initScene();
    this.loadModelAndAnimations();
  }

  private initScene() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // Setup camera
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Setup controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Start animation loop
    this.animate();
  }

  private loadModelAndAnimations() {
    // First load the base model
    if (this.baseModelPath()) {
      this.loader.load(
        this.baseModelPath(),
        (gltf) => {
          console.log('Base model loaded:', gltf);
          this.model = gltf.scene;
          this.centerAndScaleModel(this.model);
          this.scene.add(this.model);
          
          // Create mixer after model is loaded
          this.mixer = new THREE.AnimationMixer(this.model);
          
          // Load animations after model is ready
          this.loadAnimationFiles();
        },
        (progress) => {
          console.log(`Loading model: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        (error) => {
          console.error('Error loading model:', error);
        }
      );
    }
  }

  private loadAnimationFiles() {
    this.animationFiles().forEach((file, index) => {
      const animationName = this.animationNames()[index];
      console.log(`Loading animation: ${animationName} from ${file}`);
      
      this.loader.load(
        file,
        (gltf) => {
          if (gltf.animations && gltf.animations.length > 0) {
            console.log(`Loaded animations for ${animationName}:`, gltf.animations);
            // Store the animations with their name
            this.animationsMap.set(animationName, gltf.animations);
          } else {
            console.warn(`No animations found in file: ${file}`);
          }
        },
        (progress) => {
          console.log(`Loading ${animationName}: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        (error) => {
          console.error(`Error loading animation ${animationName}:`, error);
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
    if (maxDim > 2) {
      const scale = 2 / maxDim;
      model.scale.multiplyScalar(scale);
    }
  }

  playAnimation(index: number) {
    if (!this.mixer || !this.model) {
      console.warn('Mixer or model not ready');
      return;
    }

    const animationName = this.animationNames()[index];
    const animations = this.animationsMap.get(animationName);

    console.log(`Attempting to play ${animationName}:`, animations);

    if (animations && animations.length > 0) {
      // Stop current animation if any
      if (this.currentAnimation) {
        this.currentAnimation.stop();
      }

      try {
        // Create and play new animation
        this.currentAnimation = this.mixer.clipAction(animations[0]);
        this.currentAnimation.reset();
        this.currentAnimation.setLoop(THREE.LoopOnce, 1);
        this.currentAnimation.clampWhenFinished = true;
        this.currentAnimation.play();
        
        console.log(`Started playing animation: ${animationName}`);
      } catch (error) {
        console.error('Error playing animation:', error);
      }
    } else {
      console.warn(`No animation found for ${animationName}`);
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

    this.mixer?.stopAllAction();
    
    // Clean up resources
    this.scene?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.renderer?.dispose();
    this.controls?.dispose();
  }
}