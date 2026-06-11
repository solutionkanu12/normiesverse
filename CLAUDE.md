# NormiesVerse — Project Context

This file is read automatically by Claude Code every session. It is the source of truth for what we're building and the rules that govern it.

---

## What we're building

**NormiesVerse** is a browser-based 3D adventure game where players connect a wallet, choose a Normie NFT, and explore universes generated from that Normie's on-chain data. The chosen Normie becomes the player's avatar and the seed for their entire game world.

The player connects → if they own Normies, they pick one; if not, they choose any Normie ID (0–9999) → the Normie becomes their identity → they enter the **Nexus** (a space station between realities) → they travel through portals into universes generated from Normie data → recover Reality Cores → defeat the final boss, the Null Normie.

---

## THE CORE RULE (non-negotiable)

**Normies are NOT skins. Normies are the foundation of the entire game.**

The game must not function the same way if the Normies API is removed. Every system — avatar, world generation, quests, lore, progression, enemies, the boss — must derive from live Normies API data. No fake data. No placeholders. No hardcoded worlds. If a feature could work without the API, it's built wrong.

---

## Tech stack

- Next.js (App Router) + React + TypeScript
- React Three Fiber + Drei + Three.js (all 3D)
- @react-three/rapier (physics)
- @react-three/postprocessing (bloom, chromatic aberration)
- TailwindCSS (UI styling)
- Framer Motion (2D UI animation)
- Zustand (state management)
- Solana Wallet Adapter + Phantom + WalletConnect (wallet identity)
- Read-only wallet interaction. NEVER request private keys or seed phrases. NEVER request transaction signing.

Note: Normies live on **Ethereum**. The Solana wallet is for player identity/connection only — ownership of Normies is read via the Normies API. Keep these two concerns separate.

---

## NORMIES API REFERENCE

Base URL: `https://api.normies.art`
No API key required. Rate limit: **60 requests per minute per IP** (sliding window). Build a caching layer and respect this limit everywhere.

10,000 NFTs, IDs 0–9999. Each Normie is a 40×40 monochrome bitmap stored on-chain.

### Core endpoints
- `GET /normie/{id}/pixels` — 40×40 bitmap as a 1600-char string of 0s and 1s. Row-major, top-left to bottom-right. `1` = pixel on (dark gray `#48494b`), `0` = pixel off (light gray `#e3e5e4`). (Composited if customized.)
- `GET /normie/{id}/traits` — decoded traits as JSON with human-readable labels.
- `GET /normie/{id}/traits/binary` — raw bytes8 trait data as hex string.
- `GET /normie/{id}/image.svg` — SVG image (composited if customized).
- `GET /normie/{id}/image.png` — 1000×1000 PNG (composited if customized).
- `GET /normie/{id}/metadata` — full NFT metadata JSON (V4 renderer, canvas-aware). Includes Level, Action Points, Customized.
- `GET /normie/{id}/original/pixels` — pre-Canvas pixels.
- `GET /normie/{id}/original/image.svg` — pre-Canvas SVG.
- `GET /normie/{id}/original/image.png` — pre-Canvas PNG.

### Ownership endpoints
- `GET /normie/{id}/owner` — current owner (404 if burned/unminted).
- `GET /holders/{address}` — all Normie token IDs owned by a wallet address.

### Canvas endpoints
- `GET /normie/{id}/canvas/pixels` — transform layer (XOR overlay) as binary string.
- `GET /normie/{id}/canvas/diff` — pixel-level diff between original and Canvas edits.
- `GET /normie/{id}/canvas/info` — action points, level, customization status, delegate info.
- `GET /canvas/status` — global Canvas contract status (paused, burn tiers).

### History endpoints
- `GET /history/burns` — burn commitments, paginated (`?limit=50&offset=0`), newest first.
- `GET /history/burns/{commitId}` — single burn commitment with burned token details.
- `GET /history/burned-tokens` — all individually burned tokens, paginated.
- `GET /history/burned/{tokenId}/image.svg` — SVG of a burned Normie (persists on-chain).
- `GET /history/normie/{id}/versions` — all transform versions (pixel change history).
- `GET /history/normie/{id}/version/{version}/image.svg` — historical version SVG.
- `GET /history/stats` — global Canvas activity statistics.

