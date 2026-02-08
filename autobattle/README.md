# Auto Battler

A simple 2-player online auto-battler game inspired by Teamfight Tactics, built with Node.js, TypeScript, and WebSockets.

## Features

- Real-time multiplayer with WebSocket communication
- Room-based matchmaking with short room codes
- Shop system with unit purchasing and refreshing
- Drag-and-drop unit placement on a 6x4 grid
- Deterministic combat simulation
- Phase-based gameplay (PREP → COMBAT → RESULT)
- Combat event log
- Canvas-based rendering

## Requirements

- Node.js (v18 or higher recommended)
- npm

## Installation

```bash
cd autobattle
npm install
```

## Running the Game

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start at `http://localhost:8080`

## How to Play

### Starting a Game

1. **Player 1**: 
   - Open `http://localhost:8080` in your browser
   - Enter your name
   - Click "Create Room"
   - Share the displayed room code with Player 2

2. **Player 2**:
   - Open `http://localhost:8080` in a different browser window/tab
   - Enter your name
   - Enter the room code from Player 1
   - Click "Join Room"

### Game Phases

**PREP Phase (20 seconds)**
- Buy units from the shop (costs 1 gold each)
- Each player starts each round with 3 gold
- Drag units from your bench onto your 6x4 grid
- Move units on the grid by dragging them
- Right-click units to sell them for 1 gold
- Use the Refresh button (costs 1 gold, once per round) to get new shop offers
- Click "Ready" to skip remaining prep time (both players must be ready)

**COMBAT Phase (max 20 seconds)**
- Server simulates combat automatically
- Units attack based on their cooldowns
- Target selection: lowest grid index (row-major: y × 6 + x)
- Combat ends when one side has no units or time runs out
- Watch the combat log for event updates

**RESULT Phase (3 seconds)**
- Winner deals 1 damage to loser's HP
- Draw deals no damage
- Game ends when a player reaches 0 HP

### Unit Types

| Unit     | HP | Attack | Cooldown |
|----------|-----|--------|----------|
| Tank     | 18  | 2      | 12 ticks |
| Fighter  | 12  | 3      | 10 ticks |
| Archer   | 9   | 3      | 9 ticks  |
| Assassin | 8   | 4      | 11 ticks |
| Mage     | 7   | 5      | 14 ticks |
| Guard    | 14  | 2      | 8 ticks  |

### Controls

- **Drag & Drop**: Move units from bench to board or between board cells
- **Right-Click**: Sell a unit (bench or board) for 1 gold
- **Drag Outside Board**: Remove unit from board back to bench
- **Ready Button**: End prep phase early (requires both players)
- **Refresh Button**: Reroll shop offers (1 gold, once per round)

## Testing

Run the test suite:
```bash
npm test
```

Tests verify:
- Combat determinism (same input → same output)
- Correct targeting order (lowest cell index)
- Cooldown mechanics
- Win/loss conditions

## Testing with Two Browser Windows

1. Start the server with `npm run dev`
2. Open `http://localhost:8080` in Chrome
3. Open `http://localhost:8080` in a private/incognito window or different browser
4. Create a room in the first window
5. Join the room in the second window using the displayed room code
6. Play through multiple rounds to test all features

## Architecture

### Server (`/server`)
- `index.ts`: HTTP server, WebSocket server, game loop
- `sim/types.ts`: Type definitions
- `sim/rng.ts`: Seeded random number generator
- `sim/shop.ts`: Shop logic and unit definitions
- `sim/combat.ts`: Deterministic combat simulation
- `sim/state.ts`: Game state management

### Client (`/public`)
- `index.html`: UI structure
- `styles.css`: Styling
- `client.js`: WebSocket client, canvas rendering, drag-and-drop

### Tests (`/tests`)
- `combat.test.ts`: Combat simulation tests

## Technical Details

- **Determinism**: Combat uses a seeded RNG for shop generation; combat itself is purely deterministic based on initial unit positions and stats
- **Tick Rate**: Combat runs at 10 ticks/second (100ms per tick)
- **Max Combat Duration**: 200 ticks (20 seconds)
- **Grid**: 6 columns × 4 rows per player
- **Cell Indexing**: Row-major order (y × 6 + x)

## Notes

- Game state is stored in memory only; server restart clears all rooms
- Room codes are 6-character alphanumeric strings
- Maximum 2 players per room
- If a player disconnects, the game pauses and shows "Opponent disconnected"

## Troubleshooting

**Port already in use**: If port 8080 is occupied, edit `server/index.ts` and change the `PORT` constant.

**WebSocket connection failed**: Ensure the server is running and check browser console for errors.

**Units not rendering**: Check that both players have joined and the game state is synced.

## License

MIT
