import { Component } from '@angular/core';
import { ThreeModelViewerComponent } from './three-model-viewer/three-model-viewer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ThreeModelViewerComponent],
  template: `
    <app-three-model-viewer 
      [baseModelPath]="'assets/models/Anatomy.glb'"
      [animationFiles]="[
        'assets/models/Push Up Animation.glb',
        'assets/models/Squat Animation.glb'
      ]"
      [animationNames]="['Push Up Animation', 'Squat']"
    ></app-three-model-viewer>
  `
})
export class AppComponent {}