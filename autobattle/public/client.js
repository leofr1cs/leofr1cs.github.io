// Client-side WebSocket and rendering

const GRID_COLS = 6;
const GRID_ROWS = 4;
const CELL_SIZE = 100;

let ws = null;
let gameState = null;
let myPlayerId = null;
let roomCode = null;
let draggedUnit = null;
let dragSource = null; // 'bench' or 'board'

const UNIT_COLORS = {
  'Tank': '#8B4513',
  'Fighter': '#DC143C',
  'Archer': '#228B22',
  'Assassin': '#9400D3',
  'Mage': '#4169E1',
  'Guard': '#FFD700'
};

// Connect to WebSocket
function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);
  
  ws.onopen = () => {
    console.log('Connected to server');
  };
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleServerMessage(message);
  };
  
  ws.onclose = () => {
    console.log('Disconnected from server');
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

function send(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function handleServerMessage(message) {
  console.log('Received:', message.type);
  
  if (message.type === 'room_joined') {
    roomCode = message.roomCode;
    myPlayerId = message.playerId;
    gameState = message.state;
    
    showGame();
    updateUI();
  } else if (message.type === 'room_state') {
    gameState = message.state;
    updateUI();
  } else if (message.type === 'phase_update') {
    if (gameState) {
      gameState.phase = message.phase;
      gameState.phaseEndTime = message.phaseEndTime;
      updateUI();
    }
  } else if (message.type === 'combat_complete') {
    if (gameState) {
      gameState.combatLog = message.result.log;
      updateCombatLog();
    }
  } else if (message.type === 'game_over') {
    showGameOver(message.winner);
  } else if (message.type === 'player_disconnected') {
    document.getElementById('opponentStatus').textContent = 'Opponent disconnected';
  } else if (message.type === 'error') {
    alert(message.message);
  }
}

function showGame() {
  document.getElementById('lobby').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
  document.getElementById('roomCode').textContent = roomCode;
}

function updateUI() {
  if (!gameState) return;
  
  // Update phase and timer
  document.getElementById('phase').textContent = gameState.phase;
  document.getElementById('round').textContent = gameState.round;
  
  const timeLeft = Math.max(0, Math.ceil((gameState.phaseEndTime - Date.now()) / 1000));
  document.getElementById('timer').textContent = timeLeft;
  
  // Update player stats
  const me = gameState.players.find(p => p.id === myPlayerId);
  const opponent = gameState.players.find(p => p.id !== myPlayerId);
  
  if (me) {
    document.getElementById('player1Stats').innerHTML = `<strong>${me.name}</strong>: ${me.hp} HP`;
    document.getElementById('gold').textContent = me.gold;
    
    // Update shop
    updateShop(me);
    
    // Update bench
    updateBench(me);
    
    // Update ready button
    const readyBtn = document.getElementById('readyBtn');
    if (gameState.phase === 'PREP') {
      readyBtn.disabled = me.ready;
      readyBtn.textContent = me.ready ? 'Ready ✓' : 'Ready';
      readyBtn.classList.remove('hidden');
    } else {
      readyBtn.classList.add('hidden');
    }
    
    // Update refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (gameState.phase === 'PREP') {
      refreshBtn.disabled = me.refreshUsed || me.gold < 1;
    } else {
      refreshBtn.disabled = true;
    }
  }
  
  if (opponent) {
    document.getElementById('player2Stats').innerHTML = `<strong>${opponent.name}</strong>: ${opponent.hp} HP`;
    document.getElementById('opponentStatus').textContent = 'Opponent connected';
  }
  
  // Update boards
  if (me && opponent) {
    renderBoard('yourBoard', me.board, true);
    renderBoard('opponentBoard', opponent.board, false);
  }
  
  // Update combat log
  updateCombatLog();
  
  // Show/hide game over
  if (gameState.gameOver) {
    document.getElementById('restartBtn').classList.remove('hidden');
  }
}

function updateShop(player) {
  const shopEl = document.getElementById('shop');
  shopEl.innerHTML = '';
  
  player.shopOffers.forEach((unitType, index) => {
    const offer = document.createElement('div');
    offer.className = 'shop-offer';
    offer.innerHTML = `
      <span>${unitType}</span>
      <button onclick="buyUnit(${index})">Buy (1g)</button>
    `;
    shopEl.appendChild(offer);
  });
}

function updateBench(player) {
  const benchEl = document.getElementById('bench');
  benchEl.innerHTML = '';
  
  player.bench.forEach(unit => {
    const unitEl = document.createElement('div');
    unitEl.className = 'bench-unit';
    unitEl.textContent = `${unit.type} (${unit.hp})`;
    unitEl.draggable = true;
    unitEl.dataset.unitId = unit.id;
    
    unitEl.ondragstart = (e) => {
      if (gameState.phase !== 'PREP') {
        e.preventDefault();
        return;
      }
      draggedUnit = unit;
      dragSource = 'bench';
      e.dataTransfer.effectAllowed = 'move';
    };
    
    unitEl.ondragend = () => {
      draggedUnit = null;
      dragSource = null;
    };
    
    // Right-click to sell
    unitEl.oncontextmenu = (e) => {
      e.preventDefault();
      if (gameState.phase === 'PREP') {
        send({ type: 'sell_unit', unitId: unit.id, fromBoard: false });
      }
    };
    
    benchEl.appendChild(unitEl);
  });
}

function updateCombatLog() {
  if (!gameState) return;
  
  const logEl = document.getElementById('combatLog');
  logEl.innerHTML = '';
  
  gameState.combatLog.slice(-20).forEach(entry => {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.textContent = entry;
    logEl.appendChild(logEntry);
  });
  
  logEl.scrollTop = logEl.scrollHeight;
}

function renderBoard(canvasId, units, isMyBoard) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid
  ctx.strokeStyle = '#4ecca3';
  ctx.lineWidth = 1;
  
  for (let x = 0; x <= GRID_COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, GRID_ROWS * CELL_SIZE);
    ctx.stroke();
  }
  
  for (let y = 0; y <= GRID_ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL_SIZE);
    ctx.lineTo(GRID_COLS * CELL_SIZE, y * CELL_SIZE);
    ctx.stroke();
  }
  
  // Draw units
  units.forEach(unit => {
    if (!unit.position) return;
    
    const x = unit.position.x * CELL_SIZE + CELL_SIZE / 2;
    const y = unit.position.y * CELL_SIZE + CELL_SIZE / 2;
    
    // Draw circle
    ctx.fillStyle = UNIT_COLORS[unit.type] || '#888';
    ctx.beginPath();
    ctx.arc(x, y, 35, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = unit.alive ? '#fff' : '#444';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw type text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unit.type, x, y - 10);
    
    // Draw HP
    ctx.font = '14px Arial';
    ctx.fillText(`HP: ${unit.hp}`, x, y + 10);
  });
  
  // Setup drag and drop for my board
  if (isMyBoard) {
    canvas.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };
    
    canvas.ondrop = (e) => {
      e.preventDefault();
      if (!draggedUnit || gameState.phase !== 'PREP') return;
      
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
      const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
      
      if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
        if (dragSource === 'bench') {
          send({ type: 'place_unit', unitId: draggedUnit.id, x, y });
        } else if (dragSource === 'board') {
          send({ type: 'move_unit', unitId: draggedUnit.id, x, y });
        }
      }
    };
    
    // Make units on board draggable
    canvas.onmousedown = (e) => {
      if (gameState.phase !== 'PREP') return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const me = gameState.players.find(p => p.id === myPlayerId);
      if (!me) return;
      
      for (const unit of me.board) {
        const unitX = unit.position.x * CELL_SIZE + CELL_SIZE / 2;
        const unitY = unit.position.y * CELL_SIZE + CELL_SIZE / 2;
        const dist = Math.sqrt((mouseX - unitX) ** 2 + (mouseY - unitY) ** 2);
        
        if (dist < 35) {
          // Right-click to remove/sell
          if (e.button === 2) {
            e.preventDefault();
            if (confirm('Sell this unit for 1 gold?')) {
              send({ type: 'sell_unit', unitId: unit.id, fromBoard: true });
            }
          } else {
            // Left-click to drag
            draggedUnit = unit;
            dragSource = 'board';
            
            // Simple drag implementation
            const dragImg = document.createElement('div');
            dragImg.style.position = 'absolute';
            dragImg.style.left = '-9999px';
            document.body.appendChild(dragImg);
            
            const moveHandler = (moveEvent) => {
              // Visual feedback could be added here
            };
            
            const upHandler = (upEvent) => {
              document.removeEventListener('mousemove', moveHandler);
              document.removeEventListener('mouseup', upHandler);
              document.body.removeChild(dragImg);
              
              const finalRect = canvas.getBoundingClientRect();
              const finalX = Math.floor((upEvent.clientX - finalRect.left) / CELL_SIZE);
              const finalY = Math.floor((upEvent.clientY - finalRect.top) / CELL_SIZE);
              
              if (finalX >= 0 && finalX < GRID_COLS && finalY >= 0 && finalY < GRID_ROWS) {
                send({ type: 'move_unit', unitId: draggedUnit.id, x: finalX, y: finalY });
              } else {
                // Dragged outside - remove from board
                send({ type: 'remove_unit', unitId: draggedUnit.id });
              }
              
              draggedUnit = null;
              dragSource = null;
            };
            
            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
          }
          break;
        }
      }
    };
    
    canvas.oncontextmenu = (e) => {
      e.preventDefault();
    };
  }
}

