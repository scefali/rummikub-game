# Current Code Snapshot: Rummikub Online Multiplayer Game

## 1. Product + UX Overview

**What the app is:**
A real-time multiplayer Rummikub game built as a Progressive Web App (PWA). Players can create or join game rooms using short room codes, play the classic tile-manipulation game with 2-6 players, and receive email notifications when it's their turn. The app supports cross-device play via unique player codes, allowing users to seamlessly switch devices mid-game.

**Primary user flows:**
1. **Create/Join Game**: Players enter their name and either create a new room or join an existing one with a room code
2. **Lobby**: Host waits for players to join, can boot players, share room link, customize room background style
3. **Gameplay**: Players take turns drawing tiles, forming valid melds (runs/sets), manipulating tiles on the table, and ending their turn
4. **Cross-device**: Players receive email links with unique player codes to rejoin games from any device
5. **Game End**: When someone wins, scores are displayed and players can start a new game in the same lobby

**Key screens:**
- `/` - Home screen (create/join room)
- `/game/[code]` - Main game screen with lobby, active gameplay, or game end states
- Modals: Settings, drawn tile reveal, end game confirmation, player confirmation

## 2. Tech Stack + Architecture

### Frameworks
- **Frontend**: React 19.2.0 + Next.js 16.0.10 (App Router)
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS v4.1.9 (inline config in globals.css)
- **Icons**: Lucide React

### Data & State
- **Database**: Upstash Redis (serverless, key-value store)
- **State Management**: React useState + polling (no WebSocket, 1s client polls)
- **Data Fetching**: Client-side fetch to `/api/game` route handler

### Auth & Sessions
- **Auth**: Cookie-based player identification (no user accounts)
- **Per-game cookies**: `rummikub_player_{ROOMCODE}` stores playerId
- **Cross-device**: 6-character player codes for device switching
- **TTL**: Cookies set for 30 days, Redis rooms expire after 30 days

