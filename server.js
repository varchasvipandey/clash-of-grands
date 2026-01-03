const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const { GAME_CONSTANTS, PASA_SET, DEVTA_CARDS } = require('./js/gameData.js');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Game state management
const waitingPlayers = [];
const activeGames = new Map();

// Helper function to generate pasa set for a player
function generatePasaSet() {
  return JSON.parse(JSON.stringify(PASA_SET));
}

// Helper function to roll dice
function rollPasa(pasaList) {
  return pasaList.map(pasa => {
    const randomFaceIndex = Math.floor(Math.random() * pasa.faces.length);
    return {
      pasaId: pasa.id,
      face: pasa.faces[randomFaceIndex]
    };
  });
}

// Helper function to assign random Devta cards (no duplicates)
function assignDevtaCards() {
  const shuffled = [...DEVTA_CARDS].sort(() => Math.random() - 0.5);
  return {
    player1: shuffled[0],
    player2: shuffled[1]
  };
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Handle player profile setup
  socket.on('player-ready', (playerData) => {
    socket.playerData = playerData;
    console.log('Player ready:', playerData.username);
  });

  // Handle matchmaking
  socket.on('find-match', () => {
    if (waitingPlayers.length > 0) {
      // Match found
      const opponent = waitingPlayers.shift();
      const gameId = `game-${socket.id}-${opponent.id}`;
      
      // Initialize game state
      const devtaCards = assignDevtaCards();
      const gameState = {
        id: gameId,
        players: {
          player1: {
            id: socket.id,
            username: socket.playerData.username,
            avatar: socket.playerData.avatar,
            health: GAME_CONSTANTS.STARTING_HEALTH,
            tokens: GAME_CONSTANTS.STARTING_TOKENS,
            pasaSet: generatePasaSet(),
            devtaCard: devtaCards.player1,
            selectedPasa: [],
            rollCount: 0
          },
          player2: {
            id: opponent.id,
            username: opponent.playerData.username,
            avatar: opponent.playerData.avatar,
            health: GAME_CONSTANTS.STARTING_HEALTH,
            tokens: GAME_CONSTANTS.STARTING_TOKENS,
            pasaSet: generatePasaSet(),
            devtaCard: devtaCards.player2,
            selectedPasa: [],
            rollCount: 0
          }
        },
        phase: 'toss',
        currentTurn: null,
        firstPlayer: null,
        tossChoices: {},
        devtaSelection: {}
      };

      activeGames.set(gameId, gameState);
      
      // Join both players to game room
      socket.join(gameId);
      opponent.join(gameId);
      
      // Store game ID in socket
      socket.gameId = gameId;
      opponent.gameId = gameId;

      // Notify both players
      io.to(socket.id).emit('match-found', {
        gameId,
        playerRole: 'player1',
        opponent: {
          username: opponent.playerData.username,
          avatar: opponent.playerData.avatar
        }
      });

      io.to(opponent.id).emit('match-found', {
        gameId,
        playerRole: 'player2',
        opponent: {
          username: socket.playerData.username,
          avatar: socket.playerData.avatar
        }
      });

      // Start coin toss
      setTimeout(() => {
        io.to(gameId).emit('start-toss');
      }, 1000);

    } else {
      // Add to waiting queue
      waitingPlayers.push(socket);
      socket.emit('waiting-for-match');
    }
  });

  // Handle coin toss selection
  socket.on('toss-choice', (choice) => {
    const gameId = socket.gameId;
    const game = activeGames.get(gameId);
    
    if (!game) return;

    game.tossChoices[socket.id] = choice;

    // If both players have chosen (or one chose and auto-assign other)
    const playerIds = [game.players.player1.id, game.players.player2.id];
    const otherPlayerId = playerIds.find(id => id !== socket.id);

    if (!game.tossChoices[otherPlayerId]) {
      // Auto-assign opposite choice to other player
      game.tossChoices[otherPlayerId] = choice === 'heads' ? 'tails' : 'heads';
      io.to(otherPlayerId).emit('toss-auto-assigned', game.tossChoices[otherPlayerId]);
    }

    // Perform toss
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const winnerId = Object.keys(game.tossChoices).find(
      id => game.tossChoices[id] === result
    );

    game.firstPlayer = winnerId;
    game.currentTurn = winnerId;

    // Broadcast result after animation delay
    setTimeout(() => {
      io.to(gameId).emit('toss-result', {
        result,
        winnerId,
        firstPlayer: winnerId
      });

      // Start Phase 1 after players acknowledge
      game.phase = 'ran-neeti';
    }, 3000);
  });

  // Handle "Let's Play" button click
  socket.on('ready-to-play', () => {
    const gameId = socket.gameId;
    const game = activeGames.get(gameId);
    
    if (!game) return;

    if (!game.playersReady) game.playersReady = [];
    game.playersReady.push(socket.id);

    // Start game when both players ready
    if (game.playersReady.length === 2) {
      io.to(gameId).emit('game-start', {
        phase: 'ran-neeti',
        currentTurn: game.currentTurn,
        gameState: {
          player1: {
            health: game.players.player1.health,
            tokens: game.players.player1.tokens,
            devtaCard: game.players.player1.devtaCard
          },
          player2: {
            health: game.players.player2.health,
            tokens: game.players.player2.tokens,
            devtaCard: game.players.player2.devtaCard
          }
        }
      });
    }
  });

  // Handle pasa roll
  socket.on('roll-pasa', () => {
    const gameId = socket.gameId;
    const game = activeGames.get(gameId);
    
    if (!game || game.currentTurn !== socket.id) return;

    const playerKey = game.players.player1.id === socket.id ? 'player1' : 'player2';
    const player = game.players[playerKey];

    // Get unselected pasa
    const selectedIds = player.selectedPasa.map(p => p.pasaId);
    const unselectedPasa = player.pasaSet.filter(p => !selectedIds.includes(p.id));

    // Roll the dice
    const rolledPasa = rollPasa(unselectedPasa);
    player.rollCount++;

    // Broadcast roll result
    io.to(gameId).emit('pasa-rolled', {
      playerId: socket.id,
        rolledPasa,
      rollCount: player.rollCount
    });
  });

  // Handle pasa selection
  socket.on('select-pasa', (pasaData) => {
    const gameId = socket.gameId;
    const game = activeGames.get(gameId);
    
    if (!game) return;

    const playerKey = game.players.player1.id === socket.id ? 'player1' : 'player2';
    const player = game.players[playerKey];

    player.selectedPasa.push(pasaData);

    io.to(gameId).emit('pasa-selected', {
      playerId: socket.id,
      pasaData,
      selectedCount: player.selectedPasa.length
    });
  });

  // Handle pasa deselection
  socket.on('deselect-pasa', (pasaId) => {
    const gameId = socket.gameId;
    const game = activeGames.get(gameId);
    
    if (!game) return;

    const playerKey = game.players.player1.id === socket.id ? 'player1' : 'player2';
    const player = game.players[playerKey];

    player.selectedPasa = player.selectedPasa.filter(p => p.pasaId !== pasaId);

    io.to(gameId).emit('pasa-deselected', {
      playerId: socket.id,
      pasaId
    });
  });

  // Handle turn completion
  socket.on('complete-turn', () => {
    const gameId = socket.gameId;
    const game = activeGames.get(gameId);
    
    if (!game || game.currentTurn !== socket.id) return;

    const playerKey = game.players.player1.id === socket.id ? 'player1' : 'player2';
    const otherKey = playerKey === 'player1' ? 'player2' : 'player1';
    const player = game.players[playerKey];
    const otherPlayer = game.players[otherKey];

    // Check if phase 1 is complete
    const p1Complete = game.players.player1.selectedPasa.length === 6 || 
                       game.players.player1.rollCount === GAME_CONSTANTS.MAX_ROLLS;
    const p2Complete = game.players.player2.selectedPasa.length === 6 || 
                       game.players.player2.rollCount === GAME_CONSTANTS.MAX_ROLLS;

    if (p1Complete && p2Complete) {
      // Move to Phase 2
      game.phase = 'devik-vardan';
      io.to(gameId).emit('phase-change', {
        phase: 'devik-vardan',
        message: 'Devik Vardan - Choose your divine favor'
      });
    } else {
      // Switch turn
      game.currentTurn = otherPlayer.id;
      io.to(gameId).emit('turn-change', {
        currentTurn: game.currentTurn
      });
    }
  });

  // Handle Devta card selection
  socket.on('devta-selection', (useDevta) => {
    const gameId = socket.gameId;
    const game = activeGames.get(gameId);
    
    if (!game) return;

    game.devtaSelection[socket.id] = useDevta;

    // Check if both players have made selection
    const playerIds = [game.players.player1.id, game.players.player2.id];
    if (playerIds.every(id => game.devtaSelection[id] !== undefined)) {
      // Move to Phase 3
      game.phase = 'yudh';
      io.to(gameId).emit('phase-change', {
        phase: 'yudh',
        message: 'Yudh - Battle begins!'
      });

      // Trigger combat resolution
      setTimeout(() => {
        resolveCombat(gameId);
      }, 1000);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Remove from waiting queue
    const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
    }

    // Handle active game disconnect
    if (socket.gameId) {
      const game = activeGames.get(socket.gameId);
      if (game) {
        io.to(socket.gameId).emit('opponent-disconnected');
        activeGames.delete(socket.gameId);
      }
    }
  });
});

