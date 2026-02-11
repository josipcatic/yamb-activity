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

let gameState = null;

// Initialize game state based on number of players
function initializeGame(numPlayers) {
  gameState = {
    dice: [1, 1, 1, 1, 1],
    locked: [false, false, false, false, false],
    rollsLeft: 3,
    phase: "ROLLING", // ROLLING | SELECTING_SCORE
    currentPlayer: 0,
    numPlayers: numPlayers,
    players: Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: `Player ${i + 1}`,
      scores: {}
    }))
  };
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
          <div class="die ${gameState.locked[i] ? 'locked' : ''}" id="die-${i}">
            ${die}
          </div>
        `).join('')}
      </div>
      
      <button id="rollButton" class="roll-btn" ${gameState.phase !== "ROLLING" ? 'disabled' : ''}>
        ${gameState.phase === "ROLLING" ? "Roll Dice" : "Select a score"}
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
                      data-player="${playerIdx}"
                      ${isSelectable ? `onclick="handleScoreSelection('${category.id}')"` : ''}>
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

// Setup event listeners for game screen
function setupGameEventListeners() {
  const rollButton = document.getElementById('rollButton');
  if (rollButton && gameState.phase === "ROLLING") {
    rollButton.addEventListener('click', rollDice);
  }
  
  // Add click handlers for dice
  gameState.dice.forEach((_, i) => {
    const dieElement = document.getElementById(`die-${i}`);
    if (dieElement) {
      dieElement.addEventListener('click', () => lockDice(i));
    }
  });
}

// Roll the dice
function rollDice() {
  if (gameState.phase !== "ROLLING") return;
  
  for (let i = 0; i < 5; i++) {
    if (!gameState.locked[i] && gameState.rollsLeft > 0) {
      gameState.dice[i] = Math.floor(Math.random() * 6) + 1;
    }
  }
  
  if (gameState.rollsLeft > 0) {
    gameState.rollsLeft--;
  }
  
  // If no rolls left, switch to score selection phase
  if (gameState.rollsLeft === 0) {
    gameState.phase = "SELECTING_SCORE";
  }
  
  render();
}

// Lock/unlock a die
function lockDice(index) {
  if (gameState.phase !== "ROLLING" || gameState.rollsLeft === 3) return;
  
  gameState.locked[index] = !gameState.locked[index];
  render();
}

// Handle score selection
function handleScoreSelection(category) {
  const currentPlayer = gameState.players[gameState.currentPlayer];
  
  if (gameState.phase !== "SELECTING_SCORE") return;
  if (currentPlayer.scores[category] !== undefined) return;
  
  // Calculate score based on category and current dice
  let score = calculateScore(category);
  currentPlayer.scores[category] = score;
  
  // Move to next player
  gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.numPlayers;
  gameState.rollsLeft = 3;
  gameState.locked = [false, false, false, false, false];
  gameState.phase = "ROLLING";
  gameState.dice = [1, 1, 1, 1, 1];
  
  render();
}

// Calculate score for a category
function calculateScore(category) {
  const dice = [...gameState.dice].sort((a, b) => a - b);
  
  switch(category) {
    case 'ones': return dice.filter(d => d === 1).length;
    case 'twos': return dice.filter(d => d === 2).length * 2;
    case 'threes': return dice.filter(d => d === 3).length * 3;
    case 'fours': return dice.filter(d => d === 4).length * 4;
    case 'fives': return dice.filter(d => d === 5).length * 5;
    case 'sixes': return dice.filter(d => d === 6).length * 6;
    case 'threeKind': return hasNOfAKind(dice, 3) ? dice.reduce((a, b) => a + b, 0) : 0;
    case 'fourKind': return hasNOfAKind(dice, 4) ? dice.reduce((a, b) => a + b, 0) : 0;
    case 'fullHouse': return isFullHouse(dice) ? 25 : 0;
    case 'smallStraight': return isSmallStraight(dice) ? 30 : 0;
    case 'largeStraight': return isLargeStraight(dice) ? 40 : 0;
    case 'twoPair': return isTwoPair(dice) ? 25 : 0;
    case 'yahtzee': return isYahtzee(dice) ? 50 : 0;
    default: return 0;
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

// Initialize setup screen on load
document.addEventListener('DOMContentLoaded', () => {
  render();
});