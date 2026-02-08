export type UnitType = 'Tank' | 'Fighter' | 'Archer' | 'Assassin' | 'Mage' | 'Guard';
export interface UnitDefinition {
    type: UnitType;
    hp: number;
    atk: number;
    cd: number;
}
export interface Unit {
    id: string;
    type: UnitType;
    hp: number;
    maxHp: number;
    atk: number;
    cd: number;
    cooldown: number;
    alive: boolean;
}
export interface GridPosition {
    x: number;
    y: number;
}
export interface PlacedUnit extends Unit {
    position: GridPosition;
}
export type Phase = 'PREP' | 'COMBAT' | 'RESULT';
export interface PlayerState {
    id: string;
    name: string;
    hp: number;
    gold: number;
    bench: Unit[];
    board: PlacedUnit[];
    shopOffers: UnitType[];
    refreshUsed: boolean;
    ready: boolean;
}
export interface RoomState {
    code: string;
    players: Map<string, PlayerState>;
    phase: Phase;
    phaseEndTime: number;
    round: number;
    combatLog: string[];
    gameOver: boolean;
    winner: string | null;
    seed: number;
}
export interface CombatEvent {
    tick: number;
    type: 'attack' | 'death';
    attackerId?: string;
    targetId?: string;
    damage?: number;
}
export interface CombatResult {
    winner: 'player1' | 'player2' | 'draw';
    events: CombatEvent[];
    finalState: {
        player1Units: PlacedUnit[];
        player2Units: PlacedUnit[];
    };
}
//# sourceMappingURL=types.d.ts.map