import { describe, expect, it } from "vitest";
import { CIRCUIT_SIZES, createCircuit, fullBoard, pressCell, restoreSession, sessionBoard, solveCircuit } from "../src/core/circuit";

// Independent coordinate implementation used by a breadth-first distance oracle.
function flip(board: number, size: number, cell: number) {
  let result = board;
  for (let index = 0; index < size * size; index++) {
    if (Math.abs(Math.floor(index / size) - Math.floor(cell / size)) + Math.abs(index % size - cell % size) <= 1) result ^= 1 << index;
  }
  return result;
}
describe("circuit reachability and optimal hints", () => {
  it("matches an independent exhaustive shortest-path oracle for every 3×3 board", () => {
    const queue = [511], distances = new Map([[511, 0]]);
    for (let cursor = 0; cursor < queue.length; cursor++) for (let cell = 0; cell < 9; cell++) {
      const next = flip(queue[cursor], 3, cell);
      if (!distances.has(next)) { distances.set(next, distances.get(queue[cursor])! + 1); queue.push(next); }
    }
    for (let board = 0; board < 512; board++) {
      const path = solveCircuit(board, 3);
      expect(path?.length).toBe(distances.get(board));
      if (path) expect(path.reduce((state, cell) => flip(state, 3, cell), board)).toBe(511);
    }
  });
  it("generates deterministic nontrivial solvable daily puzzles in every size", () => {
    for (const size of CIRCUIT_SIZES) for (let day = 0; day < 180; day++) {
      const seed = new Date(Date.UTC(2026, 0, day + 1)).toISOString().slice(0, 10);
      const board = createCircuit(seed, size), path = solveCircuit(board, size)!;
      expect(createCircuit(seed, size)).toBe(board);
      expect(path.length).toBeGreaterThanOrEqual(size);
      expect(path.reduce((state, cell) => flip(state, size, cell), board)).toBe(fullBoard(size));
    }
  });
  it("never wraps a corner press across a row, and pressing twice is reversible", () => {
    expect(pressCell(0, 4, 3)).toBe((1 << 2) | (1 << 3) | (1 << 7));
    expect(pressCell(pressCell(123, 4, 3), 4, 3)).toBe(123);
  });
  it("restores only valid same-puzzle progress", () => {
    const session = { seed: "2026-09-12", size: 4 as const, presses: [0, 7, 15], assisted: true };
    expect(sessionBoard(restoreSession(JSON.stringify(session), session.seed, 4))).toBe(session.presses.reduce((state, cell) => flip(state, 4, cell), createCircuit(session.seed, 4)));
    expect(restoreSession(JSON.stringify(session), "2026-09-13", 4).presses).toEqual([]);
    expect(() => restoreSession(JSON.stringify({ ...session, presses: [16] }), session.seed, 4)).toThrow();
    expect(() => restoreSession("broken", session.seed, 4)).toThrow();
  });
});
