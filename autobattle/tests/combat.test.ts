import { describe, it, expect } from 'vitest';
import { simulateCombat } from '../server/sim/combat.js';
import { PlacedUnit } from '../server/sim/types.js';

describe('Combat Simulation', () => {
  it('should be deterministic - same input produces same output', () => {
    const p1Units: PlacedUnit[] = [
      {
        id: 'unit-1',
        type: 'Tank',
        hp: 18,
        maxHp: 18,
        atk: 2,
        cd: 12,
        cooldown: 0,
        alive: true,
        position: { x: 0, y: 0 }
      },
      {
        id: 'unit-2',
        type: 'Fighter',
        hp: 12,
        maxHp: 12,
        atk: 3,
        cd: 10,
        cooldown: 0,
        alive: true,
        position: { x: 1, y: 0 }
      }
    ];

    const p2Units: PlacedUnit[] = [
      {
        id: 'unit-3',
        type: 'Archer',
        hp: 9,
        maxHp: 9,
        atk: 3,
        cd: 9,
        cooldown: 0,
        alive: true,
        position: { x: 0, y: 0 }
      },
      {
        id: 'unit-4',
        type: 'Mage',
        hp: 7,
        maxHp: 7,
        atk: 5,
        cd: 14,
        cooldown: 0,
        alive: true,
        position: { x: 1, y: 0 }
      }
    ];

    // Run simulation twice
    const result1 = simulateCombat(p1Units, p2Units);
    const result2 = simulateCombat(p1Units, p2Units);

    // Results should be identical
    expect(result1.winner).toBe(result2.winner);
    expect(result1.events.length).toBe(result2.events.length);
    
    // Check final HP values
    const p1FinalHp1 = result1.finalState.player1Units
      .filter(u => u.alive)
      .reduce((sum, u) => sum + u.hp, 0);
    const p1FinalHp2 = result2.finalState.player1Units
      .filter(u => u.alive)
      .reduce((sum, u) => sum + u.hp, 0);
    
    expect(p1FinalHp1).toBe(p1FinalHp2);
  });

  it('should target lowest-index enemy (row-major order)', () => {
    // Player 1 has one unit at (0,0)
    const p1Units: PlacedUnit[] = [
      {
        id: 'attacker',
        type: 'Fighter',
        hp: 100,
        maxHp: 100,
        atk: 10,
        cd: 1,
        cooldown: 0,
        alive: true,
        position: { x: 0, y: 0 }
      }
    ];

    // Player 2 has two units: one at (2,1) and one at (1,0)
    // Cell index for (1,0) = 0*6 + 1 = 1
    // Cell index for (2,1) = 1*6 + 2 = 8
    // So (1,0) should be targeted first
    const p2Units: PlacedUnit[] = [
      {
        id: 'target-high',
        type: 'Mage',
        hp: 5,
        maxHp: 5,
        atk: 1,
        cd: 1,
        cooldown: 0,
        alive: true,
        position: { x: 2, y: 1 } // Higher index
      },
      {
        id: 'target-low',
        type: 'Archer',
        hp: 5,
        maxHp: 5,
        atk: 1,
        cd: 1,
        cooldown: 0,
        alive: true,
        position: { x: 1, y: 0 } // Lower index
      }
    ];

    const result = simulateCombat(p1Units, p2Units);

    // The first attack should target 'target-low'
    const firstAttack = result.events.find(e => e.type === 'attack');
    expect(firstAttack).toBeDefined();
    expect(firstAttack?.targetId).toBe('target-low');
  });

  it('should handle units with different cooldowns correctly', () => {
    // Fast attacking unit vs slow attacking unit
    const p1Units: PlacedUnit[] = [
      {
        id: 'fast',
        type: 'Guard',
        hp: 14,
        maxHp: 14,
        atk: 2,
        cd: 8,
        cooldown: 0,
        alive: true,
        position: { x: 0, y: 0 }
      }
    ];

    const p2Units: PlacedUnit[] = [
      {
        id: 'slow',
        type: 'Mage',
        hp: 7,
        maxHp: 7,
        atk: 5,
        cd: 14,
        cooldown: 0,
        alive: true,
        position: { x: 0, y: 0 }
      }
    ];

    const result = simulateCombat(p1Units, p2Units);

    // Count attacks by each unit
    const fastAttacks = result.events.filter(e => e.type === 'attack' && e.attackerId === 'fast');
    const slowAttacks = result.events.filter(e => e.type === 'attack' && e.attackerId === 'slow');

    // Fast unit should attack more times
    expect(fastAttacks.length).toBeGreaterThan(slowAttacks.length);
  });

  it('should end combat when one side has no units', () => {
    const p1Units: PlacedUnit[] = [
      {
        id: 'strong',
        type: 'Tank',
        hp: 100,
        maxHp: 100,
        atk: 10,
        cd: 5,
        cooldown: 0,
        alive: true,
        position: { x: 0, y: 0 }
      }
    ];

    const p2Units: PlacedUnit[] = [
      {
        id: 'weak',
        type: 'Mage',
        hp: 5,
        maxHp: 5,
        atk: 1,
        cd: 10,
        cooldown: 0,
        alive: true,
        position: { x: 0, y: 0 }
      }
    ];

    const result = simulateCombat(p1Units, p2Units);

    expect(result.winner).toBe('player1');
    
    const p2Alive = result.finalState.player2Units.filter(u => u.alive);
    expect(p2Alive.length).toBe(0);
  });

  it('should determine winner by total HP on timeout/draw', () => {
    // Two tanky units that won't kill each other quickly
    const p1Units: PlacedUnit[] = [
      {
        id: 'tank1',
        type: 'Tank',
        hp: 18,
        maxHp: 18,
        atk: 1,
        cd: 50,
        cooldown: 0,
        alive: true,
        position: { x: 0, y: 0 }
      }
    ];

    const p2Units: PlacedUnit[] = [
      {
        id: 'tank2',
        type: 'Tank',
        hp: 15,
        maxHp: 18,
        atk: 1,
        cd: 50,
        cooldown: 0,
        alive: true,
        position: { x: 0, y: 0 }
      }
    ];

    const result = simulateCombat(p1Units, p2Units);

    // After max ticks, p1 should win due to higher HP
    const p1Alive = result.finalState.player1Units.filter(u => u.alive);
    const p2Alive = result.finalState.player2Units.filter(u => u.alive);
    
    if (p1Alive.length > 0 && p2Alive.length > 0) {
      const p1Hp = p1Alive.reduce((sum, u) => sum + u.hp, 0);
      const p2Hp = p2Alive.reduce((sum, u) => sum + u.hp, 0);
      
      if (p1Hp > p2Hp) {
        expect(result.winner).toBe('player1');
      } else if (p2Hp > p1Hp) {
        expect(result.winner).toBe('player2');
      } else {
        expect(result.winner).toBe('draw');
      }
    }
  });
});
