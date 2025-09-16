import { TestBed } from '@angular/core/testing';

import { TextDrawService } from './text-draw.service';

describe('TextDrawService', () => {
  let service: TextDrawService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TextDrawService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
