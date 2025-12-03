import { TestBed } from '@angular/core/testing';

import { WebSocketConnection } from './web-socket-connection';

describe('WebSocketConnection', () => {
  let service: WebSocketConnection;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WebSocketConnection);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