### Trait categories
- Type: Human, Cat, Alien, Agent
- Gender: Male, Female, Non-Binary
- Age: Young, Middle-Aged, Old
- Hair Style: 21 options
- Facial Feature: 17 options
- Eyes: 14 options
- Expression: 7 options
- Accessory: 15 options

### Pixel format
40×40 grid (1600 pixels). 1 bit per pixel, MSB first, row-major. Stored as 200 bytes on-chain.

### Errors
- 400: invalid token ID (must be 0–9999)
- 404: token not found
- 429: rate limit exceeded
- 500: internal server error

---

## How API data maps to game systems

This is the heart of the game. Every system pulls from the API:

- **Avatar** — `/traits` defines class/species (Type), tone (Gender/Age), and ability flavor (Facial Feature, Accessory). `/pixels` is parsed into a 3D voxel mesh. `/canvas/info` Level + Action Points set starting stats and power tier.
- **World generation** — Type chooses the base world (Human→Cyberpunk, Cat→Frozen, Alien→Void). Expression sets the color palette. Accessory themes the architecture. Pixel density (count of 1s) sets world density/landmark placement. Canvas Level unlocks secret areas.
- **Quests** — trait combos unlock quest types (e.g. Agent+Old+scar = "one last mission"). Action Points = quest energy. `/canvas/diff` triggers "your Normie was modified" quests. `/holders` enables party quests across owned Normies.
- **Lore** — `/history/.../versions` turns each pixel-change version into a story chapter. Burned Normies (`/history/burned/...`) become fallen characters. Mass burn events become timeline lore.
- **Progression** — `/canvas/info` Level IS the rank. Action Points = stamina. Version count = experience depth.
- **Boss (Null Normie)** — HP scales with player Canvas Level. Summons fragments built from the player's own pixel data.

---

## File structure (target)

```
src/
  app/                  page.tsx (landing), select/, game/
  components/
    landing/  selection/  game/  player/  nexus/  portals/
    worlds/  quests/  boss/  ui/  shared/
  systems/
    normie/   (NormieDataPipeline, TraitInterpreter, PixelAnalyzer, AvatarBuilder, LoreGenerator)
    world/    (WorldFactory, ColorPaletteEngine, EnvironmentSeeder, BiomeCalculator)
    quest/    (QuestFactory, QuestConditions, RewardCalculator)
    combat/   (CombatSystem, EnemyFactory, BossStatCalculator)
    progression/ (ProgressionEngine, AchievementSystem)
  api/        (normiesApi, apiCache, apiBatcher, types)
  store/      (Zustand: useGameStore, usePlayerStore, useWorldStore, useQuestStore, useNormieStore, useAudioStore)
  hooks/      lib/      types/
```

---

## Build order (phases — complete each before the next)

1. Foundation: deps installed, dev server runs, Zustand stores scaffolded, API + cache layer built and tested, all TS types defined.
2. API integration: normiesApi.ts (all endpoints), NormieDataPipeline, TraitInterpreter. Test with 5 real Normie IDs.
3. Landing page + wallet connect (Phantom).
4. Normie selection (owned grid + manual ID input) with live API preview.
5. Player avatar: PixelAnalyzer → NormiePixelMesh (3D from pixels) → animation states.
6. Nexus world: architecture, lighting, WASD + mouse look, physics, NPC guide.
7. Portal system: 3 portals, proximity detection, cinematic transition.
8. Universe generation: WorldFactory → one full world (Cyberpunk), then Frozen, then Void.
9. Quest system: main quest (Reality Core), quest tracker HUD.
10. Boss fight: arena, Null Normie, phase behavior, win condition.
11. Polish: audio, post-processing, loading screens, achievements.

---

## Working notes for Claude Code

- Reference design: there's a standalone `normiesverse-landing.html` (raw Three.js r128) that shows the target visual identity for the landing page and Nexus — deep space, colossal station, docking platforms, energy core, ship fleets, distant portals, atmospheric particles. **Translate its look into React Three Fiber declarative components — do not copy the imperative Three.js code.**
- Fonts: Lilita One for display/headings, Inter for body, Share Tech Mono for HUD/data readouts.
- Palette: Deep Space Black `#03040a`, Midnight Blue, Electric Blue/Cyan `#4fc3f7`, Soft Gold `#c9a84c`, Emerald accents `#00ff9d`.
- Always respect the 60 req/min API limit via the cache layer.
- Work in bounded tasks, one phase at a time. Verify the dev server still runs after each significant change.
