import { Component } from "@angular/core";
import { ThreeModelViewerComponent } from "./three-model-viewer/three-model-viewer.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ThreeModelViewerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent { }