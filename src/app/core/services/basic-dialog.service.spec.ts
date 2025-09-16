import { TestBed } from '@angular/core/testing';

import { BasicDialogService } from './basic-dialog.service';

describe('BasicDialogService', () => {
  let service: BasicDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BasicDialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