function showGameOver(winner) {
  const gameOverEl = document.getElementById('gameOver');
  const messageEl = document.getElementById('gameOverMessage');
  
  if (winner === 'draw') {
    messageEl.textContent = 'Game Over - Draw!';
  } else if (winner === myPlayerId) {
    messageEl.textContent = 'You Win!';
  } else {
    messageEl.textContent = 'You Lose!';
  }
  
  gameOverEl.classList.remove('hidden');
}

// UI Actions
function buyUnit(index) {
  send({ type: 'buy_unit', unitIndex: index });
}

document.getElementById('createBtn').onclick = () => {
  const name = document.getElementById('createName').value || 'Player 1';
  send({ type: 'create_room', name });
};

document.getElementById('joinBtn').onclick = () => {
  const name = document.getElementById('joinName').value || 'Player 2';
  const code = document.getElementById('joinCode').value.toUpperCase();
  if (!code) {
    alert('Please enter a room code');
    return;
  }
  send({ type: 'join_room', code, name });
};

document.getElementById('refreshBtn').onclick = () => {
  send({ type: 'refresh_shop' });
};

document.getElementById('readyBtn').onclick = () => {
  send({ type: 'ready' });
};

document.getElementById('restartBtn').onclick = () => {
  send({ type: 'restart' });
  document.getElementById('gameOver').classList.add('hidden');
  document.getElementById('restartBtn').classList.add('hidden');
};

// Update timer continuously
setInterval(() => {
  if (gameState && !gameState.gameOver) {
    const timeLeft = Math.max(0, Math.ceil((gameState.phaseEndTime - Date.now()) / 1000));
    document.getElementById('timer').textContent = timeLeft;
  }
}, 100);

// Initialize
connect();
