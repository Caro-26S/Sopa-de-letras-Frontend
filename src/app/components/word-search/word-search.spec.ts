import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordSearch } from './word-search';

describe('WordSearch', () => {
  let component: WordSearch;
  let fixture: ComponentFixture<WordSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordSearch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WordSearch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
