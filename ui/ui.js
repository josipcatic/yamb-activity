// UI Layer - Handles all DOM manipulation and rendering
let gameState = null;
let broadcastChannel = null;
let clientId = null;

// Generate or retrieve client ID (unique per tab/session)
function getClientId() {
  if (clientId) return clientId;
  
  let stored = sessionStorage.getItem('yahtzee-session-id');
  if (!stored) {
    stored = crypto.randomUUID();
    sessionStorage.setItem('yahtzee-session-id', stored);
  }
  clientId = stored;
  return clientId;
}

// Initialize BroadcastChannel for multi-tab synchronization
function initBroadcastChannel() {
  if (broadcastChannel) return;
  
  try {
    broadcastChannel = new BroadcastChannel('yahtzee-game');
    broadcastChannel.addEventListener('message', (event) => {
      const { type, state } = event.data;
      if (type === 'STATE_UPDATE') {
        gameState = state;
        render();
      }
    });
  } catch (e) {
    console.warn('BroadcastChannel not supported:', e);
  }
}

// Broadcast state update to other tabs
function broadcastStateUpdate(newState) {
  // Save to localStorage as backup
  localStorage.setItem('yahtzee-game-state', JSON.stringify(newState));
  
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STATE_UPDATE', state: newState });
  }
}

// Restore game state from localStorage if available
function restoreGameState() {
  try {
    const saved = localStorage.getItem('yahtzee-game-state');
    if (saved) {
      gameState = JSON.parse(saved);
      getClientId();
      initBroadcastChannel();
      
      // Check if this client is already assigned to a player
      const clientAssigned = gameState.players.some(p => p.clientId === clientId);
      
      // If not assigned, assign to first available player (with null clientId)
      if (!clientAssigned) {
        for (let i = 0; i < gameState.players.length; i++) {
          if (!gameState.players[i].clientId) {
            gameState.players[i].clientId = clientId;
            broadcastStateUpdate(gameState);
            break;
          }
        }
      }
      
      render();
      return true;
    }
  } catch (e) {
    console.warn('Failed to restore game state:', e);
  }
  return false;
}

// Initialize game with players
function initializeGame(numPlayers) {
  getClientId();
  initBroadcastChannel();
  
  // Create array of clientIds for all players
  // First player gets this client's ID, others get null initially
  const clientIds = Array(numPlayers).fill(null);
  clientIds[0] = clientId;
  
  gameState = createInitialState(numPlayers, clientIds);
  broadcastStateUpdate(gameState);
  render();
}

// Render entire UI
function render() {
  const app = document.getElementById('app');
  
  if (!gameState) {
    app.innerHTML = renderSetup();
    setupEventListeners();
    return;
  }
  
  if (isGameOver(gameState)) {
    app.innerHTML = renderGameOver();
    setupGameOverEventListeners();
    return;
  }
  
  app.innerHTML = renderGame();
  setupGameEventListeners();
}

// Render setup screen to select number of players
function renderSetup() {
  return `
    <div class="container">
      <h1>Yahtzee</h1>
      <p>Select number of players:</p>
      <div class="player-selection">
        <button class="player-btn" data-players="1">1 Player</button>
        <button class="player-btn" data-players="2">2 Players</button>
        <button class="player-btn" data-players="3">3 Players</button>
        <button class="player-btn" data-players="4">4 Players</button>
        <button class="player-btn" data-players="5">5 Players</button>
        <button class="player-btn" data-players="6">6 Players</button>
      </div>
      <div class="debug-section">
        <button id="debugBtn" class="debug-btn">🐛 Simulate 2 Players</button>
      </div>
    </div>
  `;
}

