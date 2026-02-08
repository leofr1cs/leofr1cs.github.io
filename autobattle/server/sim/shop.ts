// Shop logic and unit definitions

import { UnitType, UnitDefinition } from './types.js';
import { RNG } from './rng.js';

export const UNIT_DEFINITIONS: Record<UnitType, UnitDefinition> = {
  Tank: { type: 'Tank', hp: 18, atk: 2, cd: 12 },
  Fighter: { type: 'Fighter', hp: 12, atk: 3, cd: 10 },
  Archer: { type: 'Archer', hp: 9, atk: 3, cd: 9 },
  Assassin: { type: 'Assassin', hp: 8, atk: 4, cd: 11 },
  Mage: { type: 'Mage', hp: 7, atk: 5, cd: 14 },
  Guard: { type: 'Guard', hp: 14, atk: 2, cd: 8 }
};

const UNIT_POOL: UnitType[] = ['Tank', 'Fighter', 'Archer', 'Assassin', 'Mage', 'Guard'];

export function generateShopOffers(rng: RNG, count: number = 3): UnitType[] {
  const offers: UnitType[] = [];
  for (let i = 0; i < count; i++) {
    const index = rng.nextInt(0, UNIT_POOL.length);
    offers.push(UNIT_POOL[index]);
  }
  return offers;
}

export function getUnitCost(): number {
  return 1;
}

export function getRefreshCost(): number {
  return 1;
}

export function getSellValue(): number {
  return 1;
}
