// UI Manager
class GameUI {
  constructor() {
    this.elements = {
      // Pages
      landingPage: document.getElementById('landing-page'),
      gamePage: document.getElementById('game-page'),

      // Landing page elements
      usernameInput: document.getElementById('username-input'),
      avatarPreview: document.getElementById('avatar-preview'),
      findMatchBtn: document.getElementById('find-match-btn'),
      profileSection: document.getElementById('profile-section'),
      matchmakingSection: document.getElementById('matchmaking-section'),

      // Modals
      tossModal: document.getElementById('toss-modal'),
      tossResultModal: document.getElementById('toss-result-modal'),
      gameOverModal: document.getElementById('game-over-modal'),

      // Coin toss
      coin: document.getElementById('coin'),
      tossMessage: document.getElementById('toss-message'),
      tossResultTitle: document.getElementById('toss-result-title'),
      tossResultMessage: document.getElementById('toss-result-message'),
      letsPlayBtn: document.getElementById('lets-play-btn'),

      // Phase announcement
      phaseAnnouncement: document.getElementById('phase-announcement'),
      phaseTitle: document.getElementById('phase-title'),

      // Combat announcement (Bottom)
      combatAnnouncement: document.getElementById('combat-announcement'),
      combatMessage: document.getElementById('combat-message'),

      // Player elements
      playerUsername: document.getElementById('player-username'),
      playerHealth: document.getElementById('player-health'),
      playerTokens: document.getElementById('player-tokens'),
      playerDevtaCard: document.getElementById('player-devta-card'),
      playerPasaArea: document.getElementById('player-pasa-area'),
      playerSelectedZone: document.getElementById('player-selected-pasa'),
      rollPasaBtn: document.getElementById('roll-pasa-btn'),
      completeTurnBtn: document.getElementById('complete-turn-btn'),
      devtaSelection: document.getElementById('devta-selection'),

      // Opponent elements
      opponentUsername: document.getElementById('opponent-username'),
      opponentHealth: document.getElementById('opponent-health'),
      opponentTokens: document.getElementById('opponent-tokens'),
      opponentDevtaCard: document.getElementById('opponent-devta-card'),
      opponentPasaArea: document.getElementById('opponent-pasa-area'),
      opponentSelectedZone: document.getElementById('opponent-selected-pasa'),
      opponentRollStatus: document.getElementById('opponent-roll-status'),

      // Game over
      gameOverTitle: document.getElementById('game-over-title'),
      gameOverMessage: document.getElementById('game-over-message'),
      exitGameBtn: document.getElementById('exit-game-btn')
    };

    this.selectedAvatar = null;
    this.setupEventListeners();
    this.loadProfile();
  }

