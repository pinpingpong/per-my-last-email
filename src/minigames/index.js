// Minigame registry. A choice with { "minigame": { "id": "<key>", "win": {...}, "lose": {...} } }
// runs the matching game, then applies win or lose effects/result on top of the choice.
// To add one: write src/minigames/<name>.js exporting play(root) -> Promise<{ won }>,
// register it here, and add the file to MODULES in tools/build_single.py.
import { toiletDodge } from './toilet-dodge.js';

export const MINIGAMES = {
  'toilet-dodge': toiletDodge,
};