// Combat resolution function
function resolveCombat(gameId) {
  const game = activeGames.get(gameId);
  if (!game) return;

  const p1 = game.players.player1;
  const p2 = game.players.player2;

  // Execute beginning-phase Devta cards (by priority)
  const beginningVardans = [];
  
  if (game.devtaSelection[p1.id] && p1.devtaCard.actionTime === 'beginning') {
    beginningVardans.push({ player: p1, card: p1.devtaCard, playerId: p1.id });
  }
  if (game.devtaSelection[p2.id] && p2.devtaCard.actionTime === 'beginning') {
    beginningVardans.push({ player: p2, card: p2.devtaCard, playerId: p2.id });
  }

  beginningVardans.sort((a, b) => a.card.priority - b.card.priority);

  // Execute Devta effects
  beginningVardans.forEach(({ player, card, playerId }) => {
    if (player.tokens >= card.tokensRequired) {
      player.tokens -= card.tokensRequired;
      
      const opponent = player === p1 ? p2 : p1;
      
      if (card.type === 'attacker') {
        opponent.health -= card.damage;
        io.to(gameId).emit('devta-effect', {
          playerId,
          cardName: card.name,
          effect: `${card.damage} damage dealt`,
          targetHealth: opponent.health
        });
      } else if (card.type === 'supporter' && card.affectedMove === 'dhal') {
        opponent.selectedPasa = opponent.selectedPasa.filter(p => p.face.type !== 'dhal');
        io.to(gameId).emit('devta-effect', {
          playerId,
          cardName: card.name,
          effect: 'All Dhal removed from opponent'
        });
      } else if (card.type === 'supporter' && card.affectedMove === 'vardanTokens') {
        const tokensToRemove = game.devtaSelection[opponent.id] ? 
          opponent.devtaCard.tokensRequired : 0;
        opponent.tokens = Math.max(0, opponent.tokens - tokensToRemove);
        io.to(gameId).emit('devta-effect', {
          playerId,
          cardName: card.name,
          effect: `${tokensToRemove} tokens removed from opponent`
        });
      }
    }
  });

  // Resolve combat
  const combatLog = [];
  
  // Process Yagya tokens first
  p1.selectedPasa.forEach(pasa => {
    if (pasa.face.yagya) p1.tokens++;
  });
  p2.selectedPasa.forEach(pasa => {
    if (pasa.face.yagya) p2.tokens++;
  });

  // Create working copies
  let p1Pasa = [...p1.selectedPasa];
  let p2Pasa = [...p2.selectedPasa];

  // Resolve defenses
  p1Pasa.filter(p => p && p.face.type === 'bhala').forEach((bhala, idx) => {
    const kavachIdx = p2Pasa.findIndex(p => p && p.face.type === 'kavach');
    if (kavachIdx !== -1) {
      p2Pasa.splice(kavachIdx, 1);
      p1Pasa[idx] = null;
      combatLog.push({ type: 'block', attacker: 'p1', move: 'bhala', defender: 'p2', block: 'kavach' });
    }
  });

  p1Pasa.filter(p => p && p.face.type === 'teer').forEach((teer, idx) => {
    const dhalIdx = p2Pasa.findIndex(p => p && p.face.type === 'dhal');
    if (dhalIdx !== -1) {
      p2Pasa.splice(dhalIdx, 1);
      p1Pasa[idx] = null;
      combatLog.push({ type: 'block', attacker: 'p1', move: 'teer', defender: 'p2', block: 'dhal' });
    }
  });

  p2Pasa.filter(p => p && p.face.type === 'bhala').forEach((bhala, idx) => {
    const kavachIdx = p1Pasa.findIndex(p => p && p.face.type === 'kavach');
    if (kavachIdx !== -1) {
      p1Pasa.splice(kavachIdx, 1);
      p2Pasa[idx] = null;
      combatLog.push({ type: 'block', attacker: 'p2', move: 'bhala', defender: 'p1', block: 'kavach' });
    }
  });

  p2Pasa.filter(p => p && p.face.type === 'teer').forEach((teer, idx) => {
    const dhalIdx = p1Pasa.findIndex(p => p && p.face.type === 'dhal');
    if (dhalIdx !== -1) {
      p1Pasa.splice(dhalIdx, 1);
      p2Pasa[idx] = null;
      combatLog.push({ type: 'block', attacker: 'p2', move: 'teer', defender: 'p1', block: 'dhal' });
    }
  });

  // Resolve attacks
  p1Pasa.filter(p => p && (p.face.type === 'bhala' || p.face.type === 'teer')).forEach(() => {
    p2.health--;
    combatLog.push({ type: 'damage', attacker: 'p1', defender: 'p2' });
  });

  p2Pasa.filter(p => p && (p.face.type === 'bhala' || p.face.type === 'teer')).forEach(() => {
    p1.health--;
    combatLog.push({ type: 'damage', attacker: 'p2', defender: 'p1' });
  });

  // Resolve token stealing
  p1Pasa.filter(p => p && p.face.type === 'kapat').forEach(() => {
    if (p2.tokens > 0) {
      p2.tokens--;
      p1.tokens++;
      combatLog.push({ type: 'steal', attacker: 'p1', defender: 'p2' });
    }
  });

  p2Pasa.filter(p => p && p.face.type === 'kapat').forEach(() => {
    if (p1.tokens > 0) {
      p1.tokens--;
      p2.tokens++;
      combatLog.push({ type: 'steal', attacker: 'p2', defender: 'p1' });
    }
  });

  // Execute end-phase Devta cards
  const endVardans = [];
  
  if (game.devtaSelection[p1.id] && p1.devtaCard.actionTime === 'end') {
    endVardans.push({ player: p1, card: p1.devtaCard, playerId: p1.id });
  }
  if (game.devtaSelection[p2.id] && p2.devtaCard.actionTime === 'end') {
    endVardans.push({ player: p2, card: p2.devtaCard, playerId: p2.id });
  }

  endVardans.forEach(({ player, card, playerId }) => {
    if (player.tokens >= card.tokensRequired && card.type === 'healer') {
      player.tokens -= card.tokensRequired;
      const healAmount = Math.min(card.heal, GAME_CONSTANTS.STARTING_HEALTH - player.health);
      player.health += healAmount;
      io.to(gameId).emit('devta-effect', {
        playerId,
        cardName: card.name,
        effect: `Healed ${healAmount} health`,
        targetHealth: player.health
      });
    }
  });

  // Send combat results
  io.to(gameId).emit('combat-resolved', {
    combatLog,
    player1: { health: p1.health, tokens: p1.tokens },
    player2: { health: p2.health, tokens: p2.tokens }
  });

  // Check win condition
  if (p1.health <= 0 || p2.health <= 0) {
    const winner = p1.health > 0 ? p1 : p2;
    io.to(gameId).emit('game-over', {
      winnerId: winner.id,
      winnerName: winner.username
    });
    activeGames.delete(gameId);
  } else {
    // Reset for next round
    p1.selectedPasa = [];
    p2.selectedPasa = [];
    p1.rollCount = 0;
    p2.rollCount = 0;
    game.devtaSelection = {};
    game.phase = 'ran-neeti';
    
    // Assign new Devta cards
    const newDevtaCards = assignDevtaCards();
    p1.devtaCard = newDevtaCards.player1;
    p2.devtaCard = newDevtaCards.player2;

    setTimeout(() => {
      io.to(gameId).emit('new-round', {
        phase: 'ran-neeti',
        currentTurn: game.currentTurn,
        player1Devta: p1.devtaCard,
        player2Devta: p2.devtaCard
      });
    }, 3000);
  }
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
