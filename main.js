const gameState = {
  dice: [1, 1, 1, 1, 1],
  locked: [false, false, false, false, false],
  rollsLeft: 3,
  phase: "ROLLING", // ROLLING | SELECTING_SCORE
  currentPlayer: 0,
  scores: {
    0: {}, // Player 1
    1: {}, // Player 2
    2: {}  // Player 3
  }
};

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
    if (gameState.phase !== "SELECTING_SCORE") return;
    enableScoreCells();
  }
  updateDisplay();
}


function lockDice(index) {
  if(gameState.rollsLeft === 3) return;
  gameState.locked[index] = !gameState.locked[index];
  const dieElement = document.getElementById(`die-${index + 1}`);
  dieElement.style.backgroundColor = gameState.locked[index] ? 'lightgray' : "white";
  updateDisplay();
}


// Update the display
function updateDisplay() {
  for (let i = 0; i < 5; i++) {
    const dieElement = document.getElementById(`die-${i + 1}`);
    dieElement.textContent = gameState.dice[i];
  }
  document.getElementById('rollsLeft').textContent = `Rolls Left: ${gameState.rollsLeft}`;
  updateScoreCardDisplay();
}

function enableScoreCells() {
  const cells = document.querySelectorAll('.score-cell');
  cells.forEach(cell => {
    const player = parseInt(cell.getAttribute('data-player'));
    const category = cell.getAttribute('data-category');
    
    // Only enable empty cells for current player
    if (player === gameState.currentPlayer && !gameState.scores[player][category]) {
      cell.classList.add('selectable');
    }
  });
}

function disableScoreCells() {
  const cells = document.querySelectorAll('.score-cell.selectable');
  cells.forEach(cell => cell.classList.remove('selectable'));
}

function updateScoreCardDisplay() {
  const cells = document.querySelectorAll('.score-cell');
  cells.forEach(cell => {
    const player = parseInt(cell.getAttribute('data-player'));
    const category = cell.getAttribute('data-category');
    
    if (gameState.scores[player] && gameState.scores[player][category] !== undefined) {
      cell.textContent = gameState.scores[player][category];
      cell.classList.add('filled');
    }
  });
}

function handleScoreSelection(cell) {
  if (!cell.classList.contains('selectable')) return;
  
  const player = parseInt(cell.getAttribute('data-player'));
  const category = cell.getAttribute('data-category');
  
  // Calculate score based on category and current dice
  let score = calculateScore(category);
  
  gameState.scores[player][category] = score;
  cell.textContent = score;
  cell.classList.add('filled');
  cell.classList.remove('selectable');
  
  // Reset for next round
  disableScoreCells();
  gameState.rollsLeft = 3;
  gameState.locked = [false, false, false, false, false];
  gameState.phase = "ROLLING";
  gameState.currentPlayer = (gameState.currentPlayer + 1) % 3;
  
  // Reset dice display
  for (let i = 0; i < 5; i++) {
    document.getElementById(`die-${i + 1}`).style.backgroundColor = "white";
  }
  gameState.dice = [1, 1, 1, 1, 1];
  
  updateDisplay();
}

function calculateScore(category) {
  const dice = gameState.dice.sort((a, b) => a - b);
  
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
  const unique = [...new Set(dice)].sort();
  return unique.length >= 4 && (
    [1,2,3,4].every(n => unique.includes(n)) ||
    [2,3,4,5].every(n => unique.includes(n)) ||
    [3,4,5,6].every(n => unique.includes(n))
  );
}

function isLargeStraight(dice) {
  const unique = [...new Set(dice)].sort();
  return (
    [1,2,3,4,5].every(n => unique.includes(n)) ||
    [2,3,4,5,6].every(n => unique.includes(n))
  );
}

function isYahtzee(dice) {
  return dice.every(d => d === dice[0]);
}

// Initialize the button
document.addEventListener('DOMContentLoaded', () => {
  const rollButton = document.getElementById('rollButton');
  rollButton.addEventListener('click', rollDice);
  
  // Add click handlers for dice
  for (let i = 0; i < 5; i++) {
    const dieButton = document.getElementById(`die-${i + 1}`);
    dieButton.addEventListener('click', () => lockDice(i));
  }
  
  // Add click handlers for score cells
  const scoreCells = document.querySelectorAll('.score-cell');
  scoreCells.forEach(cell => {
    cell.addEventListener('click', () => handleScoreSelection(cell));
  });
  
  
});