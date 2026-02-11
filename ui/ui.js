// UI Layer - Handles all DOM manipulation and rendering
let gameState = null;

// Initialize game with players
function initializeGame(numPlayers) {
  gameState = createInitialState(numPlayers);
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
  
  return `
    <div class="container">
      <h1>Yahtzee</h1>
      
      <div class="game-info">
        <h2>Current Player: ${currentPlayer.name}</h2>
        <h3 id="rollsLeft">Rolls Left: ${gameState.rollsLeft}</h3>
      </div>

      <div class="dice-container">
        ${gameState.dice.map((die, i) => `
          <div class="die ${gameState.locked[i] ? 'locked' : ''}" id="die-${i}" data-die-index="${i}">
            ${die}
          </div>
        `).join('')}
      </div>
      
      <button id="rollButton" class="roll-btn" ${gameState.phase !== PHASES.ROLLING ? 'disabled' : ''}>
        ${gameState.phase === PHASES.ROLLING ? "Roll Dice" : "Select a score"}
      </button>

      <h2>Score Card</h2>
      <table class="scorecard">
        <thead>
          <tr>
            <th>Category</th>
            ${gameState.players.map((p, i) => `<th class="${i === gameState.currentPlayer ? 'active-player' : ''}">${p.name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${CATEGORIES.map(category => `
            <tr>
              <td>${category.label}</td>
              ${gameState.players.map((player, playerIdx) => {
                const score = player.scores[category.id];
                const isSelectable = gameState.phase === PHASES.SELECTING_SCORE && playerIdx === gameState.currentPlayer && score === undefined;
                return `
                  <td class="score-cell ${score !== undefined ? 'filled' : ''} ${isSelectable ? 'selectable' : ''}" 
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

// Setup event listeners for setup screen
function setupEventListeners() {
  document.querySelectorAll('.player-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const numPlayers = parseInt(e.target.getAttribute('data-players'));
      initializeGame(numPlayers);
    });
  });
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
  if (rollButton && gameState.phase === PHASES.ROLLING) {
    rollButton.addEventListener('click', () => {
      gameState = rollDice(gameState);
      render();
    });
  }
  
  // Dice click handlers with event delegation
  const diceContainer = document.querySelector('.dice-container');
  if (diceContainer) {
    diceContainer.addEventListener('click', (e) => {
      const die = e.target.closest('.die');
      if (die) {
        const index = parseInt(die.dataset.dieIndex);
        gameState = lockDice(gameState, index);
        render();
      }
    });
  }
  
  // Score cell click handlers with event delegation
  const scoreTable = document.querySelector('.scorecard');
  if (scoreTable) {
    scoreTable.addEventListener('click', (e) => {
      const cell = e.target.closest('.score-cell.selectable');
      if (cell) {
        const category = cell.dataset.category;
        gameState = selectScore(gameState, category);
        render();
      }
    });
  }
}

// Initialize setup screen on load
document.addEventListener('DOMContentLoaded', () => {
  render();
});
