# Game plan: Hearthfield

Last updated: 18/11/2026 (S01-PLAN)

## 1. The game in one paragraph

A 3D phone game, seen from above at a tilt. You walk your villager with a floating joystick. Walk up to a tree or a rock and you gather from it on your own; the goods stack up on your back. Carry them to a **build site** (a marked patch with a counter like "Wood 12/20"), walk in and the goods fly off your back into it. When the counter fills, something new appears: a building, a helper, or a fence opens onto a new part of the map. Bit by bit a bare clearing grows into a walled medieval town. Later, raiders and monsters attack and you defend it.

## 2. Decisions so far (18/11/2026)

| Topic | Choice |
|---|---|
| Kind of game | 3D "carry-stack" game, camera tilted from above |
| Setting | Medieval village growing into a town |
| Controls | Floating joystick: thumb anywhere, drag to walk. Gathering and dropping off are automatic |
| How to play | Web game in the phone browser, hosted free on GitHub Pages; "Add to Home Screen" makes it open like an app and work offline |
| Phones | iPhone and Android |
| Language | English |
| Art | Simple placeholder shapes now; Fabio's own models replace them later |
| Repo | Fabio's GitHub account, public repo |
| First version | Gather, carry, deliver, unlock. Mobs come later |

## 3. How the game works

### The main loop
1. **Gather:** stand next to a tree, rock or ore; your villager works it automatically. Each swing drops an item onto your stack.
2. **Carry:** the stack shows on your back and has a limit (starts at 10). Full stack means go deliver.
3. **Deliver:** walk onto a build site or a building's input pad; items fly off one by one into its counter.
4. **Unlock:** a full counter builds something or opens a new area. New build sites appear.
5. Resources grow back after a while, so you never run out.

### What you gather (medieval)
| Resource | From | Used for |
|---|---|---|
| Wood | Trees | Early buildings, fences |
| Stone | Rocks | Walls, better buildings |
| Iron ore | Ore rocks (later area) | Tools, weapons, defences |
| Planks | Sawmill (from wood) | Houses, upgrades |
| Stone blocks | Mason (from stone) | Town walls, towers |
| Coins | Market (sell goods) | Upgrades, hiring helpers |

### What unlocking brings (all four you chose)
- **New areas and resources:** fences come down onto new land with new trees, rocks and ore.
- **Helpers:** hire villagers who gather and carry on their own to a stockpile, so the town keeps working while you do something else.
- **Upgrades:** better axe and pick (faster gathering), bigger stack, faster walking.
- **Buildings that convert:** the sawmill turns wood into planks, the mason turns stone into blocks, the market turns goods into coins. Each has an input pad and an output pile you collect from.

### Later: town and mobs
- Houses bring villagers, villagers raise the town's level, the level unlocks more.
- Raids at night or every few minutes: goblins, wolves, raiders walk toward the town. You fight them (auto-swing when close, like gathering), and build walls, gates and archer towers with what you gathered.

## 4. How it's built (Claude's choices, plain version)

- **3D engine:** Three.js, a free, widely used library that draws 3D in the browser. It loads from a well-known public library site (jsDelivr) at a fixed version, and the phone keeps a copy after the first visit, so the game works offline.
- **No build tools needed on your PC:** the game is plain files (web page, scripts). You don't have to install anything to play or test it. On the PC, `tools/serve.ps1` serves it at http://localhost:8080.
- **Saving:** progress saves on the phone automatically every few seconds and when you leave.
- **Your art later:** every object (villager, tree, house) is drawn by one small piece of code that first looks for a model file in `assets/`. Drop in your model (the standard `.glb` format, which Blender and most 3D tools export) with the right name, and it replaces the placeholder. Nothing else changes.
- **Testing:** on your PC in a browser; on your phones either from your PC over home Wi-Fi or from the GitHub Pages link after each update.
- **Settings in one file:** speeds, costs, stack sizes and timings sit in one readable file, so balancing the game means changing numbers, not code.

### Repo layout (planned)
```
index.html          the page the phone opens
manifest.json       makes "Add to Home Screen" work (name, icon, full screen)
sw.js               offline support
src/                game code (player, joystick, gathering, buildings, saving...)
src/config.js       all the numbers for balancing
assets/             icons now; your models and sounds later
tools/              local test server (serve.ps1) and icon drawer
GAME-PLAN.md        this file
```

## 5. Milestones (each one playable on your phone)

| # | Milestone | You can... |
|---|---|---|
| M0 | Setup | Open a link on both phones and see a 3D scene. Repo on GitHub, GitHub Pages live, home-screen icon works |
| M1 | Walk | Walk a placeholder villager around with the floating joystick; the camera follows |
| M2 | Gather and carry | Gather wood and stone; the stack grows on your back; trees and rocks grow back |
| M3 | Deliver and unlock | Fill build sites; a fence opens onto a second area; progress is saved |
| M4 | Buildings that convert | Sawmill (planks), mason (blocks), market (coins) |
| M5 | Upgrades | Spend coins on axe, pick, stack size, speed |
| M6 | Helpers | Hire villagers who gather and deliver on their own |
| M7 | Town | Houses, villagers, town level, iron ore area |
| M8 | Mobs | Raids, fighting, walls and towers |
| Any time | Your art | Swap placeholders for your models |

**First playable goal:** M0 to M3. That is the full "ad loop": gather, carry, deliver, grow.

## 6. Still to decide (no rush)

- Game name (needed for the home-screen icon; a working name is fine for now).
- Your GitHub username (needed at M0).
- How big the first map is and how many areas it has (Claude proposes numbers at M3, you tune them).
