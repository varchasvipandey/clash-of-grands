# Norse Board Game

A socket-based 1v1 multiplayer board game inspired by Orlog from Assassin's Creed Valhalla. Strategic dice rolling meets divine intervention in this ancient-themed battle game.

## Features

- **Real-time Multiplayer**: WebSocket-based gameplay with instant synchronization
- **Strategic Dice Rolling**: Choose which dice to keep across 3 rolls
- **Divine Favors**: Use Vardan Tokens to invoke powerful Devta cards
- **Three-Phase Combat**: Ran Neeti (Strategy) → Devik Vardan (Divine Favor) → Yudh (Battle)
- **Ancient Theme**: Copper and brown aesthetic with smooth animations
- **No Database**: Player profiles stored in browser localStorage

## Game Elements

### Pasa (Dice)
Each player has 6 dice with 6 faces:
- **Bhala**: Hand-held weapon (1 damage)
- **Teer**: Ranged weapon (1 damage)
- **Kavach**: Armor (blocks Bhala)
- **Dhal**: Shield (blocks Teer)
- **Kapat**: Trickery (steals 1 Vardan Token)
- **Yagya**: Special face that grants +1 Vardan Token

### Devta Cards
Four powerful gods with unique abilities:
- **Bali**: The Gada Bearer - Deals 5 damage (4 tokens)
- **Arjun**: Master of Arrows - Removes all opponent Dhal (6 tokens)
- **Kahna**: The Master Mind - Removes opponent's Vardan Tokens (6 tokens)
- **Prithvi**: Earth Goddess - Heals 3 health (5 tokens)

### Resources
- **Arogya Mani** (Health Stones): Start with 20, lose when depleted
- **Vardan Tokens**: Start with 2, earn more through Yagya faces

## Installation

1. **Clone or download** this repository

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open the game**:
   - Navigate to `http://localhost:3000` in your browser
   - Open a second browser window/tab for the second player
   - Minimum screen size: 1280x720 pixels

## How to Play

### Setup
1. Create your profile (username + avatar color)
2. Click "Find Match" to enter matchmaking queue
3. Wait for an opponent to connect

### Coin Toss (Sikka)
- Choose heads or tails
- Winner goes first in all phases

### Phase 1: Ran Neeti (Strategy)
1. Roll your 6 dice
2. Select which dice to keep
3. Re-roll remaining dice (up to 3 rolls total)
4. Players alternate turns
5. Complete when both players have selected 6 dice

### Phase 2: Devik Vardan (Divine Favor)
- Decide whether to use your Devta card
- Opponent can see your card but not if you're using it
- Requires spending Vardan Tokens

### Phase 3: Yudh (Battle)
1. **Beginning**: Priority-based Devta effects execute
2. **Combat Resolution**:
   - Yagya faces grant Vardan Tokens
   - Defenses block attacks (Kavach blocks Bhala, Dhal blocks Teer)
   - Unblocked attacks deal damage
   - Kapat steals Vardan Tokens
3. **End**: End-phase Devta effects execute
4. Check win condition or start new round

### Victory
First player to reduce opponent's Arogya Mani to 0 wins!

## Technical Stack

- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Storage**: Browser localStorage (no database)
- **Real-time**: WebSocket communication

## File Structure

```
boardgame/
├── server.js              # WebSocket server & game logic
├── package.json           # Dependencies
├── index.html             # Main HTML structure
├── css/
│   └── styles.css         # Ancient-themed styling
└── js/
    ├── gameData.js        # Game constants & data
    ├── socket.js          # Socket.IO client wrapper
    ├── animations.js      # Animation utilities
    ├── gameState.js       # Game state manager
    ├── ui.js              # UI controller
    └── main.js            # Application entry point
```

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

**Note**: Requires JavaScript enabled and minimum 1280x720 screen resolution.

## Game Rules Summary

- **Starting Health**: 20 Arogya Mani
- **Starting Tokens**: 2 Vardan Tokens
- **Max Rolls**: 3 per round
- **Dice Count**: 6 per player
- **Turn Order**: Determined by coin toss, maintained throughout game
- **Win Condition**: Reduce opponent health to 0

## Credits

Inspired by Orlog from Assassin's Creed Valhalla by Ubisoft.

## License

MIT License - Feel free to modify and distribute.
