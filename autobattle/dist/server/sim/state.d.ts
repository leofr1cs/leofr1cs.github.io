import { RoomState, PlayerState, Unit, UnitType } from './types.js';
export declare function createUnit(type: UnitType): Unit;
export declare function createPlayer(id: string, name: string): PlayerState;
export declare function createRoom(code: string, seed: number): RoomState;
export declare function startPrepPhase(room: RoomState, durationMs: number): void;
export declare function startCombatPhase(room: RoomState, durationMs: number): void;
export declare function startResultPhase(room: RoomState, durationMs: number): void;
export declare function nextRound(room: RoomState): void;
export declare function checkGameOver(room: RoomState): boolean;
export declare function resetRoom(room: RoomState): void;
//# sourceMappingURL=state.d.ts.map