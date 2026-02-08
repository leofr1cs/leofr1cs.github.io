import { UnitType, UnitDefinition } from './types.js';
import { RNG } from './rng.js';
export declare const UNIT_DEFINITIONS: Record<UnitType, UnitDefinition>;
export declare function generateShopOffers(rng: RNG, count?: number): UnitType[];
export declare function getUnitCost(): number;
export declare function getRefreshCost(): number;
export declare function getSellValue(): number;
//# sourceMappingURL=shop.d.ts.map