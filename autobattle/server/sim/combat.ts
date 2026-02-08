// Deterministic combat simulation

import { PlacedUnit, CombatEvent, CombatResult } from './types.js';

const MAX_TICKS = 200; // 20 seconds at 10 ticks/second

function cloneUnit(unit: PlacedUnit): PlacedUnit {
  return {
    ...unit,
    position: { ...unit.position }
  };
}

function getCellIndex(x: number, y: number): number {
  // Row-major ordering: y * width + x
  return y * 6 + x;
}

function findLowestIndexTarget(units: PlacedUnit[]): PlacedUnit | null {
  if (units.length === 0) return null;
  
  let lowest = units[0];
  let lowestIndex = getCellIndex(lowest.position.x, lowest.position.y);
  
  for (let i = 1; i < units.length; i++) {
    const index = getCellIndex(units[i].position.x, units[i].position.y);
    if (index < lowestIndex) {
      lowest = units[i];
      lowestIndex = index;
    }
  }
  
  return lowest;
}

export function simulateCombat(
  player1Units: PlacedUnit[],
  player2Units: PlacedUnit[]
): CombatResult {
  // Clone units for simulation
  const p1Units = player1Units.map(cloneUnit);
  const p2Units = player2Units.map(cloneUnit);
  
  const events: CombatEvent[] = [];
  
  for (let tick = 0; tick < MAX_TICKS; tick++) {
    // Check if combat should end
    const p1Alive = p1Units.filter(u => u.alive);
    const p2Alive = p2Units.filter(u => u.alive);
    
    if (p1Alive.length === 0 || p2Alive.length === 0) {
      break;
    }
    
    // Process each player1 unit
    for (const unit of p1Units) {
      if (!unit.alive) continue;
      
      if (unit.cooldown === 0) {
        const target = findLowestIndexTarget(p2Units.filter(u => u.alive));
        if (target) {
          target.hp -= unit.atk;
          events.push({
            tick,
            type: 'attack',
            attackerId: unit.id,
            targetId: target.id,
            damage: unit.atk
          });
          
          if (target.hp <= 0) {
            target.alive = false;
            events.push({
              tick,
              type: 'death',
              targetId: target.id
            });
          }
        }
        unit.cooldown = unit.cd;
      } else {
        unit.cooldown--;
      }
    }
    
    // Process each player2 unit
    for (const unit of p2Units) {
      if (!unit.alive) continue;
      
      if (unit.cooldown === 0) {
        const target = findLowestIndexTarget(p1Units.filter(u => u.alive));
        if (target) {
          target.hp -= unit.atk;
          events.push({
            tick,
            type: 'attack',
            attackerId: unit.id,
            targetId: target.id,
            damage: unit.atk
          });
          
          if (target.hp <= 0) {
            target.alive = false;
            events.push({
              tick,
              type: 'death',
              targetId: target.id
            });
          }
        }
        unit.cooldown = unit.cd;
      } else {
        unit.cooldown--;
      }
    }
  }
  
  // Determine winner
  const p1Alive = p1Units.filter(u => u.alive);
  const p2Alive = p2Units.filter(u => u.alive);
  
  let winner: 'player1' | 'player2' | 'draw';
  
  if (p1Alive.length > 0 && p2Alive.length === 0) {
    winner = 'player1';
  } else if (p2Alive.length > 0 && p1Alive.length === 0) {
    winner = 'player2';
  } else {
    // Both have units or both have none - check total HP
    const p1TotalHp = p1Alive.reduce((sum, u) => sum + u.hp, 0);
    const p2TotalHp = p2Alive.reduce((sum, u) => sum + u.hp, 0);
    
    if (p1TotalHp > p2TotalHp) {
      winner = 'player1';
    } else if (p2TotalHp > p1TotalHp) {
      winner = 'player2';
    } else {
      winner = 'draw';
    }
  }
  
  return {
    winner,
    events,
    finalState: {
      player1Units: p1Units,
      player2Units: p2Units
    }
  };
}
