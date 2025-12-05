import { TestBed } from '@angular/core/testing';

import { ScorePolling } from './score-polling';

describe('ScorePolling', () => {
  let service: ScorePolling;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScorePolling);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
