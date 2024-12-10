import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreeModelViewerComponent } from './three-model-viewer.component';

describe('ThreeModelViewerComponent', () => {
  let component: ThreeModelViewerComponent;
  let fixture: ComponentFixture<ThreeModelViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreeModelViewerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ThreeModelViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
