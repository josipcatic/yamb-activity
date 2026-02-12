// UI Layer - Handles all DOM manipulation and rendering
let gameState = null;
let discordSdk = null;
let clientId = null;

// Initialize Discord SDK
async function initDiscordSdk() {
  try {
    // Check if Discord SDK is available globally
    if (typeof window.DiscordSDK !== 'undefined') {
      discordSdk = window.DiscordSDK;
      
      // Get current user and set clientId
      const user = await discordSdk.commands.getUser();
      clientId = user.id;
      
      // Subscribe to activity instance state updates
      discordSdk.subscribe('ACTIVITY_INSTANCE_STATE_UPDATE', (data) => {
        if (data.state) {
          gameState = data.state;
          render();
        }
      });
      
      return true;
    }
  } catch (e) {
    console.warn('Discord SDK not available:', e);
  }
  return false;
}

// Get client ID (from Discord SDK)
function getClientId() {
  return clientId;
}

// Update game state in Discord activity instance
async function broadcastStateUpdate(newState) {
  try {
    if (discordSdk) {
      await discordSdk.commands.setActivityInstanceState({
        state: newState
      });
    }
  } catch (e) {
    console.warn('Failed to update activity instance state:', e);
  }
}

// Restore game state from Discord activity instance
async function restoreGameState() {
  try {
    if (discordSdk) {
      const state = await discordSdk.commands.getActivityInstanceState();
      if (state && state.version === 2) {
        gameState = state;
        render();
        return true;
      }
    }
  } catch (e) {}
  return false;
}
// Initialize game with participants from Discord
async function initializeGame() {
  try {
    if (!discordSdk) {
      console.error('Discord SDK not initialized');
      return;
    }
    
    // Get participants from Discord
    const participants = await discordSdk.commands.getActivityInstanceParticipants();
    if (!participants || participants.length === 0) {
      console.error('No participants found');
      return;
    }
    
    // Sort participants (by user ID for consistency)
    const sortedParticipants = [...participants].sort((a, b) => a.id.localeCompare(b.id));
    
    // Create player list with Discord user IDs
    const numPlayers = sortedParticipants.length;
    const clientIds = sortedParticipants.map(p => p.id);
    const playerNames = sortedParticipants.map(p => p.username || `Player ${p.id}`);
    
    // Create initial state
    gameState = {
      version: 2,
      ...createInitialState(numPlayers, clientIds)

    };
    
    // Update player names from Discord
    gameState.players = gameState.players.map((p, i) => ({
      ...p,
      name: playerNames[i],
      clientId: clientIds[i]
    }));
    
    // Broadcast to all participants
    await broadcastStateUpdate(gameState);
    render();
  } catch (e) {
    console.error('Failed to initialize game:', e);
  }
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

// Render setup screen
function renderSetup() {
  return `
    <div class="container">
      <h1>Yahtzee</h1>
      <p>Discord Activity - Ready to play!</p>
      <div class="player-selection">
        <button id="startGameBtn" class="player-btn">Start Game</button>
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
  const startGameBtn = document.getElementById('startGameBtn');
  if (startGameBtn) {
    startGameBtn.addEventListener('click', () => {
      initializeGame();
    });
  }
}

// Setup event listeners for game over screen
function setupGameOverEventListeners() {
  const playAgainBtn = document.getElementById('playAgainBtn');
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      gameState = null;
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

// Initialize Discord SDK and setup game on load
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Discord SDK
  const sdkReady = await initDiscordSdk();
  await discordSdk.commands.setActivityInstanceState({ state: null });

  
  if (sdkReady) {
    // Try to restore game state from Discord activity instance
    if (!await restoreGameState()) {
      // No saved state, show setup
      render();
    }
  } else {
    console.error('Failed to initialize Discord SDK');
    document.getElementById('app').innerHTML = '<p>Error: Discord SDK not available</p>';
  }
});
