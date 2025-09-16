import { Injectable } from '@angular/core';
import { Grid } from '../interfaces/grid.interface';
import { Character } from '../interfaces/character.interface';

@Injectable({
  providedIn: 'root'
})
export class TextDrawService {

  constructor() { }

  /*getCharacterData(characterId: string): Character {
    return 
  }*/


  drawCharacter(grid: Grid, x: number, y: number, character: Character) {

  }
}
