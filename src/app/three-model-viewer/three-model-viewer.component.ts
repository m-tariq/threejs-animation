// three-model-viewer.component.ts
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
      <canvas #modelCanvas class="w-full h-[500px]"></canvas>
      <div class="controls mt-4 flex justify-center space-x-4">
        @for (animation of animationNames(); track $index) {
          <button 
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            (click)="playAnimation($index)"
          >
            Play {{ animation }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .model-viewer-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
  `]
})
export class ThreeModelViewerComponent implements AfterViewInit, OnDestroy {
  public baseModelPath = input<string>('');
  public animationFiles = input<string[]>([]);
  public animationNames = input<string[]>([]);

  @ViewChild('modelCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private loadedModels: { [key: string]: THREE.Group } = {};
  private currentModelName: string | null = null;

  constructor() {
    this.loader = new GLTFLoader();
  }

  private loader: GLTFLoader;

  ngAfterViewInit() {
    this.initScene();
    this.loadAllModels();
  }

  private initScene() {
    if (!this.canvasRef) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    });
    this.renderer.setSize(width, height);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    this.animate();
  }

  private loadAllModels() {
    if (this.baseModelPath()) {
      this.loadModel(this.baseModelPath()!, 'base').then(model => {
        console.log('Base model loaded');
        this.showModel('base');
      });
    }

    this.animationFiles().forEach((file, index) => {
      const modelName = this.animationNames()[index] || `animation${index}`;
      this.loadModel(file, modelName).then(() => {
        console.log(`Loaded animation model: ${modelName}`);
      });
    });
  }

  private loadModel(path: string, modelName: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          gltf.animations.forEach((anim, index) => {
            console.log(`${index}: ${anim.name}`);
        });
          const model = gltf.scene;
          this.loadedModels[modelName] = model;
          this.centerAndScaleModel(model);
          resolve(model);
        },
        (progress) => {
          console.log(`Loading ${modelName}: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        (error) => {
          console.error(`Error loading ${modelName}:`, error);
          reject(error);
        }
      );
    });
  }

  private centerAndScaleModel(model: THREE.Group) {
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

  private showModel(modelName: string) {
    if (this.currentModelName && this.loadedModels[this.currentModelName]) {
      this.scene.remove(this.loadedModels[this.currentModelName]);
    }

    const model = this.loadedModels[modelName];
    if (model) {;
      this.scene.add(model);
      this.currentModelName = modelName;
    }
  }

  playAnimation(index: number) {
    debugger
    const modelName = this.animationNames()[index];
    if (modelName && this.loadedModels[modelName]) {
      this.showModel(modelName);
    }
  }

  private animate() {
    if (!this.renderer || !this.scene || !this.camera) return;
    
    requestAnimationFrame(() => this.animate());
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy() {
    this.renderer?.dispose();
    // Clean up other resources
    Object.values(this.loadedModels).forEach(model => {
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    });
  }
}