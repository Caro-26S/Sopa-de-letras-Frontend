import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoreWebsocketTesterComponent } from './score-websocket-tester-component';

describe('ScoreWebsocketTesterComponent', () => {
  let component: ScoreWebsocketTesterComponent;
  let fixture: ComponentFixture<ScoreWebsocketTesterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoreWebsocketTesterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScoreWebsocketTesterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
