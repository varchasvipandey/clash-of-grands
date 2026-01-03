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
    this.elements.tossMessage.textContent = `You chose ${choice}. Flipping...`;
    
    // Start coin flip animation
    Animations.flipCoin(this.elements.coin, choice);
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
    this.elements.tossResultMessage.textContent = isWinner ? 
      'You will go first' : 'You will go second';
    
    this.elements.tossResultModal.classList.add('active');
  }

  onGameStart(data) {
    // Display Devta cards
    this.displayDevtaCard(this.elements.playerDevtaCard, window.gameState.player.devtaCard);
    this.displayDevtaCard(this.elements.opponentDevtaCard, window.gameState.opponent.devtaCard);

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
      // Show opponent's selected pasa count
      const pasaEl = document.createElement('div');
      pasaEl.className = 'pasa pasa-small';
      pasaEl.textContent = '?';
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

  showDevtaEffect(data) {
    // Show visual effect for Devta card activation
    const message = `${data.cardName}: ${data.effect}`;
    this.announcePhase('devta-effect', message);
    
    if (data.targetHealth !== undefined) {
      const isPlayer = data.playerId === window.gameState.player.id;
      this.updateHealthDisplay(isPlayer ? 'opponent' : 'player', data.targetHealth);
    }
  }

  onCombatResolved(data) {
    // Determine which player we are and assign data accordingly
    let myData, opponentData;
    if (window.socketManager && window.socketManager.playerRole === 'player1') {
      myData = data.player1;
      opponentData = data.player2;
    } else {
      myData = data.player2;
      opponentData = data.player1;
    }

    // Update health and tokens
    this.updateHealthDisplay('player', myData.health);
    this.updateHealthDisplay('opponent', opponentData.health);
    this.updateTokenDisplay('player', myData.tokens);
    this.updateTokenDisplay('opponent', opponentData.tokens);

    // Animate combat log
    this.animateCombat(data.combatLog);
  }

  animateCombat(combatLog) {
    // Simple combat animation
    let delay = 0;
    combatLog.forEach(log => {
      setTimeout(() => {
        let message = '';
        if (log.type === 'block') {
          message = `${log.move} blocked by ${log.block}!`;
        } else if (log.type === 'damage') {
          message = `${log.attacker} deals damage!`;
        } else if (log.type === 'steal') {
          message = `${log.attacker} steals a token!`;
        }
        
        if (message) {
          this.announcePhase('combat', message);
        }
      }, delay);
      delay += 800;
    });
  }

  onNewRound(data) {
    // Clear war zones
    Animations.clearWarZone(this.elements.playerSelectedZone);
    Animations.clearWarZone(this.elements.opponentSelectedZone);
    this.elements.playerPasaArea.innerHTML = '';
    this.elements.opponentPasaArea.innerHTML = '';
    this.elements.opponentRollStatus.textContent = '';

    // Update Devta cards
    this.displayDevtaCard(this.elements.playerDevtaCard, data.player1Devta);
    this.displayDevtaCard(this.elements.opponentDevtaCard, data.player2Devta);

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

