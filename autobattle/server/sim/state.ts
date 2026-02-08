// Game state management

import { RoomState, PlayerState, Unit, PlacedUnit, Phase, UnitType } from './types.js';
import { RNG } from './rng.js';
import { generateShopOffers, UNIT_DEFINITIONS } from './shop.js';

let nextUnitId = 1;

export function createUnit(type: UnitType): Unit {
  const def = UNIT_DEFINITIONS[type];
  return {
    id: `unit-${nextUnitId++}`,
    type,
    hp: def.hp,
    maxHp: def.hp,
    atk: def.atk,
    cd: def.cd,
    cooldown: 0,
    alive: true
  };
}

export function createPlayer(id: string, name: string): PlayerState {
  return {
    id,
    name,
    hp: 10,
    gold: 3,
    bench: [],
    board: [],
    shopOffers: [],
    refreshUsed: false,
    ready: false
  };
}

export function createRoom(code: string, seed: number): RoomState {
  return {
    code,
    players: new Map(),
    phase: 'PREP',
    phaseEndTime: 0,
    round: 1,
    combatLog: [],
    gameOver: false,
    winner: null,
    seed
  };
}

export function startPrepPhase(room: RoomState, durationMs: number): void {
  room.phase = 'PREP';
  room.phaseEndTime = Date.now() + durationMs;
  
  // Reset gold and ready status, generate shop offers
  const rng = new RNG(room.seed + room.round);
  
  for (const player of room.players.values()) {
    player.gold = 3;
    player.ready = false;
    player.refreshUsed = false;
    player.shopOffers = generateShopOffers(rng, 3);
  }
}

export function startCombatPhase(room: RoomState, durationMs: number): void {
  room.phase = 'COMBAT';
  room.phaseEndTime = Date.now() + durationMs;
  room.combatLog = [];
}

export function startResultPhase(room: RoomState, durationMs: number): void {
  room.phase = 'RESULT';
  room.phaseEndTime = Date.now() + durationMs;
}

export function nextRound(room: RoomState): void {
  room.round++;
}

export function checkGameOver(room: RoomState): boolean {
  const players = Array.from(room.players.values());
  if (players.length !== 2) return false;
  
  const deadPlayers = players.filter(p => p.hp <= 0);
  if (deadPlayers.length > 0) {
    room.gameOver = true;
    if (deadPlayers.length === 2) {
      room.winner = 'draw';
    } else {
      const alive = players.find(p => p.hp > 0);
      room.winner = alive ? alive.id : null;
    }
    return true;
  }
  
  return false;
}

export function resetRoom(room: RoomState): void {
  room.round = 1;
  room.gameOver = false;
  room.winner = null;
  room.combatLog = [];
  room.seed = Math.floor(Math.random() * 1000000);
  
  for (const player of room.players.values()) {
    player.hp = 10;
    player.gold = 3;
    player.bench = [];
    player.board = [];
    player.shopOffers = [];
    player.refreshUsed = false;
    player.ready = false;
  }
}
