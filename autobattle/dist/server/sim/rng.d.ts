export declare class RNG {
    private seed;
    constructor(seed: number);
    next(): number;
    nextInt(min: number, max: number): number;
    shuffle<T>(array: T[]): T[];
}
//# sourceMappingURL=rng.d.ts.map