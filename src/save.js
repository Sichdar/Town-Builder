// Saves progress on the phone (browser storage) every few seconds and when you leave the game.
import { SAVE } from './config.js';

let disabled = false;

export function loadSave() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE.key));
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

// collect() returns everything to save. Starts the timer and the "on leave" saves.
export function startSaving(collect) {
  const write = () => {
    if (disabled) return;
    try { localStorage.setItem(SAVE.key, JSON.stringify(collect())); } catch { /* storage full or blocked: keep playing */ }
  };
  setInterval(write, SAVE.every * 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) write(); });
  window.addEventListener('pagehide', write);
  return write;
}

// Wipes the save and restarts (from the browser console: game.reset()).
export function resetSave() {
  disabled = true;
  try { localStorage.removeItem(SAVE.key); } catch { /* nothing to remove */ }
  location.reload();
}