// Render game over screen
function renderGameOver() {
  const totals = calculatePlayerTotals(gameState);
  const winner = findWinner(totals);
  const sortedPlayers = gameState.players.map((p, i) => ({
    ...p,
    total: totals[i]
  })).sort((a, b) => b.total - a.total);
  
  return `
    <div class="container">
      <h1>Game Over!</h1>
      
      <div class="game-over-results">
        <div class="winner-section">
          <h2>🎉 ${gameState.players[winner].name} Wins! 🎉</h2>
          <h3>Final Score: ${totals[winner]}</h3>
        </div>
        
        <div class="leaderboard">
          <h3>Final Scores</h3>
          <table class="scorecard">
            <thead>
              <tr>
                <th>Position</th>
                <th>Player</th>
                <th>Total Score</th>
              </tr>
            </thead>
            <tbody>
              ${sortedPlayers.map((p, i) => `
                <tr class="${i === 0 ? 'winner-row' : ''}">
                  <td>${i + 1}</td>
                  <td>${p.name}</td>
                  <td><strong>${p.total}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <button id="playAgainBtn" class="roll-btn">Play Again</button>
      </div>
    </div>
  `;
}

// Render game screen
function renderGame() {
  const currentPlayer = gameState.players[gameState.currentPlayer];
  const myTurn = isMyTurn();
  
  return `
    <div class="container">
      <h1>Yahtzee</h1>
      
      <div class="game-info">
        <h2>Current Player: ${currentPlayer.name}</h2>
        ${myTurn ? `<h3 id="rollsLeft">Rolls Left: ${gameState.rollsLeft}</h3>` : `<h3 class="waiting">⏳ Waiting for ${currentPlayer.name}...</h3>`}
      </div>

      <div class="dice-container">
        ${gameState.dice.map((die, i) => `
          <div class="die ${gameState.locked[i] ? 'locked' : ''} ${!myTurn ? 'disabled' : ''}" id="die-${i}" data-die-index="${i}">
            ${die}
          </div>
        `).join('')}
      </div>
      
      <button id="rollButton" class="roll-btn" ${!myTurn || gameState.phase !== PHASES.ROLLING ? 'disabled' : ''}>
        ${myTurn ? (gameState.phase === PHASES.ROLLING ? "Roll Dice" : "Select a score") : "Waiting for turn..."}
      </button>

      <h2>Score Card</h2>
      <table class="scorecard">
        <thead>
          <tr>
            <th>Category</th>
            ${gameState.players.map((p, i) => `<th class="${i === gameState.currentPlayer ? 'active-player' : ''} ${p.clientId === clientId ? 'your-column' : ''}">${p.name}${p.clientId === clientId ? ' (You)' : ''}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${CATEGORIES.map(category => `
            <tr>
              <td>${category.label}</td>
              ${gameState.players.map((player, playerIdx) => {
                const score = player.scores[category.id];
                const isSelectable = gameState.phase === PHASES.SELECTING_SCORE && playerIdx === gameState.currentPlayer && score === undefined && myTurn;
                return `
                  <td class="score-cell ${score !== undefined ? 'filled' : ''} ${isSelectable ? 'selectable' : ''} ${!myTurn ? 'disabled' : ''}" 
                      data-category="${category.id}" 
                      data-player="${playerIdx}">
                    ${score !== undefined ? score : ''}
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Check if current client is the active player
function isMyTurn() {
  if (!gameState || !gameState.players[gameState.currentPlayer]) {
    return false;
  }
  return gameState.players[gameState.currentPlayer].clientId === clientId;
}

// Setup event listeners for setup screen
function setupEventListeners() {
  document.querySelectorAll('.player-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const numPlayers = parseInt(e.target.getAttribute('data-players'));
      initializeGame(numPlayers);
    });
  });
  
  // Debug button for testing multiplayer
  const debugBtn = document.getElementById('debugBtn');
  if (debugBtn) {
    debugBtn.addEventListener('click', () => {
      initializeGame(2);
    });
  }
}

// Setup event listeners for game over screen
function setupGameOverEventListeners() {
  const playAgainBtn = document.getElementById('playAgainBtn');
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      gameState = null;
      localStorage.removeItem('yahtzee-game-state');
      render();
    });
  }
}

// Setup event listeners for game screen
function setupGameEventListeners() {
  const rollButton = document.getElementById('rollButton');
  
  // Roll button handler
  if (rollButton && gameState.phase === PHASES.ROLLING && isMyTurn()) {
    rollButton.addEventListener('click', () => {
      gameState = rollDice(gameState, clientId);
      broadcastStateUpdate(gameState);
      render();
    });
  }
  
  // Dice click handlers with event delegation
  const diceContainer = document.querySelector('.dice-container');
  if (diceContainer && isMyTurn()) {
    diceContainer.addEventListener('click', (e) => {
      const die = e.target.closest('.die');
      if (die && !die.classList.contains('disabled')) {
        const index = parseInt(die.dataset.dieIndex);
        gameState = lockDice(gameState, index, clientId);
        broadcastStateUpdate(gameState);
        render();
      }
    });
  }
  
  // Score cell click handlers with event delegation
  const scoreTable = document.querySelector('.scorecard');
  if (scoreTable && isMyTurn()) {
    scoreTable.addEventListener('click', (e) => {
      const cell = e.target.closest('.score-cell.selectable');
      if (cell && !cell.classList.contains('disabled')) {
        const category = cell.dataset.category;
        gameState = selectScore(gameState, category, clientId);
        broadcastStateUpdate(gameState);
        render();
      }
    });
  }
}

// Initialize setup screen on load
document.addEventListener('DOMContentLoaded', () => {
  // Try to restore game state from another tab
  if (!restoreGameState()) {
    // No saved state, show setup
    render();
  }
});
