// Main server with HTTP and WebSocket
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { createRoom, createPlayer, startPrepPhase, startCombatPhase, startResultPhase, nextRound, checkGameOver, resetRoom, createUnit } from './sim/state.js';
import { simulateCombat } from './sim/combat.js';
import { getUnitCost, getRefreshCost, getSellValue } from './sim/shop.js';
import { RNG } from './sim/rng.js';
import { generateShopOffers } from './sim/shop.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 8080;
const PREP_DURATION = 20000; // 20 seconds
const COMBAT_DURATION = 20000; // 20 seconds
const RESULT_DURATION = 3000; // 3 seconds
const rooms = new Map();
const connections = new Map();
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
function broadcastToRoom(roomCode, message) {
    for (const [wsId, conn] of connections.entries()) {
        if (conn.roomCode === roomCode) {
            try {
                conn.ws.send(JSON.stringify(message));
            }
            catch (e) {
                console.error('Failed to send to client:', e);
            }
        }
    }
}
function sendToPlayer(playerId, roomCode, message) {
    for (const [wsId, conn] of connections.entries()) {
        if (conn.roomCode === roomCode && conn.playerId === playerId) {
            try {
                conn.ws.send(JSON.stringify(message));
            }
            catch (e) {
                console.error('Failed to send to client:', e);
            }
        }
    }
}
function getRoomState(room) {
    const players = Array.from(room.players.values());
    return {
        code: room.code,
        phase: room.phase,
        phaseEndTime: room.phaseEndTime,
        round: room.round,
        gameOver: room.gameOver,
        winner: room.winner,
        players: players.map(p => ({
            id: p.id,
            name: p.name,
            hp: p.hp,
            gold: p.gold,
            bench: p.bench,
            board: p.board,
            shopOffers: p.shopOffers,
            refreshUsed: p.refreshUsed,
            ready: p.ready
        })),
        combatLog: room.combatLog
    };
}
function handlePhaseTransition(room) {
    if (room.gameOver)
        return;
    const now = Date.now();
    if (now >= room.phaseEndTime) {
        if (room.phase === 'PREP') {
            // Start combat
            startCombatPhase(room, COMBAT_DURATION);
            broadcastToRoom(room.code, {
                type: 'phase_update',
                phase: 'COMBAT',
                phaseEndTime: room.phaseEndTime
            });
            // Run combat simulation
            setTimeout(() => runCombat(room), 100);
        }
        else if (room.phase === 'COMBAT') {
            // Go to result
            startResultPhase(room, RESULT_DURATION);
            broadcastToRoom(room.code, {
                type: 'phase_update',
                phase: 'RESULT',
                phaseEndTime: room.phaseEndTime
            });
        }
        else if (room.phase === 'RESULT') {
            // Check game over
            if (checkGameOver(room)) {
                broadcastToRoom(room.code, {
                    type: 'game_over',
                    winner: room.winner
                });
            }
            else {
                // Start next prep
                nextRound(room);
                startPrepPhase(room, PREP_DURATION);
                broadcastToRoom(room.code, {
                    type: 'phase_update',
                    phase: 'PREP',
                    phaseEndTime: room.phaseEndTime
                });
                broadcastToRoom(room.code, {
                    type: 'room_state',
                    state: getRoomState(room)
                });
            }
        }
    }
}
function runCombat(room) {
    const players = Array.from(room.players.values());
    if (players.length !== 2)
        return;
    const [p1, p2] = players;
    room.combatLog.push(`Round ${room.round} - Combat Start`);
    const result = simulateCombat(p1.board, p2.board);
    // Log key events (sample some to avoid spam)
    const attacks = result.events.filter(e => e.type === 'attack');
    const deaths = result.events.filter(e => e.type === 'death');
    if (attacks.length > 0) {
        room.combatLog.push(`${attacks.length} attacks occurred`);
    }
    for (const death of deaths) {
        const unit = [...p1.board, ...p2.board].find(u => u.id === death.targetId);
        if (unit) {
            room.combatLog.push(`${unit.type} defeated`);
        }
    }
    // Apply results
    if (result.winner === 'player1') {
        p2.hp -= 1;
        room.combatLog.push(`${p1.name} wins! ${p2.name} loses 1 HP`);
    }
    else if (result.winner === 'player2') {
        p1.hp -= 1;
        room.combatLog.push(`${p2.name} wins! ${p1.name} loses 1 HP`);
    }
    else {
        room.combatLog.push('Draw - no damage');
    }
    // Update boards with final state
    p1.board = result.finalState.player1Units;
    p2.board = result.finalState.player2Units;
    broadcastToRoom(room.code, {
        type: 'combat_complete',
        result: {
            winner: result.winner,
            log: room.combatLog
        }
    });
    broadcastToRoom(room.code, {
        type: 'room_state',
        state: getRoomState(room)
    });
}
// HTTP Server
const server = http.createServer((req, res) => {
    // When running from dist, go up two levels; when running with tsx, go up one level
    const publicDir = __dirname.includes('dist')
        ? path.join(__dirname, '..', '..', 'public')
        : path.join(__dirname, '..', 'public');
    let filePath = '';
    if (req.url === '/' || req.url === '') {
        filePath = path.join(publicDir, 'index.html');
    }
    else {
        filePath = path.join(publicDir, req.url || '');
    }
    const extname = path.extname(filePath);
    const contentTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json'
    };
    const contentType = contentTypes[extname] || 'text/plain';
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not found');
            }
            else {
                res.writeHead(500);
                res.end('Server error');
            }
        }
        else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});
