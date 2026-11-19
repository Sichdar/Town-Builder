# Hearthfield

A 3D phone game in your browser: gather wood and stone, carry it on your back, deliver it to build sites, and grow a medieval village into a town. Later, defend it from raiders and monsters.

## Play on your phone
1. Open the game's link (GitHub Pages) in Safari (iPhone) or Chrome (Android).
2. Add it to your home screen:
   - **iPhone:** Share button → "Add to Home Screen".
   - **Android:** ⋮ menu → "Add to Home screen" / "Install app".
3. Open it from the home-screen icon: it runs full screen and works offline after the first visit.

**Controls:** put your thumb anywhere and drag to walk. On a PC: WASD or the arrow keys.

## Test on a PC
Run `tools/serve.ps1` in PowerShell, then open http://localhost:8080.

## Project layout
| Path | What it is |
|---|---|
| `index.html` | The page the phone opens |
| `src/` | Game code; `src/config.js` holds all the tuning numbers |
| `assets/` | Icons now; your models (`.glb`) and sounds later |
| `sw.js`, `manifest.json` | Offline support and the home-screen icon |
| `tools/` | Local test server and the icon drawer |
| `GAME-PLAN.md` | The design and the milestones |

Built with [Three.js](https://threejs.org/).