  setupEventListeners() {
    // Avatar selection
    document.querySelectorAll('.avatar-option').forEach(option => {
      option.addEventListener('click', (e) => {
        document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
        e.target.classList.add('selected');
        this.selectedAvatar = e.target.dataset.color;
        this.elements.avatarPreview.style.background = this.selectedAvatar;
        this.checkProfileComplete();
      });
    });

    // Username input
    this.elements.usernameInput.addEventListener('input', () => {
      this.checkProfileComplete();
    });

    // Find match
    this.elements.findMatchBtn.addEventListener('click', () => {
      this.startMatchmaking();
    });

    // Toss choices
    document.querySelectorAll('.btn-choice').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const choice = e.target.dataset.choice;
        this.sendTossChoice(choice);
        document.querySelectorAll('.btn-choice').forEach(b => b.disabled = true);
      });
    });

    // Let's play button
    this.elements.letsPlayBtn.addEventListener('click', () => {
      window.socketManager.sendReadyToPlay();
      this.elements.tossResultModal.classList.remove('active');
    });

    // Roll pasa button
    this.elements.rollPasaBtn.addEventListener('click', () => {
      window.socketManager.rollPasa();
      this.elements.rollPasaBtn.disabled = true;
    });

    // Complete turn button
    this.elements.completeTurnBtn.addEventListener('click', () => {
      window.socketManager.completeTurn();
      this.elements.completeTurnBtn.disabled = true;
      this.elements.rollPasaBtn.disabled = true;
    });

    // Devta card flip
    this.elements.playerDevtaCard.addEventListener('click', () => {
      this.elements.playerDevtaCard.classList.toggle('flipped');
    });

    // Devta selection
    document.querySelectorAll('#devta-selection .btn-small').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const useDevta = e.target.dataset.use === 'true';
        window.socketManager.sendDevtaSelection(useDevta);
        this.elements.devtaSelection.classList.add('hidden');
      });
    });

    // Exit game
    this.elements.exitGameBtn.addEventListener('click', () => {
      location.reload();
    });
  }

  loadProfile() {
    const profile = window.gameState.getProfile();
    if (profile) {
      this.elements.usernameInput.value = profile.username;
      this.selectedAvatar = profile.avatar;
      this.elements.avatarPreview.style.background = profile.avatar;
      document.querySelectorAll('.avatar-option').forEach(option => {
        if (option.dataset.color === profile.avatar) {
          option.classList.add('selected');
        }
      });
      this.checkProfileComplete();
    }
  }

  checkProfileComplete() {
    const username = this.elements.usernameInput.value.trim();
    const isComplete = username.length > 0 && this.selectedAvatar;
    this.elements.findMatchBtn.disabled = !isComplete;
  }

  startMatchmaking() {
    const username = this.elements.usernameInput.value.trim();
    const profile = window.gameState.saveProfile(username, this.selectedAvatar);
    
    window.socketManager.sendPlayerReady(profile);
    window.socketManager.findMatch();

    this.elements.profileSection.classList.add('hidden');
    this.elements.matchmakingSection.classList.remove('hidden');
  }

  onMatchFound(data) {
    window.gameState.player.id = window.socketManager.socket.id;
    window.gameState.opponent.username = data.opponent.username;
    window.gameState.opponent.avatar = data.opponent.avatar;
    window.gameState.opponent.id = data.opponent.id;

    // Switch to game page
    this.elements.landingPage.classList.remove('active');
    this.elements.gamePage.classList.add('active');

    // Set player names
    this.elements.playerUsername.textContent = window.gameState.player.username;
    this.elements.opponentUsername.textContent = window.gameState.opponent.username;
  }

  showTossModal() {
    this.elements.tossModal.classList.add('active');
  }

  sendTossChoice(choice) {
    window.socketManager.sendTossChoice(choice);
    // Animation now triggered by server event for both players
  }

  onTossStarted(data) {
    this.elements.tossMessage.textContent = `Flipping the Sikka...`;
    // Start coin flip animation for everyone
    Animations.flipCoin(this.elements.coin, data.choice);
  }

  onTossAutoAssigned(choice) {
    this.elements.tossMessage.textContent = `Opponent chose first. You got ${choice}.`;
    document.querySelectorAll('.btn-choice').forEach(b => b.disabled = true);
  }

  onTossResult(data) {
    this.elements.tossModal.classList.remove('active');
    
    const isWinner = data.winnerId === window.gameState.player.id;
    const resultText = data.result.toUpperCase();
    
    this.elements.tossResultTitle.textContent = `${resultText} it is!`;
    // Winner goes SECOND (strategic advantage)
    this.elements.tossResultMessage.textContent = isWinner ? 
      'You won! You will go second (strategic advantage)' : 
      'You lost. You will go first';
    
    this.elements.tossResultModal.classList.add('active');
  }

  onGameStart(data) {
    // Display Devta cards based on player role
    // Player1 sees player1's card, Player2 sees player2's card
    if (window.socketManager.playerRole === 'player1') {
      this.displayDevtaCard(this.elements.playerDevtaCard, data.gameState.player1.devtaCard);
      this.displayDevtaCard(this.elements.opponentDevtaCard, data.gameState.player2.devtaCard);
      
      // Update game state
      window.gameState.player.devtaCard = data.gameState.player1.devtaCard;
      window.gameState.opponent.devtaCard = data.gameState.player2.devtaCard;
    } else {
      // Player2 sees player2's card as their own
      this.displayDevtaCard(this.elements.playerDevtaCard, data.gameState.player2.devtaCard);
      this.displayDevtaCard(this.elements.opponentDevtaCard, data.gameState.player1.devtaCard);
      
      // Update game state
      window.gameState.player.devtaCard = data.gameState.player2.devtaCard;
      window.gameState.opponent.devtaCard = data.gameState.player1.devtaCard;
    }

    // Update displays
    this.updateHealthDisplay('player', window.gameState.player.health);
    this.updateHealthDisplay('opponent', window.gameState.opponent.health);
    this.updateTokenDisplay('player', window.gameState.player.tokens);
    this.updateTokenDisplay('opponent', window.gameState.opponent.tokens);

    // Announce phase
    this.announcePhase('ran-neeti', 'Ran Neeti - Roll your Pasa');

    // Enable controls if it's player's turn
    if (window.gameState.isMyTurn) {
      this.elements.rollPasaBtn.disabled = false;
    }
  }

  displayDevtaCard(cardElement, devtaCard) {
    const cardName = cardElement.querySelector('.card-name');
    const cardDetails = cardElement.querySelector('.card-details');
    
    cardName.textContent = devtaCard.name;
    
    if (cardDetails) {
      cardDetails.innerHTML = `
        <strong>${devtaCard.name}</strong><br>
        ${devtaCard.description}<br><br>
        <strong>Tokens Required:</strong> ${devtaCard.tokensRequired}<br>
        <strong>Action Time:</strong> ${devtaCard.actionTime}<br>
        <strong>Priority:</strong> ${devtaCard.priority}
        ${devtaCard.additionalNote ? '<br><br><em>' + devtaCard.additionalNote + '</em>' : ''}
      `;
    }
  }

  announcePhase(phase, message) {
    this.elements.phaseTitle.textContent = message || phase;
    Animations.showPhaseAnnouncement(this.elements.phaseAnnouncement, message);
  }

  announceCombat(message) {
    this.elements.combatMessage.textContent = message;
    this.elements.combatAnnouncement.classList.add('show');
    
    setTimeout(() => {
      this.elements.combatAnnouncement.classList.remove('show');
    }, 1500);
  }

  onPasaRolled(data) {
    const isPlayer = data.playerId === window.gameState.player.id;
    
    if (isPlayer) {
      window.gameState.setCurrentRoll(data.rolledPasa);
      window.gameState.incrementRollCount();
      this.displayRolledPasa(data.rolledPasa);
      
      // Enable complete turn if max rolls reached
      if (data.rollCount >= GAME_CONSTANTS.MAX_ROLLS) {
        // Auto-select remaining pasa
        data.rolledPasa.forEach(pasa => {
          this.selectPasaFromRoll(pasa);
        });
      }
    } else {
      this.elements.opponentRollStatus.textContent = `Roll ${data.rollCount}/3`;
    }
  }

  displayRolledPasa(rolledPasa) {
    this.elements.playerPasaArea.innerHTML = '';
    
    rolledPasa.forEach(pasa => {
      const pasaEl = this.createPasaElement(pasa);
      pasaEl.addEventListener('click', () => {
        this.selectPasaFromRoll(pasa);
      });
      this.elements.playerPasaArea.appendChild(pasaEl);
      Animations.rollDice(pasaEl);
    });

    // Show complete turn button if player has selected some pasa
    if (window.gameState.player.selectedPasa.length > 0) {
      this.elements.completeTurnBtn.disabled = false;
    }
  }

  createPasaElement(pasa) {
    const div = document.createElement('div');
    div.className = 'pasa';
    div.dataset.pasaId = pasa.pasaId;
    div.textContent = pasa.face.type.toUpperCase();
    
    if (pasa.face.yagya) {
      div.classList.add('yagya');
    }
    
    return div;
  }

  selectPasaFromRoll(pasa) {
    // Add to selected pasa
    window.gameState.addSelectedPasa(pasa);
    window.socketManager.selectPasa(pasa);

    // Remove from current roll display
    const pasaEl = this.elements.playerPasaArea.querySelector(`[data-pasa-id="${pasa.pasaId}"]`);
    if (pasaEl) {
      Animations.movePasaToWarZone(pasaEl, this.elements.playerSelectedZone);
    }

    // Update controls
    this.elements.completeTurnBtn.disabled = false;
    
    // Check if all pasa selected
    if (window.gameState.player.selectedPasa.length === GAME_CONSTANTS.PASA_COUNT) {
      this.elements.rollPasaBtn.disabled = true;
      this.elements.completeTurnBtn.disabled = false;
    } else if (window.gameState.canRollAgain()) {
      this.elements.rollPasaBtn.disabled = false;
    }
  }

  onPasaSelected(data) {
    const isPlayer = data.playerId === window.gameState.player.id;
    
    if (!isPlayer) {
      // Show opponent's actual selected pasa (not hidden anymore)
      const pasaEl = this.createPasaElement(data.pasaData);
      pasaEl.classList.add('pasa-small');
      pasaEl.dataset.pasaId = data.pasaData.pasaId;
      this.elements.opponentSelectedZone.appendChild(pasaEl);
    }
  }

  onPasaDeselected(data) {
    // Handle deselection if needed
  }

  onTurnChange(data) {
    window.gameState.isMyTurn = data.currentTurn === window.gameState.player.id;
    
    if (window.gameState.isMyTurn && window.gameState.canRollAgain()) {
      this.elements.rollPasaBtn.disabled = false;
    } else {
      this.elements.rollPasaBtn.disabled = true;
    }

    // Check if moving to phase 2
    if (window.gameState.currentPhase === 'devik-vardan') {
      this.elements.devtaSelection.classList.remove('hidden');
    }
  }

  updateHealthDisplay(player, newHealth) {
    const element = player === 'player' ? this.elements.playerHealth : this.elements.opponentHealth;
    const countEl = element.querySelector('.health-count');
    const oldHealth = parseInt(countEl.textContent);
    Animations.updateCounter(countEl, newHealth, oldHealth);
  }

  updateTokenDisplay(player, newTokens) {
    const element = player === 'player' ? this.elements.playerTokens : this.elements.opponentTokens;
    const countEl = element.querySelector('.token-count');
    const oldTokens = parseInt(countEl.textContent);
    Animations.updateCounter(countEl, newTokens, oldTokens);
  }

  onCombatAction(data) {
    // Handle each combat action individually with visual feedback
    const { actionType, message, removePasa, playerHealth, opponentHealth, playerTokens, opponentTokens } = data;

    // Show message at the bottom for combat actions
    this.announceCombat(message);

    // Remove pasa from display if specified
    if (removePasa) {
      removePasa.forEach(removal => {
        const zone = removal.player === 'player1' ? 
          (window.socketManager.playerRole === 'player1' ? this.elements.playerSelectedZone : this.elements.opponentSelectedZone) :
          (window.socketManager.playerRole === 'player2' ? this.elements.playerSelectedZone : this.elements.opponentSelectedZone);
        
        const pasaEl = zone.querySelector(`[data-pasa-id="${removal.pasaId}"]`);
        if (pasaEl) {
          // Animate removal
          pasaEl.style.transition = 'all 0.5s ease';
          pasaEl.style.opacity = '0';
          pasaEl.style.transform = 'scale(0.5)';
          setTimeout(() => {
            if (pasaEl.parentNode) {
              pasaEl.parentNode.removeChild(pasaEl);
            }
          }, 500);
        }
      });
    }

    // Update health displays if provided
    if (playerHealth !== undefined && opponentHealth !== undefined) {
      // Determine which is which based on player role
      if (window.socketManager.playerRole === 'player1') {
        this.updateHealthDisplay('player', playerHealth);
        this.updateHealthDisplay('opponent', opponentHealth);
      } else {
        this.updateHealthDisplay('player', opponentHealth);
        this.updateHealthDisplay('opponent', playerHealth);
      }
    }

    // Update token displays if provided
    if (playerTokens !== undefined && opponentTokens !== undefined) {
      if (window.socketManager.playerRole === 'player1') {
        this.updateTokenDisplay('player', playerTokens);
        this.updateTokenDisplay('opponent', opponentTokens);
      } else {
        this.updateTokenDisplay('player', opponentTokens);
        this.updateTokenDisplay('opponent', playerTokens);
      }
    }
  }

  onNewRound(data) {
    // Clear war zones
    Animations.clearWarZone(this.elements.playerSelectedZone);
    Animations.clearWarZone(this.elements.opponentSelectedZone);
    this.elements.playerPasaArea.innerHTML = '';
    this.elements.opponentPasaArea.innerHTML = '';
    this.elements.opponentRollStatus.textContent = '';

    // DO NOT update Devta cards - they persist throughout the game

    // Announce new round
    this.announcePhase('ran-neeti', 'New Round - Ran Neeti');

    // Enable controls if it's player's turn
    if (window.gameState.isMyTurn) {
      this.elements.rollPasaBtn.disabled = false;
    }
  }

  onGameOver(data) {
    const isWinner = data.winnerId === window.gameState.player.id;
    
    this.elements.gameOverTitle.textContent = isWinner ? 'Victory!' : 'Defeat';
    this.elements.gameOverMessage.textContent = isWinner ? 
      'You have won the battle!' : 
      `${data.winnerName} has won the battle!`;
    
    this.elements.gameOverModal.classList.add('active');
  }

  onOpponentDisconnected() {
    alert('Opponent disconnected. Game ended.');
    location.reload();
  }
}

// Don't instantiate here - will be done in main.js after all scripts load

