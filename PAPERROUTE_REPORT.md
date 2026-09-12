# PaperRoute Website Reverse Engineering Report

## Overview
PaperRoute is a browser-based 3D bicycle paper delivery game hosted at https://www.paperroute.lol/. The site consists of a marketing landing page and an interactive WebGL game.

## Tech Stack

### Frontend
- **Build Tool**: Vite (detected from `__vite__mapDeps` and module loading patterns)
- **3D Engine**: Three.js r185 (detected from `data-engine="three.js r185"` and Three.js patterns)
- **Language**: Vanilla JavaScript (no React/Vue/Angular detected)
- **Styling**: CSS with newspaper-themed design
- **Fonts**: Libre Baskerville, Roboto Condensed (Google Fonts)

### Backend
- **Database**: Supabase (explicitly mentioned in leaderboard privacy section)
- **API**: Custom `/api/*` endpoints (not directly Supabase client)

### Hosting
- **Platform**: Vercel (mentioned in devlog)
- **GitHub Repo**: https://github.com/sketchymedia/Paperroute

### 3D Assets
- **Format**: GLB (glTF binary) files
- **Assets**: houses, dog, rider, foliage, sky textures
- **Tools**: Blender (mentioned in devlog for asset creation)

## Site Architecture

### Pages
1. **`/`** - Landing page with game description, controls, hazards, and gallery
2. **`/play/`** - Main game application
3. **`/leaderboard/`** - Public leaderboard
4. **`/devlog/`** - Development progress log

### Game Structure
The game uses a state machine with phases:
- `dayIntro` - Day introduction screen
- `riding` - Active gameplay
- `course` - Course/route rendering
- `paused` - Paused state
- `ready` - Ready to start
- `complete` - Week complete

## API Endpoints

### 1. `POST /api/register`
Registers a new player entry.

**Request Body**:
```json
{
  "email": "string",
  "handle": "string",
  "token": "string (32-char hex)",
  "website": "string (optional)"
}
```

**Response**:
```json
{
  "handle": "string"
}
```

**Notes**:
- Token is a 32-character hex string generated client-side using `crypto.getRandomValues`
- Handle must match `/^[a-z0-9_]{1,15}$/`
- Email is stored privately in Supabase
- Handle is public

### 2. `POST /api/runs`
Submits a completed game run.

**Request Body**:
```json
{
  "token": "string",
  "score": "number",
  "day": "number (0-6)",
  "delivered": "number",
  "total": "number",
  "runId": "string (32-char hex, optional for v2)",
  "version": 2,
  "rulesVersion": "number",
  "activeTicks": "number",
  "weekComplete": "boolean"
}
```

**Notes**:
- Supports offline queuing (up to 100 runs in localStorage)
- Run deduplication by `runId`
- Version 2 format includes additional metadata

### 3. `GET /api/leaderboard?version=2`
Retrieves the public leaderboard.

**Response**:
```json
[
  {
    "rank": 1,
    "name": "@handle",
    "score": 40468,
    "grade": "S",
    "days": 7,
    "activeTicks": 23062,
    "weekComplete": false,
    "rulesVersion": 1
  }
]
```

**Fields**:
- `rank` - Position on leaderboard
- `name` - Player handle (public)
- `score` - Total points
- `grade` - Overall grade (S/A/B/C)
- `days` - Days completed this week
- `activeTicks` - Total play time in ticks (1 tick = ~16.67ms at 60fps)
- `weekComplete` - Whether the full 7-day week was completed
- `rulesVersion` - Rules version used

## Game Mechanics

### Core Gameplay
- 7-day week cycle (Monday to Sunday)
- 40 houses per route, 10 subscribers per day
- 3 lives per day
- Paper throwing mechanics with timing windows
- Score multiplier based on streak

### Hazards
- **Dog**: Chases player, can be distracted with papers
- **Radar**: Shows upcoming mailboxes
- **Traffic**: Cars and children as obstacles
- **Potholes**: Slow down rider

### Scoring
- Clean delivery: +100 points
- Streak multiplier: up to 5x
- Perfect day: 2,500 points + new subscriber
- Grades: S, A, B, C based on performance

### Controls
- **Desktop**: Arrow keys (steer, pedal/brake), Space (deliver), X (smash), Mouse (aim)
- **Mobile**: Drag to steer, drag up/down for speed, tap to deliver, hold second finger to smash

## Data Storage

### Client-side
- `paperroute.entry.v1` - Player entry in localStorage
- Offline run queue (max 100 runs)
- Player name persistence

### Server-side
- Supabase database stores:
  - Player entries (email + handle)
  - Run results with timestamps
  - Leaderboard rankings

## Security & Privacy

- Email addresses are private (never returned by leaderboard API)
- No login/verification required (as of launch)
- Player handles are public
- Run data includes public stats (score, grade, days, time)
- Synthetic launch scores included in leaderboard

## Development Info

- Built with Graft (AI-assisted development tool)
- GPT Astra used for art generation
- 35 hours tracked development time
- 1.51B tokens used
- 69 checkpoints recorded
- Blender for 3D asset creation
- 311 unit tests passing at launch

## Asset URLs

### Game Assets
- `/art/playable-houses.glb`
- `/art/playable-dog.glb`
- `/art/joyful-pilot.glb`
- `/art/grumpy-newsman.glb`
- `/art/posed-rider.glb`
- `/art/painted-foliage.png`

### Landing Assets
- `/art/landing/*.webp` - Various marketing images
- `/art/og.png` - Open Graph image
- `/favicon*.png` - Favicon assets

## Interesting Technical Details

1. **WebGL Requirement**: Game requires WebGL 2 support
2. **Offline Support**: Runs can be queued offline and uploaded later
3. **Deterministic Testing**: Browser tests use controlled clocks for deterministic behavior
4. **Performance**: Frame pacing optimizations, reduced motion support
5. **Share Cards**: PNG generation for sharing results
6. **Weather System**: Dynamic weather based on URL parameters
7. **Audio**: Web Audio API with music and sound effects
