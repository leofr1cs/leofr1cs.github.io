// Shop logic and unit definitions
export const UNIT_DEFINITIONS = {
    Tank: { type: 'Tank', hp: 18, atk: 2, cd: 12 },
    Fighter: { type: 'Fighter', hp: 12, atk: 3, cd: 10 },
    Archer: { type: 'Archer', hp: 9, atk: 3, cd: 9 },
    Assassin: { type: 'Assassin', hp: 8, atk: 4, cd: 11 },
    Mage: { type: 'Mage', hp: 7, atk: 5, cd: 14 },
    Guard: { type: 'Guard', hp: 14, atk: 2, cd: 8 }
};
const UNIT_POOL = ['Tank', 'Fighter', 'Archer', 'Assassin', 'Mage', 'Guard'];
export function generateShopOffers(rng, count = 3) {
    const offers = [];
    for (let i = 0; i < count; i++) {
        const index = rng.nextInt(0, UNIT_POOL.length);
        offers.push(UNIT_POOL[index]);
    }
    return offers;
}
export function getUnitCost() {
    return 1;
}
export function getRefreshCost() {
    return 1;
}
export function getSellValue() {
    return 1;
}
//# sourceMappingURL=shop.js.map