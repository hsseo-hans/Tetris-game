# Copilot Instructions for Tetris VS AI Game

## Project Overview
This is a browser-based Tetris game where a human player competes against an AI bot in real-time. The game features competitive gameplay with attack mechanics, multiple difficulty levels, audio, internationalization, and persistent records.

## Architecture
- **Entry Point**: `index.html` - Main HTML with UI layout and ES6 module imports
- **Core Logic**: `js/core.js` - Tetris mechanics (piece creation, collision, rotation, grid merging)
- **Game Loop**: `js/main.js` - Handles game state, player input, rendering, UI updates, and game flow
- **AI Opponent**: `js/bot.js` - Implements Tetris AI with configurable difficulty using heuristic evaluation
- **Audio System**: `js/audio.js` - Web Audio API for BGM and sound effects
- **Configuration**: `js/constants.js` - Game constants, i18n strings, and music data
- **Styling**: `style.css` - Responsive layout with dark theme and visual effects

## Key Patterns & Conventions

### Module Structure
- Use ES6 imports/exports for clean separation of concerns
- Main game state managed in `main.js` with a central `state` object
- Core Tetris functions in `core.js` are pure and reusable

### Game State Management
```javascript
const state = {
    grid: [], // 20x10 player grid
    opponent: { grid:[], score:0, isAI:true, bot:null },
    player: { pos:{x:0,y:0}, matrix:null, score:0 },
    // ... other state
};
```
- Grid is 20 rows x 10 columns, represented as 2D arrays
- Garbage lines added to bottom rows at game start for competitive feel

### AI Implementation
- Bot evaluates all possible piece placements using weighted heuristics
- Difficulty levels adjust speed and evaluation weights:
  - Easy: Fast but poor decisions
  - Normal: Balanced
  - Hard: Slow but optimal play
  - Super Hard: Extremely aggressive with high line clear priority

### Rendering
- Canvas-based rendering with 32px blocks
- Separate canvases for player, opponent, and next piece preview
- Ghost piece shows hard drop preview
- Gradient fills and shadows for visual polish

### Audio System
- Web Audio API oscillators for procedural music generation
- Multiple BGM tracks with different styles (classic, synth, guitar)
- Sound effects for game events (drop, clear, attack)

### Internationalization
- Strings stored in `constants.js` with ko/ja/en support
- Language detection from browser locale
- Dynamic font switching for each language

### Persistent Data
- Player profile image and nickname stored in localStorage
- Win/loss records with automatic difficulty adjustment based on ratio

## Development Workflow
- **No build process** - Direct browser execution of ES6 modules
- **Testing**: Open `index.html` in modern browser (Chrome recommended for Web Audio)
- **Debugging**: Use browser dev tools; game state logged to console
- **Audio**: First user interaction initializes audio context

## Common Tasks

### Adding New Features
1. Extend `state` object in `main.js` for new game state
2. Add UI elements to `index.html` with data-i18n attributes
3. Update strings in `constants.js` for all languages
4. Implement logic in appropriate module (core.js for mechanics, main.js for UI)

### Modifying AI Behavior
- Adjust weights in `bot.js` constructor for different playstyles
- Add new heuristics to the evaluation function
- Modify speed values for responsiveness

### Adding Audio
- Define new tracks in `BGM_DATA` in `constants.js`
- Use `playSFX()` for sound effects with predefined types
- Volume controlled globally via `setAudioVolume()`

### Balancing Gameplay
- Attack system: Lines cleared send garbage to opponent
- Timer-based games (3 minutes default)
- Score = lines cleared × 100

## File Organization
- `js/` - All JavaScript modules
- Root level: HTML entry points and CSS
- No assets folder - images generated procedurally or via data URLs

## Browser Compatibility
- Modern browsers with ES6 module support
- Web Audio API (falls back gracefully if unavailable)
- Canvas 2D context
- localStorage for persistence