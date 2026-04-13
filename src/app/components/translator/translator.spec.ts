import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Translator } from './translator';

describe('Translator', () => {
  let component: Translator;
  let fixture: ComponentFixture<Translator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Translator],
    }).compileComponents();

    fixture = TestBed.createComponent(Translator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
