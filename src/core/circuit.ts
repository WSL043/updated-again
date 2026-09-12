/** A deterministic Lights Out variant. 1 = powered; goal = every node powered. */
export type CircuitSize = 3 | 4 | 5;
export const CIRCUIT_SIZES: readonly CircuitSize[] = [3, 4, 5];
export const fullBoard = (size: CircuitSize): number => (1 << (size * size)) - 1;
export function neighbors(size: CircuitSize, cell: number): number[] {
  if (!Number.isInteger(cell) || cell < 0 || cell >= size * size) throw new Error("无效接点");
  const row = Math.floor(cell / size), col = cell % size;
  return [cell, ...(row ? [cell - size] : []), ...(row < size - 1 ? [cell + size] : []),
    ...(col ? [cell - 1] : []), ...(col < size - 1 ? [cell + 1] : [])];
}
export function pressCell(board: number, size: CircuitSize, cell: number): number {
  return neighbors(size, cell).reduce((value, index) => value ^ (1 << index), board);
}
/** Enumerate the first row, then chase each dark node downward. This considers
 * every solution (at most 32 candidates), so the shortest result is optimal. */
export function solveCircuit(board: number, size: CircuitSize): number[] | null {
  let best: number[] | null = null;
  for (let first = 0; first < 1 << size; first++) {
    let state = board;
    const path: number[] = [];
    const tap = (cell: number) => { state = pressCell(state, size, cell); path.push(cell); };
    for (let col = 0; col < size; col++) if (first & (1 << col)) tap(col);
    for (let cell = size; cell < size * size; cell++) if (!(state & (1 << (cell - size)))) tap(cell);
    if (state === fullBoard(size) && (best === null || path.length < best.length)) best = path;
  }
  return best;
}
export function createCircuit(seed: string, size: CircuitSize): number {
  let state = 2166136261;
  for (const char of `circuit-v1:${seed}:${size}`) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; };
  if (!state) state = 1;
  let board = fullBoard(size);
  for (let attempt = 0; attempt < 64; attempt++) {
    board = fullBoard(size);
    for (let cell = 0; cell < size * size; cell++) if (random() & 1) board = pressCell(board, size, cell);
    if ((solveCircuit(board, size)?.length ?? 0) >= size) return board;
  }
  // A non-empty, reachable fallback even for an unusual PRNG sequence.
  return pressCell(fullBoard(size), size, Math.floor(size * size / 2));
}

export interface CircuitSession { seed: string; size: CircuitSize; presses: number[]; assisted: boolean }
export const MAX_CIRCUIT_MOVES = 2048;
export const newSession = (seed: string, size: CircuitSize): CircuitSession => ({ seed, size, presses: [], assisted: false });
export function restoreSession(text: string | null, seed: string, size: CircuitSize): CircuitSession {
  if (!text) return newSession(seed, size);
  const item = JSON.parse(text) as CircuitSession;
  if (!item || item.seed !== seed || item.size !== size) return newSession(seed, size);
  if (!Array.isArray(item.presses) || item.presses.length > MAX_CIRCUIT_MOVES ||
    item.presses.some((cell) => !Number.isInteger(cell) || cell < 0 || cell >= size * size) || typeof item.assisted !== "boolean") {
    throw new Error("接线存档无法读取");
  }
  return { seed, size, presses: item.presses, assisted: item.assisted };
}
export const sessionBoard = (session: CircuitSession): number => session.presses.reduce(
  (board, cell) => pressCell(board, session.size, cell), createCircuit(session.seed, session.size));
