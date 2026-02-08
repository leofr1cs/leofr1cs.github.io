// Seeded RNG for deterministic gameplay
export class RNG {
    seed;
    constructor(seed) {
        this.seed = seed;
    }
    // Linear congruential generator
    next() {
        this.seed = (this.seed * 1103515245 + 12345) % 2147483648;
        return this.seed / 2147483648;
    }
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min)) + min;
    }
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i + 1);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
}
//# sourceMappingURL=rng.js.map