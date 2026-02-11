// Game configuration
const CATEGORIES = [
  { id: 'ones', label: 'Ones' },
  { id: 'twos', label: 'Twos' },
  { id: 'threes', label: 'Threes' },
  { id: 'fours', label: 'Fours' },
  { id: 'fives', label: 'Fives' },
  { id: 'sixes', label: 'Sixes' },
  { id: 'threeKind', label: 'Three of a Kind' },
  { id: 'fourKind', label: 'Four of a Kind' },
  { id: 'fullHouse', label: 'Full House' },
  { id: 'smallStraight', label: 'Small Straight' },
  { id: 'largeStraight', label: 'Large Straight' },
  { id: 'twoPair', label: 'Two Pair' },
  { id: 'yahtzee', label: 'Yahtzee' }
];

const PHASES = {
  ROLLING: 'ROLLING',
  SELECTING_SCORE: 'SELECTING_SCORE',
  GAME_OVER: 'GAME_OVER'
};

let gameState = null;

// Create initial game state based on number of players
function createInitialState(numPlayers) {
  return {
    dice: [1, 1, 1, 1, 1],
    locked: [false, false, false, false, false],
    rollsLeft: 3,
    phase: PHASES.ROLLING,
    currentPlayer: 0,
    numPlayers: numPlayers,
    players: Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: `Player ${i + 1}`,
      scores: {}
    }))
  };
}

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
                const isSelectable = gameState.phase === "SELECTING_SCORE" && playerIdx === gameState.currentPlayer && score === undefined;
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

// Roll the dice
function rollDice(state) {
  if (state.phase !== PHASES.ROLLING) return state;

  const newDice = [...state.dice];

  for (let i = 0; i < 5; i++) {
    if (!state.locked[i] && state.rollsLeft > 0) {
      newDice[i] = Math.floor(Math.random() * 6) + 1;
    }
  }

  return {
    ...state,
    dice: newDice,
    rollsLeft: state.rollsLeft - 1,
    phase: state.rollsLeft - 1 === 0 ? PHASES.SELECTING_SCORE : state.phase
  };
}

// Lock/unlock a die
function lockDice(state, index) {
  if (state.phase !== PHASES.ROLLING || state.rollsLeft === 3) {
    return state;
  }
  
  const newState = { ...state, locked: [...state.locked] };
  newState.locked[index] = !newState.locked[index];
  return newState;
}

// Handle score selection
function selectScore(state, category) {
  const currentPlayer = state.players[state.currentPlayer];
  
  if (state.phase !== PHASES.SELECTING_SCORE) {
    return state;
  }
  if (currentPlayer.scores[category] !== undefined) {
    return state;
  }
  
  // Calculate score based on category and current dice
  const score = calculateScore(state.dice, category);
  
  const newState = { ...state };
  newState.players = newState.players.map((p, i) => 
    i === state.currentPlayer 
      ? { ...p, scores: { ...p.scores, [category]: score } }
      : p
  );
  
  // Move to next player
  newState.currentPlayer = (newState.currentPlayer + 1) % newState.numPlayers;
  newState.rollsLeft = 3;
  newState.locked = [false, false, false, false, false];
  newState.phase = PHASES.ROLLING;
  newState.dice = [1, 1, 1, 1, 1];
  
  return newState;
}

// Calculate score for a category
function calculateScore(dice, category) {
  const sortedDice = [...dice].sort((a, b) => a - b);
  
  switch(category) {
    case 'ones': 
      return sortedDice.filter(d => d === 1).length;
    case 'twos': 
      return sortedDice.filter(d => d === 2).length * 2;
    case 'threes': 
      return sortedDice.filter(d => d === 3).length * 3;
    case 'fours': 
      return sortedDice.filter(d => d === 4).length * 4;
    case 'fives': 
      return sortedDice.filter(d => d === 5).length * 5;
    case 'sixes': 
      return sortedDice.filter(d => d === 6).length * 6;
    case 'threeKind': 
      return hasNOfAKind(sortedDice, 3) ? sortedDice.reduce((a, b) => a + b, 0) : 0;
    case 'fourKind': 
      return hasNOfAKind(sortedDice, 4) ? sortedDice.reduce((a, b) => a + b, 0) : 0;
    case 'fullHouse': 
      return isFullHouse(sortedDice) ? 25 : 0;
    case 'smallStraight': 
      return isSmallStraight(sortedDice) ? 30 : 0;
    case 'largeStraight': 
      return isLargeStraight(sortedDice) ? 40 : 0;
    case 'twoPair': 
      return isTwoPair(sortedDice) ? 25 : 0;
    case 'yahtzee': 
      return isYahtzee(sortedDice) ? 50 : 0;
    default: 
      return 0;
  }
}

// Helper functions for scoring
function hasNOfAKind(dice, n) {
  for (let i = 1; i <= 6; i++) {
    if (dice.filter(d => d === i).length >= n) return true;
  }
  return false;
}

function isTwoPair(dice) {
  const counts = {};
  dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
  const pairs = Object.values(counts).filter(count => count >= 2);
  return pairs.length >= 2;
}

function isFullHouse(dice) {
  const counts = {};
  dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
  const values = Object.values(counts);
  return (values.includes(3) && values.includes(2)) || (values.includes(5));
}

function isSmallStraight(dice) {
  const unique = [...new Set(dice)].sort((a, b) => a - b);
  return unique.length >= 4 && (
    [1,2,3,4].every(n => unique.includes(n)) ||
    [2,3,4,5].every(n => unique.includes(n)) ||
    [3,4,5,6].every(n => unique.includes(n))
  );
}

function isLargeStraight(dice) {
  const unique = [...new Set(dice)].sort((a, b) => a - b);
  return (
    [1,2,3,4,5].every(n => unique.includes(n)) ||
    [2,3,4,5,6].every(n => unique.includes(n))
  );
}

function isYahtzee(dice) {
  return dice.every(d => d === dice[0]);
}

// Check if game is over (all cells filled)
function isGameOver(state) {
  return state.players.every(player => 
    CATEGORIES.every(category => player.scores[category.id] !== undefined)
  );
}

// Calculate total scores for each player
function calculatePlayerTotals(state) {
  return state.players.map(player => 
    CATEGORIES.reduce((total, category) => {
      return total + (player.scores[category.id] || 0);
    }, 0)
  );
}

// Find the winner (player with highest score)
function findWinner(totals) {
  let maxScore = -1;
  let winnerIndex = 0;
  totals.forEach((total, i) => {
    if (total > maxScore) {
      maxScore = total;
      winnerIndex = i;
    }
  });
  return winnerIndex;
}

// Initialize setup screen on load
document.addEventListener('DOMContentLoaded', () => {
  render();
});