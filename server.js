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
    const loserId = Object.keys(game.tossChoices).find(
      id => game.tossChoices[id] !== result
    );

    // Winner goes SECOND (strategic advantage)
    game.firstPlayer = loserId;
    game.currentTurn = loserId;

    // Notify both players that toss has started with the choice
    io.to(gameId).emit('toss-started', { choice });

    // Broadcast result after animation delay
    setTimeout(() => {
      io.to(gameId).emit('toss-result', {
        result,
        winnerId,
        loserId,
        firstPlayer: loserId  // Loser goes first
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

    // Broadcast with full pasa details so opponent can see what was selected
    io.to(gameId).emit('pasa-selected', {
      playerId: socket.id,
      pasaData,  // Include full pasa data (type, yagya, etc.)
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

// Combat resolution function - Sequential with delays
async function resolveCombat(gameId) {
  const game = activeGames.get(gameId);
  if (!game) return;

  const p1 = game.players.player1;
  const p2 = game.players.player2;

  const combatActions = [];

  // Execute beginning-phase Devta cards (by priority)
  const beginningVardans = [];
  
  if (game.devtaSelection[p1.id] && p1.devtaCard.actionTime === 'beginning') {
    beginningVardans.push({ player: p1, card: p1.devtaCard, playerId: p1.id });
  }
  if (game.devtaSelection[p2.id] && p2.devtaCard.actionTime === 'beginning') {
    beginningVardans.push({ player: p2, card: p2.devtaCard, playerId: p2.id });
  }

  beginningVardans.sort((a, b) => a.card.priority - b.card.priority);

  // Add Devta effects to actions
  beginningVardans.forEach(({ player, card, playerId }) => {
    if (player.tokens >= card.tokensRequired) {
      const opponent = player === p1 ? p2 : p1;
      
      combatActions.push({
        type: 'devta-beginning',
        playerId,
        playerKey: player === p1 ? 'player1' : 'player2',
        opponentKey: opponent === p1 ? 'player1' : 'player2',
        card,
        execute: () => {
          player.tokens -= card.tokensRequired;
          
          if (card.type === 'attacker') {
            opponent.health -= card.damage;
            return {
              event: 'combat-action',
              data: {
                actionType: 'devta-attack',
                playerId,
                cardName: card.name,
                message: `${card.name}: ${card.damage} damage dealt!`,
                playerHealth: p1.health,
                opponentHealth: p2.health,
                playerTokens: p1.tokens,
                opponentTokens: p2.tokens
              }
            };
          } else if (card.type === 'supporter' && card.affectedMove === 'dhal') {
            const removedCount = opponent.selectedPasa.filter(p => p.face.type === 'dhal').length;
            opponent.selectedPasa = opponent.selectedPasa.filter(p => p.face.type === 'dhal');
            return {
              event: 'combat-action',
              data: {
                actionType: 'devta-remove',
                playerId,
                cardName: card.name,
                message: `${card.name}: Removed ${removedCount} Dhal from opponent!`,
                removePasa: { player: opponent === p1 ? 'player1' : 'player2', type: 'dhal' }
              }
            };
          } else if (card.type === 'supporter' && card.affectedMove === 'vardanTokens') {
            const tokensToRemove = game.devtaSelection[opponent.id] ? 
              opponent.devtaCard.tokensRequired : 0;
            opponent.tokens = Math.max(0, opponent.tokens - tokensToRemove);
            return {
              event: 'combat-action',
              data: {
                actionType: 'devta-steal-tokens',
                playerId,
                cardName: card.name,
                message: `${card.name}: Removed ${tokensToRemove} tokens from opponent!`,
                playerTokens: p1.tokens,
                opponentTokens: p2.tokens
              }
            };
          }
        }
      });
    }
  });

  // Process Yagya tokens
  const p1YagyaCount = p1.selectedPasa.filter(p => p.face.yagya).length;
  const p2YagyaCount = p2.selectedPasa.filter(p => p.face.yagya).length;

  if (p1YagyaCount > 0) {
    combatActions.push({
      type: 'yagya',
      playerId: p1.id,
      execute: () => {
        p1.tokens += p1YagyaCount;
        return {
          event: 'combat-action',
          data: {
            actionType: 'yagya',
            playerId: p1.id,
            message: `Player 1 gains ${p1YagyaCount} Vardan Token${p1YagyaCount > 1 ? 's' : ''} from Yagya!`,
            playerTokens: p1.tokens,
            opponentTokens: p2.tokens
          }
        };
      }
    });
  }

  if (p2YagyaCount > 0) {
    combatActions.push({
      type: 'yagya',
      playerId: p2.id,
      execute: () => {
        p2.tokens += p2YagyaCount;
        return {
          event: 'combat-action',
          data: {
            actionType: 'yagya',
            playerId: p2.id,
            message: `Player 2 gains ${p2YagyaCount} Vardan Token${p2YagyaCount > 1 ? 's' : ''} from Yagya!`,
            playerTokens: p1.tokens,
            opponentTokens: p2.tokens
          }
        };
      }
    });
  }

  // Create working copies for combat resolution
  let p1Pasa = [...p1.selectedPasa];
  let p2Pasa = [...p2.selectedPasa];

  // Resolve P1 attacks and defenses
  for (let i = 0; i < p1Pasa.length; i++) {
    const pasa = p1Pasa[i];
    if (!pasa) continue;

    if (pasa.face.type === 'bhala') {
      const kavachIdx = p2Pasa.findIndex(p => p && p.face.type === 'kavach');
      if (kavachIdx !== -1) {
        const kavachPasa = p2Pasa[kavachIdx];
        combatActions.push({
          type: 'block',
          execute: () => {
            p2Pasa[kavachIdx] = null;
            p1Pasa[i] = null;
            return {
              event: 'combat-action',
              data: {
                actionType: 'block',
                attacker: 'player1',
                defender: 'player2',
                attackType: 'bhala',
                blockType: 'kavach',
                message: 'Bhala blocked by Kavach!',
                removePasa: [
                  { player: 'player1', pasaId: pasa.pasaId },
                  { player: 'player2', pasaId: kavachPasa.pasaId }
                ]
              }
            };
          }
        });
      } else {
        combatActions.push({
          type: 'damage',
          execute: () => {
            p2.health--;
            p1Pasa[i] = null;
            return {
              event: 'combat-action',
              data: {
                actionType: 'damage',
                attacker: 'player1',
                defender: 'player2',
                attackType: 'bhala',
                message: 'Bhala hits! 1 damage dealt!',
                playerHealth: p1.health,
                opponentHealth: p2.health,
                removePasa: [{ player: 'player1', pasaId: pasa.pasaId }]
              }
            };
          }
        });
      }
    } else if (pasa.face.type === 'teer') {
      const dhalIdx = p2Pasa.findIndex(p => p && p.face.type === 'dhal');
      if (dhalIdx !== -1) {
        const dhalPasa = p2Pasa[dhalIdx];
        combatActions.push({
          type: 'block',
          execute: () => {
            p2Pasa[dhalIdx] = null;
            p1Pasa[i] = null;
            return {
              event: 'combat-action',
              data: {
                actionType: 'block',
                attacker: 'player1',
                defender: 'player2',
                attackType: 'teer',
                blockType: 'dhal',
                message: 'Teer blocked by Dhal!',
                removePasa: [
                  { player: 'player1', pasaId: pasa.pasaId },
                  { player: 'player2', pasaId: dhalPasa.pasaId }
                ]
              }
            };
          }
        });
      } else {
        combatActions.push({
          type: 'damage',
          execute: () => {
            p2.health--;
            p1Pasa[i] = null;
            return {
              event: 'combat-action',
              data: {
                actionType: 'damage',
                attacker: 'player1',
                defender: 'player2',
                attackType: 'teer',
                message: 'Teer hits! 1 damage dealt!',
                playerHealth: p1.health,
                opponentHealth: p2.health,
                removePasa: [{ player: 'player1', pasaId: pasa.pasaId }]
              }
            };
          }
        });
      }
    } else if (pasa.face.type === 'kapat') {
      if (p2.tokens > 0) {
        combatActions.push({
          type: 'steal',
          execute: () => {
            p2.tokens--;
            p1.tokens++;
            p1Pasa[i] = null;
            return {
              event: 'combat-action',
              data: {
                actionType: 'steal',
                attacker: 'player1',
                defender: 'player2',
                message: 'Kapat steals 1 Vardan Token!',
                playerTokens: p1.tokens,
                opponentTokens: p2.tokens,
                removePasa: [{ player: 'player1', pasaId: pasa.pasaId }]
              }
            };
          }
        });
      } else {
        combatActions.push({
          type: 'steal-fail',
          execute: () => {
            p1Pasa[i] = null;
            return {
              event: 'combat-action',
              data: {
                actionType: 'steal-fail',
                attacker: 'player1',
                message: 'Kapat failed - no tokens to steal!',
                removePasa: [{ player: 'player1', pasaId: pasa.pasaId }]
              }
            };
          }
        });
      }
    }
  }

  // Resolve P2 attacks and defenses
  for (let i = 0; i < p2Pasa.length; i++) {
    const pasa = p2Pasa[i];
    if (!pasa) continue;

    if (pasa.face.type === 'bhala') {
      const kavachIdx = p1Pasa.findIndex(p => p && p.face.type === 'kavach');
      if (kavachIdx !== -1) {
        const kavachPasa = p1Pasa[kavachIdx];
        combatActions.push({
          type: 'block',
          execute: () => {
            p1Pasa[kavachIdx] = null;
            p2Pasa[i] = null;
            return {
              event: 'combat-action',
              data: {
                actionType: 'block',
                attacker: 'player2',
                defender: 'player1',
                attackType: 'bhala',
                blockType: 'kavach',
                message: 'Bhala blocked by Kavach!',
                removePasa: [
                  { player: 'player2', pasaId: pasa.pasaId },
                  { player: 'player1', pasaId: kavachPasa.pasaId }
                ]
              }
            };
          }
        });
      } else {
        combatActions.push({
          type: 'damage',
          execute: () => {
            p1.health--;
            p2Pasa[i] = null;
            return {
              event: 'combat-action',
              data: {
                actionType: 'damage',
                attacker: 'player2',
                defender: 'player1',
                attackType: 'bhala',
                message: 'Bhala hits! 1 damage dealt!',
                playerHealth: p1.health,
                opponentHealth: p2.health,
                removePasa: [{ player: 'player2', pasaId: pasa.pasaId }]
              }
            };
          }
        });
      }
    } else if (pasa.face.type === 'teer') {
      const dhalIdx = p1Pasa.findIndex(p => p && p.face.type === 'dhal');
      if (dhalIdx !== -1) {
        const dhalPasa = p1Pasa[dhalIdx];
        combatActions.push({
          type: 'block',
          execute: () => {
            p1Pasa[dhalIdx] = null;
            p2Pasa[i] = null;
            return {
              event: 'combat-action',
              data: {
                actionType: 'block',
                attacker: 'player2',
                defender: 'player1',
                attackType: 'teer',
                blockType: 'dhal',
                message: 'Teer blocked by Dhal!',
                removePasa: [
                  { player: 'player2', pasaId: pasa.pasaId },
                  { player: 'player1', pasaId: dhalPasa.pasaId }
                ]
              }
            };
          }
        });
      } else {
        combatActions.push({
          type: 'damage',
          execute: () => {
            p1.health--;
            p2Pasa[i] = null;
            return {
              event: 'combat-action',
              data: {
                actionType: 'damage',
                attacker: 'player2',
                defender: 'player1',
                attackType: 'teer',
                message: 'Teer hits! 1 damage dealt!',
                playerHealth: p1.health,
                opponentHealth: p2.health,
                removePasa: [{ player: 'player2', pasaId: pasa.pasaId }]
              }
            };
          }
        });
      }
    } else if (pasa.face.type === 'kapat') {
      if (p1.tokens > 0) {
        combatActions.push({
          type: 'steal',
          execute: () => {
            p1.tokens--;
            p2.tokens++;
            p2Pasa[i] = null;
            return {
              event: 'combat-action',
              data: {
                actionType: 'steal',
                attacker: 'player2',
                defender: 'player1',
                message: 'Kapat steals 1 Vardan Token!',
                playerTokens: p1.tokens,
                opponentTokens: p2.tokens,
                removePasa: [{ player: 'player2', pasaId: pasa.pasaId }]
              }
            };
          }
        });
      } else {
        combatActions.push({
          type: 'steal-fail',
          execute: () => {
            p2Pasa[i] = null;
            return {
              event: 'combat-action',
              data: {
                actionType: 'steal-fail',
                attacker: 'player2',
                message: 'Kapat failed - no tokens to steal!',
                removePasa: [{ player: 'player2', pasaId: pasa.pasaId }]
              }
            };
          }
        });
      }
    }
  }

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
      combatActions.push({
        type: 'devta-end',
        execute: () => {
          player.tokens -= card.tokensRequired;
          const healAmount = Math.min(card.heal, GAME_CONSTANTS.STARTING_HEALTH - player.health);
          player.health += healAmount;
          return {
            event: 'combat-action',
            data: {
              actionType: 'devta-heal',
              playerId,
              cardName: card.name,
              message: `${card.name}: Healed ${healAmount} health!`,
              playerHealth: p1.health,
              opponentHealth: p2.health,
              playerTokens: p1.tokens,
              opponentTokens: p2.tokens
            }
          };
        }
      });
    }
  });

  // Execute actions sequentially with 2-second delays
  for (let i = 0; i < combatActions.length; i++) {
    const action = combatActions[i];
    const result = action.execute();
    
    if (result) {
      io.to(gameId).emit(result.event, result.data);
    }
    
    // Wait 2 seconds before next action (except for the last one)
    if (i < combatActions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Wait a bit after all actions, then check win condition
  await new Promise(resolve => setTimeout(resolve, 1000));

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
    
    // DO NOT reassign Devta cards - they persist throughout the game

    setTimeout(() => {
      io.to(gameId).emit('new-round', {
        phase: 'ran-neeti',
        currentTurn: game.currentTurn
        // No Devta card info - they remain the same
      });
    }, 3000);
  }
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
