import { Component } from "@angular/core";
import { ThreeModelViewerComponent } from "./three-model-viewer/three-model-viewer.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ThreeModelViewerComponent],
  template: `
    <app-three-model-viewer
      [modelPath]="'assets/models/Body Weight Squat.glb'"
      [modelPath2]="'assets/models/Push up body.glb'"
    ></app-three-model-viewer>
  `
})
export class AppComponent { }