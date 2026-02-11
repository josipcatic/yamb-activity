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

// Create initial game state based on number of players
function createInitialState(numPlayers, clientIds = []) {
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
      clientId: clientIds[i] || null,
      scores: {}
    }))
  };
}

// Roll the dice
function rollDice(state, clientId) {
  // Only allow if it's the current player's turn and they match the clientId
  if (!isClientsTurn(state, clientId)) {
    return state;
  }
  
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
function lockDice(state, index, clientId) {
  // Only allow if it's the current player's turn and they match the clientId
  if (!isClientsTurn(state, clientId)) {
    return state;
  }
  
  if (state.phase !== PHASES.ROLLING || state.rollsLeft === 3) {
    return state;
  }
  
  const newState = { ...state, locked: [...state.locked] };
  newState.locked[index] = !newState.locked[index];
  return newState;
}

// Check if the given clientId matches the current player
function isClientsTurn(state, clientId) {
  if (!state || !state.players[state.currentPlayer]) {
    return false;
  }
  return state.players[state.currentPlayer].clientId === clientId;
}

// Handle score selection
function selectScore(state, category, clientId) {
  // Only allow if it's the current player's turn and they match the clientId
  if (!isClientsTurn(state, clientId)) {
    return state;
  }
  
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