// WebSocket Server
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
    const wsId = Math.random().toString(36).substring(7);
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleMessage(ws, wsId, message);
        }
        catch (e) {
            console.error('Failed to parse message:', e);
        }
    });
    ws.on('close', () => {
        const conn = connections.get(wsId);
        if (conn) {
            const room = rooms.get(conn.roomCode);
            if (room) {
                // Notify other player
                broadcastToRoom(conn.roomCode, {
                    type: 'player_disconnected',
                    playerId: conn.playerId
                });
            }
            connections.delete(wsId);
        }
    });
});
function handleMessage(ws, wsId, message) {
    const { type } = message;
    if (type === 'create_room') {
        const code = generateRoomCode();
        const seed = Math.floor(Math.random() * 1000000);
        const room = createRoom(code, seed);
        rooms.set(code, room);
        const playerId = `player-${Math.random().toString(36).substring(7)}`;
        const player = createPlayer(playerId, message.name || 'Player');
        room.players.set(playerId, player);
        connections.set(wsId, { ws, roomCode: code, playerId });
        startPrepPhase(room, PREP_DURATION);
        ws.send(JSON.stringify({
            type: 'room_joined',
            roomCode: code,
            playerId,
            state: getRoomState(room)
        }));
        setTimeout(() => handlePhaseTransition(room), PREP_DURATION + 100);
    }
    else if (type === 'join_room') {
        const { code, name } = message;
        const room = rooms.get(code);
        if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            return;
        }
        if (room.players.size >= 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
            return;
        }
        const playerId = `player-${Math.random().toString(36).substring(7)}`;
        const player = createPlayer(playerId, name || 'Player');
        room.players.set(playerId, player);
        connections.set(wsId, { ws, roomCode: code, playerId });
        ws.send(JSON.stringify({
            type: 'room_joined',
            roomCode: code,
            playerId,
            state: getRoomState(room)
        }));
        broadcastToRoom(code, {
            type: 'room_state',
            state: getRoomState(room)
        });
    }
    else {
        // All other commands require existing connection
        const conn = connections.get(wsId);
        if (!conn) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not connected to room' }));
            return;
        }
        const room = rooms.get(conn.roomCode);
        if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            return;
        }
        const player = room.players.get(conn.playerId);
        if (!player) {
            ws.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
            return;
        }
        handlePlayerAction(room, player, message);
    }
}
function handlePlayerAction(room, player, message) {
    const { type } = message;
    if (type === 'buy_unit') {
        if (room.phase !== 'PREP') {
            return;
        }
        const { unitIndex } = message;
        if (unitIndex < 0 || unitIndex >= player.shopOffers.length) {
            return;
        }
        const cost = getUnitCost();
        if (player.gold < cost) {
            return;
        }
        const unitType = player.shopOffers[unitIndex];
        const unit = createUnit(unitType);
        player.bench.push(unit);
        player.gold -= cost;
        player.shopOffers.splice(unitIndex, 1);
        broadcastToRoom(room.code, {
            type: 'room_state',
            state: getRoomState(room)
        });
    }
    else if (type === 'refresh_shop') {
        if (room.phase !== 'PREP' || player.refreshUsed) {
            return;
        }
        const cost = getRefreshCost();
        if (player.gold < cost) {
            return;
        }
        const rng = new RNG(room.seed + room.round + player.id.charCodeAt(0));
        player.shopOffers = generateShopOffers(rng, 3);
        player.gold -= cost;
        player.refreshUsed = true;
        broadcastToRoom(room.code, {
            type: 'room_state',
            state: getRoomState(room)
        });
    }
    else if (type === 'sell_unit') {
        if (room.phase !== 'PREP') {
            return;
        }
        const { unitId, fromBoard } = message;
        if (fromBoard) {
            const index = player.board.findIndex(u => u.id === unitId);
            if (index >= 0) {
                player.board.splice(index, 1);
                player.gold += getSellValue();
            }
        }
        else {
            const index = player.bench.findIndex(u => u.id === unitId);
            if (index >= 0) {
                player.bench.splice(index, 1);
                player.gold += getSellValue();
            }
        }
        broadcastToRoom(room.code, {
            type: 'room_state',
            state: getRoomState(room)
        });
    }
    else if (type === 'place_unit') {
        if (room.phase !== 'PREP') {
            return;
        }
        const { unitId, x, y } = message;
        // Validate position
        if (x < 0 || x >= 6 || y < 0 || y >= 4) {
            return;
        }
        // Check if cell occupied
        if (player.board.some(u => u.position.x === x && u.position.y === y)) {
            return;
        }
        // Find unit in bench
        const benchIndex = player.bench.findIndex(u => u.id === unitId);
        if (benchIndex >= 0) {
            const unit = player.bench[benchIndex];
            player.bench.splice(benchIndex, 1);
            player.board.push({
                ...unit,
                position: { x, y }
            });
        }
        broadcastToRoom(room.code, {
            type: 'room_state',
            state: getRoomState(room)
        });
    }
    else if (type === 'move_unit') {
        if (room.phase !== 'PREP') {
            return;
        }
        const { unitId, x, y } = message;
        // Validate position
        if (x < 0 || x >= 6 || y < 0 || y >= 4) {
            return;
        }
        const unit = player.board.find(u => u.id === unitId);
        if (!unit) {
            return;
        }
        // Check if cell occupied by different unit
        if (player.board.some(u => u.id !== unitId && u.position.x === x && u.position.y === y)) {
            return;
        }
        unit.position = { x, y };
        broadcastToRoom(room.code, {
            type: 'room_state',
            state: getRoomState(room)
        });
    }
    else if (type === 'remove_unit') {
        if (room.phase !== 'PREP') {
            return;
        }
        const { unitId } = message;
        const index = player.board.findIndex(u => u.id === unitId);
        if (index >= 0) {
            const unit = player.board[index];
            player.board.splice(index, 1);
            // Remove position and add back to bench
            const { position, ...benchUnit } = unit;
            player.bench.push(benchUnit);
        }
        broadcastToRoom(room.code, {
            type: 'room_state',
            state: getRoomState(room)
        });
    }
    else if (type === 'ready') {
        if (room.phase !== 'PREP') {
            return;
        }
        player.ready = true;
        broadcastToRoom(room.code, {
            type: 'room_state',
            state: getRoomState(room)
        });
        // Check if both ready
        const players = Array.from(room.players.values());
        if (players.length === 2 && players.every(p => p.ready)) {
            // End prep early
            room.phaseEndTime = Date.now();
            handlePhaseTransition(room);
        }
    }
    else if (type === 'restart') {
        if (!room.gameOver) {
            return;
        }
        resetRoom(room);
        startPrepPhase(room, PREP_DURATION);
        broadcastToRoom(room.code, {
            type: 'room_state',
            state: getRoomState(room)
        });
        setTimeout(() => handlePhaseTransition(room), PREP_DURATION + 100);
    }
}
// Phase transition timer
setInterval(() => {
    for (const room of rooms.values()) {
        handlePhaseTransition(room);
    }
}, 1000);
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map