import { Component } from "@angular/core";
import { ThreeModelViewerComponent } from "./three-model-viewer/three-model-viewer.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ThreeModelViewerComponent],
  template: `
    <app-three-model-viewer
      [baseModelPath]="'assets/models/Anatomy.glb'"
      [animationFiles]="[
        'assets/models/PushUpAnimation.glb',
        'assets/models/SquatAnimation.glb'
      ]"
      [animationNames]="['PushUp', 'Squat']"
    ></app-three-model-viewer>
  `
})
export class AppComponent {}