### Email
- **Provider**: Resend API
- **Templates**: React Email components in `/lib/emails/`
- **Use cases**: 
  - Turn notifications (when it's your turn)
  - Game link emails (when game starts, includes rejoin link)
  - Game results (when game ends, shows final scores)

### Storage
- **Images**: Inline placeholder SVGs via Next.js `/placeholder.svg` route
- **PWA assets**: Static files in `/public/` (manifest, service worker, icons)

### Deployment
- Vercel (implied by environment setup, no explicit config file)
- Environment variables: `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`

### Analytics
- `@vercel/analytics` package installed (basic Vercel analytics)

## 3. Project Structure Map

```
/app
  /api/game/route.ts           # Single API route for all game actions
  /game/[code]/
    page.tsx                    # Server component: checks cookies, handles auth
    game-page-client.tsx        # Client wrapper for player confirmation flow
    game-client.tsx             # Main game orchestrator (polling, state, actions)
    loading.tsx                 # Loading UI for game page
  layout.tsx                    # Root layout with metadata
  page.tsx                      # Home page (server component)
  loading.tsx                   # Loading UI for home
  globals.css                   # Tailwind config + global styles

/components
  home-client.tsx               # Create/join room UI with tabs
  lobby-screen.tsx              # Pre-game lobby with player list, start button
  game-board.tsx                # Desktop game UI (melds, hand, controls)
  player-controller.tsx         # Mobile game UI (compact layout)
  game-end-screen.tsx           # Post-game results and "play again" button
  game-tile.tsx                 # Individual tile component (visual + interaction)
  meld-display.tsx              # Renders a meld with tiles, points, actions menu
  player-hand.tsx               # Player's hand display with drag-select
  settings-modal.tsx            # Game settings (sound, notifications, room style)
  notification-prompt.tsx       # Browser push notification permission UI
  player-confirm-modal.tsx      # Confirms player identity when using shared link
  room-style-selector.tsx       # Dropdown for changing room background (deprecated, moved to settings)
  /ui/*                         # shadcn/ui components (button, card, dialog, etc.)

/lib
  game-types.ts                 # TypeScript types for entire game domain
  game-logic.ts                 # Pure functions: validation, tile generation, rules
  game-store.ts                 # Redis operations: CRUD for rooms, game state updates
  cookies.ts                    # Server actions for reading/writing player cookies
  email.ts                      # Email sending functions (wrappers around Resend)
  settings.ts                   # LocalStorage for client settings (sound, volume)
  notifications.ts              # Browser push notification + sound playback
  name-generator.ts             # Auto-generate fun player names
  use-game-socket.ts            # Custom hook for polling game state (not WebSocket)
  utils.ts                      # cn() for class merging

  /emails/
    game-link.tsx               # Email: game start with rejoin link
    turn-notification.tsx       # Email: it's your turn notification
    game-results.tsx            # Email: game end results (scores)

/public
  manifest.json                 # PWA manifest
  sw.js                         # Service worker for PWA
  /icons/                       # PWA icons (192, 512, favicon, apple-icon)

/hooks
  use-mobile.ts                 # Detects mobile viewport
  use-toast.ts                  # Toast notification hook

/styles
  globals.css                   # Legacy CSS file (unused, app/globals.css is active)
```

## 4. Routing + Screens Inventory

| Route/Path | Screen Name | What It Does | Data Dependencies | Auth Requirements | Key Components |
|------------|-------------|--------------|-------------------|-------------------|----------------|
| `/` | Home | Create or join game | None | None | `home-client.tsx` |
| `/game/[code]` | Game Room | Lobby → Playing → End screen | Polls `/api/game` (get_state) every 1s | Cookie check for playerId, player code in URL for cross-device | `game-client.tsx`, `lobby-screen.tsx`, `game-board.tsx`, `player-controller.tsx`, `game-end-screen.tsx` |
| `/api/game` | API Endpoint | Handles all game actions | Redis (`game-store.ts`) | Per-action auth checks | N/A (server route) |

## 5. Data Model Inventory

**No formal ORM or migrations.** Data model is defined in TypeScript types and stored as JSON in Redis.

### Key Models (from `lib/game-types.ts`)

#### `Tile`
```typescript
{
  id: string                    // Unique tile ID
  color: "red" | "blue" | "yellow" | "black"
  number: number                // 1-13, or 0 for joker
  isJoker: boolean
  assignedNumber?: number       // What number this joker represents in a meld
  assignedColor?: TileColor     // What color this joker represents (for sets)
}
```

#### `Meld`
```typescript
{
  id: string
  tiles: Tile[]                 // 3+ tiles forming a valid run or set
}
```

#### `Player`
```typescript
{
  id: string                    // Generated per session
  name: string
  isHost: boolean
  hand: Tile[]
  hasInitialMeld: boolean       // Has placed 25-30+ points for first meld
  isConnected: boolean
  email?: string
  playerCode: string            // 6-char code for cross-device login
  lastSeenMeldTileIds?: string[] // Tracks what tiles player last saw on board
}
```

#### `GameState`
```typescript
{
  phase: "lobby" | "playing" | "ended"
  players: Player[]
  currentPlayerIndex: number
  melds: Meld[]
  tilePool: Tile[]              // Remaining tiles to draw
  winner: string | null         // Player ID of winner
  turnStartMelds: Meld[]        // Snapshot at turn start (for undo/validation)
  turnStartHand: Tile[]         // Snapshot of hand at turn start
  workingArea: Tile[]           // Tiles taken from board being rearranged
  rules?: GameRules             // Dynamic rules based on player count
}
```

#### `Room`
```typescript
{
  code: string                  // 4-char uppercase room code
  gameState: GameState
  createdAt: number             // Unix timestamp
  roomStyleId: RoomStyleId      // "classic" | "ocean" | "forest" | "sunset" | "neon"
}
```

#### `GameRules`
```typescript
{
  mode: "standard" | "large"    // Standard = 2-4 players, Large = 5-6 players
  startingHandSize: number      // 14 for standard, 12 for large
  initialMeldThreshold: number  // 30 for standard, 25 for large
}
```

### Redis Storage
- **Key pattern**: `room:{ROOMCODE}` (e.g., `room:ABCD`)
- **TTL**: 30 days
- **Structure**: Entire `Room` object serialized as JSON

## 6. API / Server Endpoints Inventory

All game actions go through **POST `/api/game`** with JSON body.

### Actions (switch on `action` field)

| Action | Purpose | Auth | Request Shape | Response Shape | File |
|--------|---------|------|---------------|----------------|------|
| `create_room` | Creates new game room | None | `{ playerName, playerEmail? }` | `{ roomCode, playerId, playerCode, gameState, roomStyleId }` | `app/api/game/route.ts` |
| `join_room` | Joins existing room | None | `{ roomCode, playerName, playerEmail? }` | `{ success, playerId, playerCode, gameState, roomStyleId, error? }` | `app/api/game/route.ts` |
| `login_with_code` | Cross-device login | None | `{ roomCode, playerCode }` | `{ success, playerId, playerName, error? }` | `app/api/game/route.ts` |
| `get_state` | Fetches current game state | Requires `playerId` | `{ roomCode, playerId }` | `{ gameState, roomStyleId }` | `app/api/game/route.ts` |
| `start_game` | Starts game from lobby | Host only | `{ roomCode, playerId }` | `{ success, error? }` + sends game link emails | `app/api/game/route.ts` |
| `play_tiles` | Updates melds/hand/working area | Current player only | `{ roomCode, playerId, melds, hand, workingArea }` | `{ success, error? }` | `app/api/game/route.ts` |
| `draw_tile` | Draws tile and ends turn | Current player only | `{ roomCode, playerId }` | `{ success, drawnTile?, error? }` + sends turn notification email | `app/api/game/route.ts` |
| `end_turn` | Validates and ends turn | Current player only | `{ roomCode, playerId }` | `{ success, gameEnded?, winner?, error? }` + sends turn notification email | `app/api/game/route.ts` |
| `reset_turn` | Reverts to turn start state | Current player only | `{ roomCode, playerId }` | `{ success, error? }` | `app/api/game/route.ts` |
| `end_game` | Resets game to lobby | Any player | `{ roomCode, playerId }` | `{ success, error? }` | `app/api/game/route.ts` |
| `leave` | Disconnects player | Any player | `{ roomCode, playerId }` | `{ success }` | `app/api/game/route.ts` |
| `change_room_style` | Changes background | Host only | `{ roomCode, playerId, styleId }` | `{ success, error? }` | `app/api/game/route.ts` |
| `boot_player` | Kicks player from lobby | Any player (lobby only) | `{ roomCode, playerId, targetPlayerId }` | `{ success, error? }` | `app/api/game/route.ts` |

### Implementation Details
- All actions in **`app/api/game/route.ts`**
- Game logic delegated to **`lib/game-store.ts`** (Redis ops) and **`lib/game-logic.ts`** (pure functions)
- Email sending is fire-and-forget (`.catch()` for errors)

## 7. State + Caching + Side Effects

### State Management
- **Local React state**: `useState` in client components for UI state
- **Global game state**: Fetched via polling (every 1s) from `/api/game?action=get_state`
- **No state libraries**: No Redux, Zustand, Jotai, etc.

### Polling Strategy
- **Hook**: `lib/use-game-socket.ts` (misleading name, uses `setInterval` not WebSocket)
- **Frequency**: 1000ms intervals
- **Purpose**: Keeps all clients in sync with Redis game state
- **Optimization**: Only re-renders when `gameState` changes (shallow comparison)

### Mutations
- **Optimistic updates**: None (players wait for server response + next poll)
- **Pattern**: 
  1. User action → `fetch('/api/game')` 
  2. Server updates Redis
  3. Next poll returns updated state
  4. Component re-renders

### Side Effects
- **Email notifications**: Sent on `end_turn`, `draw_tile`, `start_game` actions
- **Sound notifications**: Client-side Web Audio API via `lib/settings.ts`
- **Browser push**: Via `lib/notifications.ts` (user must grant permission)

### No Background Jobs
- No queues, no cron jobs, no background workers
- All logic is request-driven (API calls trigger everything)

### Rate Limits
- **None implemented** (vulnerable to spam, rapid room creation, etc.)

## 8. UI Component System + Styling Rules

### Component Library
- **shadcn/ui**: Pre-built components in `/components/ui/`
- **Radix UI**: Headless primitives under the hood
- **Custom components**: Game-specific UI in `/components/`

### Styling
- **Method**: Tailwind CSS v4 (no `tailwind.config.js`, config in `app/globals.css`)
- **Approach**: Utility-first, inline classes
- **Theme tokens**: CSS variables in `app/globals.css` for colors, radius
- **Responsive**: Mobile-first with `md:` and `lg:` breakpoints
- **Dynamic styles**: Room background uses `ROOM_STYLES` object in `game-types.ts`

### Layout Conventions
- **Flexbox** for most layouts (`flex`, `items-center`, `justify-between`)
- **Grid** for tile layouts (`grid`, `grid-cols-*`, `gap-*`)
- **Modals**: `Dialog` component from shadcn/ui
- **Mobile sheets**: `Sheet` component for bottom drawers

### Form Patterns
- **react-hook-form** + **zod**: Installed but not heavily used
- **Validation**: Mostly in `lib/game-logic.ts` (server-side game rules)
- **No complex forms**: Simple inputs for name/email/room code

### Where to Add New UI
- **Game screens**: Add to `/components/` root (e.g., `new-feature-screen.tsx`)
- **Reusable UI**: Add to `/components/ui/` (follow shadcn pattern)
- **Modals**: Use `Dialog` component, typically inline in parent component

### Accessibility
- **Keyboard nav**: Some support (Escape to deselect tiles)
- **ARIA**: Basic Radix UI defaults
- **Screen readers**: Minimal (no sr-only text for most elements)
- **Color contrast**: Not systematically checked

## 9. Configuration + Environment Variables

### Required Env Vars
```bash
# Redis (Upstash)
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=...

# Email (Resend)
RESEND_API_KEY=re_...

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
```

### Optional Env Vars
- None currently

### Local Dev Setup
1. Clone repo
2. Install: `pnpm install`
3. Create `.env.local` with env vars above
4. Run: `pnpm dev`
5. Open: `http://localhost:3000`

### Config Files
- **`next.config.mjs`**: Empty (default Next.js config)
- **`components.json`**: shadcn/ui config (Tailwind paths, aliases)
- **`tsconfig.json`**: TypeScript config with path aliases (`@/*`)

## 10. Feature Extension Guide (MOST IMPORTANT)

### How to Add a New Page
1. **Create route**: `/app/your-page/page.tsx`
2. **If dynamic**: `/app/your-page/[id]/page.tsx`
3. **Add link**: Update navigation in `/components/home-client.tsx` or `/app/layout.tsx`
4. **If protected**: Check cookie in server component (see `/app/game/[code]/page.tsx` pattern)

### How to Add a New API Endpoint
1. **Add action**: In `/app/api/game/route.ts`, add new case to switch statement:
   ```typescript
   case "your_action": {
     const result = await gameStore.yourFunction(roomCode, playerId, ...params)
     return NextResponse.json(result)
   }
   ```
2. **Add game-store function**: In `/lib/game-store.ts`, create function:
   ```typescript
   export async function yourFunction(roomCode: string, playerId: string, ...params) {
     const room = await getRoom(roomCode)
     // ... logic ...
     await setRoom(room)
     return { success: true }
   }
   ```
3. **Add game-logic helper** (if needed): Pure functions in `/lib/game-logic.ts`
4. **Call from client**: Use `fetch('/api/game', { method: 'POST', body: ... })`

### How to Add a New DB Model/Field
1. **Update types**: Add to `/lib/game-types.ts` (e.g., new field in `Player` or `GameState`)
2. **Update initialization**: Modify `initializeGame()` or `createRoom()` in `/lib/game-store.ts`
3. **No migrations needed**: Redis stores JSON, changes take effect immediately
4. **Handle old data**: Add default values or migration logic in `getRoom()` if backward compat needed

### How to Add New Analytics Events
1. **Install tracker**: Already has `@vercel/analytics` package
2. **Track event**: Import and call in component:
   ```typescript
   import { track } from '@vercel/analytics'
   track('event_name', { property: value })
   ```
3. **Common places**: Button clicks, game state changes, errors

### How to Gate Behind Auth/Roles
- **Current auth**: Cookie-based playerId, no roles
- **Host checks**: In API actions, check `player.isHost`:
  ```typescript
  const player = room.gameState.players.find(p => p.id === playerId)
  if (!player?.isHost) return { error: "Only host can do this" }
  ```
- **Turn checks**: Check `currentPlayerIndex`:
  ```typescript
  if (room.gameState.players[room.gameState.currentPlayerIndex].id !== playerId) {
    return { error: "Not your turn" }
  }
  ```

### How to Add a New Setting/Config
1. **LocalStorage setting**: Add to `/lib/settings.ts`:
   ```typescript
   export function getYourSetting(): boolean {
     return localStorage.getItem('your_setting') === 'true'
   }
   export function setYourSetting(value: boolean) {
     localStorage.setItem('your_setting', String(value))
   }
   ```
2. **Game-wide setting**: Add to `Room` or `GameState` in `/lib/game-types.ts`
3. **UI**: Add to `/components/settings-modal.tsx`

### How to Add a New Background Task
- **Current**: No background task system
- **To add**: Would need to set up Vercel Cron or external service
- **Pattern**: Create `/app/api/cron/your-task/route.ts` and configure `vercel.json`

### How to Add a New Email Template
1. **Create template**: `/lib/emails/your-email.tsx` (React Email component)
2. **Add sender function**: In `/lib/email.ts`:
   ```typescript
   export async function sendYourEmail(to: string, ...params) {
     const emailHtml = await render(<YourEmail ...params />)
     return resend.emails.send({
       from: 'Rummikub <noreply@...>',
       to,
       subject: '...',
       html: emailHtml,
     })
   }
   ```
3. **Call from API**: In `/app/api/game/route.ts`, call `sendYourEmail().catch(err => ...)`

## 11. Known Risks / Gotchas

### Session Persistence Issues
- **Problem**: Users report getting "booted" after ~12 hours
- **Likely cause**: Cookie expiration or Redis key eviction (TTL is 30 days, but implementation may have bugs)
- **Workaround**: Boot + re-invite flow, email with player code for cross-device login

### No WebSocket, Only Polling
- **Risk**: Polling every 1s creates constant traffic, scales poorly with many concurrent games
- **Impact**: Could hit API rate limits, increase database load, delay updates
- **Mitigation**: Consider implementing real WebSocket or SSE for game state updates

### No Rate Limiting
- **Risk**: Anyone can spam `create_room`, `join_room`, or `play_tiles` actions
- **Impact**: Redis abuse, email spam (Resend rate limits), potential DoS
- **Mitigation**: Add rate limiting middleware or use Vercel's built-in protection

### Email Sending is Fire-and-Forget
- **Risk**: Failed emails are logged but not retried
- **Impact**: Players miss turn notifications or game links
- **Mitigation**: Add email queue or retry logic (e.g., Vercel Queue or Upstash Workflow)

### Cookie Scoping
- **Risk**: Cookies are per-game (`rummikub_player_{ROOMCODE}`), but if two players join same room from same browser, cookies collide
- **Impact**: Second player overwrites first player's cookie
- **Mitigation**: Warn users or use player code exclusively (no cookies)

### No Input Validation on Client
- **Risk**: Malicious clients can send arbitrary tile/meld data to API
- **Impact**: Cheating, game state corruption
- **Mitigation**: Validate ALL moves on server (most validation exists in `game-logic.ts`, ensure it's called)

### Large Game State in Redis
- **Risk**: With 106 tiles + multiple melds, `Room` JSON can grow large
- **Impact**: Slow Redis reads/writes, polling latency
- **Mitigation**: Compress game state or split into multiple keys

### No CSRF Protection
- **Risk**: API endpoints have no CSRF tokens
- **Impact**: Malicious sites could trigger game actions if user is logged in
- **Mitigation**: Add CSRF middleware or use Next.js Server Actions (which have CSRF built-in)

### Hardcoded Pacific Time in Emails
- **Risk**: All email timestamps use US Pacific (America/Los_Angeles)
- **Impact**: Confusing for international players
- **Mitigation**: Accept user timezone preference or use UTC everywhere

### No Spectator Mode
- **Risk**: Players who are booted or disconnect can't watch the game
- **Impact**: Poor UX for reconnecting players
- **Mitigation**: Add spectator role or "observing" state

### Tile IDs Not Cryptographically Secure
- **Risk**: Tile IDs use `Math.random()` (predictable)
- **Impact**: Theoretically could guess tile IDs and cheat
- **Mitigation**: Use `crypto.randomUUID()` instead

---

## Quick Reference: Key Files by Feature

| Feature | Key Files |
|---------|-----------|
| **Tile validation** | `lib/game-logic.ts` (`isValidRun`, `isValidSet`, `canEndTurn`) |
| **Redis operations** | `lib/game-store.ts` (all functions) |
| **Email sending** | `lib/email.ts`, `lib/emails/*.tsx` |
| **Polling game state** | `lib/use-game-socket.ts`, `app/game/[code]/game-client.tsx` |
| **Cookie management** | `lib/cookies.ts`, `app/game/[code]/page.tsx` |
| **Settings (sound, style)** | `lib/settings.ts`, `components/settings-modal.tsx` |
| **Tile rendering** | `components/game-tile.tsx` |
| **Meld display** | `components/meld-display.tsx` |
| **Desktop game UI** | `components/game-board.tsx` |
| **Mobile game UI** | `components/player-controller.tsx` |
| **Lobby** | `components/lobby-screen.tsx` |
| **Game end** | `components/game-end-screen.tsx` |
| **Home page** | `components/home-client.tsx` |
| **API entry point** | `app/api/game/route.ts` |
| **Type definitions** | `lib/game-types.ts` |
| **Name generation** | `lib/name-generator.ts` |
| **Notifications** | `lib/notifications.ts` |

---

**End of snapshot. Use this as a reference when crafting v0 prompts for new features or bug fixes.**
